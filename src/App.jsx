import { useEffect, useMemo, useState } from 'react';
import NoteCard from './components/NoteCard.jsx';
import NoteEditor from './components/NoteEditor.jsx';
import AuthDialog from './components/AuthDialog.jsx';

const CATEGORIES = ['Personal', 'Work', 'Ideas', 'To-do'];
const starterNotes = [
  {
    id: 'welcome-note',
    title: 'A little note to self',
    body: 'You don’t have to have it all figured out. Just take the next tiny step, and let the rest unfold. You’ve got this! ✨',
    category: 'Personal',
    color: 'peach',
    updatedAt: new Date().toISOString(),
    favorite: true,
  },
  {
    id: 'weekend-ideas',
    title: 'Slow weekend plans',
    body: '☕ Find a new little café\n🌷 Pick up flowers for the table\n📖 Read a few chapters in the sun',
    category: 'To-do',
    color: 'butter',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    favorite: false,
  },
  {
    id: 'project-spark',
    title: 'That project idea!',
    body: 'A tiny online shop for illustrated postcards. Keep it playful, start with five designs, and see where it goes.',
    category: 'Ideas',
    color: 'lavender',
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    favorite: false,
  },
  {
    id: 'meeting-thoughts',
    title: 'Monday meeting notes',
    body: 'Share the first draft with the team, ask for early feedback, and leave room for the fun ideas to grow.',
    category: 'Work',
    color: 'mint',
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    favorite: false,
  },
  {
    id: 'little-reminder',
    title: 'A gentle reminder',
    body: 'Water the plants, drink some water, and remember that a break is productive too.',
    category: 'Personal',
    color: 'peach',
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
    favorite: false,
  },
];

const categoryIcons = {
  All: '✿',
  Personal: '♡',
  Work: '✎',
  Ideas: '✧',
  'To-do': '☼',
};

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <path d="m18 6-12 12M6 6l12 12" />,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function formatToday() {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the API. Start the backend and connect MongoDB, then try again.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The API returned an unreadable response. Check that the backend is running.');
  }

  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function App() {
  const [notes, setNotes] = useState(starterNotes);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadAccount = async () => {
      try {
        const { user: currentUser } = await apiRequest('/auth/me');
        const { notes: savedNotes } = await apiRequest('/notes');
        if (isMounted) {
          setUser(currentUser);
          setNotes(savedNotes);
          setApiError('');
        }
      } catch (error) {
        if (!isMounted) return;
        if (error.status === 401) {
          setUser(null);
          setNotes(starterNotes);
          setApiError('');
        } else {
          setUser(null);
          setNotes(starterNotes);
          setApiError(error.message);
        }
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };
    loadAccount();
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryCounts = useMemo(() => ({
    All: notes.length,
    ...Object.fromEntries(CATEGORIES.map((category) => [
      category,
      notes.filter((note) => note.category === category).length,
    ])),
  }), [notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes
      .filter((note) => activeCategory === 'All' || note.category === activeCategory)
      .filter((note) => !query || `${note.title} ${note.body} ${note.category}`.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, activeCategory, search]);

  const requireAccount = () => {
    if (user) return true;
    setAuthMode('signup');
    return false;
  };

  const openNewNote = () => {
    if (!requireAccount()) return;
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const openEditNote = (note) => {
    if (!requireAccount()) return;
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const saveNote = async (noteDraft) => {
    if (!user) throw new Error('Sign in to save notes to your account.');
    try {
      if (editingNote) {
        const { note: updatedNote } = await apiRequest(`/notes/${encodeURIComponent(editingNote.id)}`, {
          method: 'PUT',
          body: JSON.stringify(noteDraft),
        });
        setNotes((currentNotes) => currentNotes.map((note) => (
          note.id === updatedNote.id ? updatedNote : note
        )));
      } else {
        const { note: savedNote } = await apiRequest('/notes', {
          method: 'POST',
          body: JSON.stringify(noteDraft),
        });
        setNotes((currentNotes) => [savedNote, ...currentNotes]);
      }
      setApiError('');
      setIsEditorOpen(false);
      setEditingNote(null);
    } catch (error) {
      setApiError(error.message);
      throw error;
    }
  };

  const deleteNote = async (noteId) => {
    if (!requireAccount()) return;
    try {
      await apiRequest(`/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
      setIsEditorOpen(false);
      setEditingNote(null);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  const toggleFavorite = async (noteId) => {
    if (!requireAccount()) return;
    const currentNote = notes.find((note) => note.id === noteId);
    if (!currentNote) return;
    try {
      const { note: updatedNote } = await apiRequest(`/notes/${encodeURIComponent(noteId)}`, {
        method: 'PUT',
        body: JSON.stringify({ favorite: !currentNote.favorite }),
      });
      setNotes((currentNotes) => currentNotes.map((note) => (
        note.id === updatedNote.id ? updatedNote : note
      )));
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  const completeSignIn = async ({ name, email, password }) => {
    const route = authMode === 'signup' ? '/auth/signup' : '/auth/login';
    const payload = authMode === 'signup' ? { name, email, password } : { email, password };
    const { user: authenticatedUser } = await apiRequest(route, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const { notes: savedNotes } = await apiRequest('/notes');
    setUser(authenticatedUser);
    setNotes(savedNotes);
    setApiError('');
    setAuthMode(null);
  };

  const signOut = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      setUser(null);
      setNotes(starterNotes);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  const categoryOptions = ['All', ...CATEGORIES];
  const sectionTitle = activeCategory === 'All' ? 'All your little notes' : `${activeCategory} notes`;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? '' : 'sidebar--collapsed'}`}>
        <div className="sidebar__top">
          <a className="brand" href="#" aria-label="Little Notes home" onClick={(event) => {
            event.preventDefault();
            setActiveCategory('All');
            setSearch('');
          }}>
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="4" y="5" width="40" height="38" rx="14" fill="#FFF0E9" />
                <path d="M15 15.5h18M15 21.5h13M15 27.5h9" stroke="#DF634F" strokeWidth="2.4" strokeLinecap="round" />
                <path d="m31.5 29.5 1.7 3.2 3.6.6-2.6 2.5.6 3.6-3.3-1.7-3.2 1.7.6-3.6-2.7-2.5 3.7-.6 1.6-3.2Z" fill="#E8B458" />
              </svg>
            </span>
            <span className="brand__wordmark">little <span className="brand__accent">notes</span></span>
          </a>
          <button
            className="sidebar__toggle"
            type="button"
            aria-label={isSidebarOpen ? 'Collapse notebook menu' : 'Expand notebook menu'}
            aria-expanded={isSidebarOpen}
            aria-controls="notebook-navigation"
            title={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true">•••</span>
          </button>
        </div>
        <p className="sidebar__tagline">A cozy place for all your thoughts ✿</p>

        <nav className="sidebar__section" id="notebook-navigation" aria-label="Note categories">
          <span className="sidebar__label">YOUR NOTEBOOK</span>
          <div className="category-nav">
            {categoryOptions.map((category, index) => (
              <button
                className={`nav-item ${activeCategory === category ? 'is-active' : ''}`}
                key={category}
                type="button"
                aria-current={activeCategory === category ? 'page' : undefined}
                onClick={() => setActiveCategory(category)}
              >
                <span className={`nav-icon nav-icon--${index}`}>{categoryIcons[category]}</span>
                <span>{category === 'All' ? 'All notes' : category}</span>
                <span className="nav-count">{categoryCounts[category] ?? 0}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar__bottom">
          <div className="little-reminder">
            <span aria-hidden="true">🌷</span>
            <p>Little by little, a little becomes a lot.</p>
            <span className="little-reminder__sparkle" aria-hidden="true">✦</span>
          </div>
          <p className="sidebar__made">Made with <span aria-label="love">♥</span> for your lovely thoughts</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <p className="topbar__date">{formatToday()} <span aria-hidden="true">·</span> a fresh page awaits</p>
          <div className="topbar__actions">
            {isAuthLoading ? (
              <span className="account-loading">Checking your account...</span>
            ) : user ? (
              <div className="account-actions">
                <span className="account-chip"><span className="account-chip__avatar">{user.name.charAt(0).toUpperCase()}</span> Hi, {user.name}</span>
                <button className="auth-link" type="button" onClick={signOut}>Sign out</button>
              </div>
            ) : (
              <div className="auth-actions">
                <button className="button button--quiet auth-actions__signin" type="button" onClick={() => setAuthMode('signin')}>Sign in</button>
                <button className="button button--signup" type="button" onClick={() => setAuthMode('signup')}>Sign up <span aria-hidden="true">✦</span></button>
              </div>
            )}
          </div>
        </header>

        <section className="welcome" aria-labelledby="welcome-title">
          <div className="welcome__copy">
            <span className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</span>
            <h1 id="welcome-title">Good thoughts,<br /><span>lovely you.</span></h1>
            <p>Make space for your ideas, reminders, and all the little things worth remembering.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="welcome-art__sun" />
            <div className="welcome-art__paper">
              <span className="welcome-art__flower">✿</span>
              <i /><i /><i />
            </div>
            <span className="welcome-art__star welcome-art__star--one">✦</span>
            <span className="welcome-art__star welcome-art__star--two">✧</span>
            <span className="welcome-art__dot" />
          </div>
        </section>

        <div className="new-note-cta">
          <button className="button button--primary" type="button" disabled={isAuthLoading} onClick={openNewNote}>
            <Icon name="plus" /> New note
          </button>
        </div>

        <section className="notes-section" aria-labelledby="notes-heading">
          <div className="notes-toolbar">
            <div>
              <h2 id="notes-heading">{sectionTitle}</h2>
              <p>{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} saved in your happy place</p>
            </div>
            <label className="search-box">
              <Icon name="search" />
              <span className="sr-only">Search notes</span>
              <input
                type="search"
                value={search}
                placeholder="Find a little something..."
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button className="search-box__clear" type="button" aria-label="Clear search" onClick={() => setSearch('')}>
                  <Icon name="close" size={15} />
                </button>
              )}
            </label>
          </div>

          {apiError ? (
            <p className="app-message" role="alert">{apiError}</p>
          ) : !user && !isAuthLoading ? (
            <p className="app-message app-message--hint" role="status">Sign in or sign up to save your own private notes to your account.</p>
          ) : null}

          {filteredNotes.length > 0 ? (
            <div className="notes-grid">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => openEditNote(note)}
                  onDelete={() => deleteNote(note.id)}
                  onToggleFavorite={() => toggleFavorite(note.id)}
                />
              ))}
              <button className="add-note-card" type="button" onClick={openNewNote}>
                <span className="add-note-card__icon"><Icon name="plus" /></span>
                <strong>Make a little note</strong>
                <span>Your next thought belongs here</span>
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state__illustration" aria-hidden="true">{search ? '🔎' : '🌱'}</span>
              <h3>{search ? 'No little notes found' : 'A fresh page, just for you'}</h3>
              <p>{search ? 'Try another word or clear your search to see all your notes.' : 'Every lovely thought starts somewhere. Add your first note and let it bloom.'}</p>
              {search ? (
                <button className="button button--quiet" type="button" onClick={() => setSearch('')}>Clear search</button>
              ) : (
                <button className="button button--primary" type="button" onClick={openNewNote}><Icon name="plus" /> Write your first note</button>
              )}
            </div>
          )}
        </section>
      </main>

      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          onSave={saveNote}
          onDelete={editingNote ? () => deleteNote(editingNote.id) : undefined}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingNote(null);
          }}
        />
      )}
      {authMode && (
        <AuthDialog
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
          onSubmit={completeSignIn}
        />
      )}
    </div>
  );
}
