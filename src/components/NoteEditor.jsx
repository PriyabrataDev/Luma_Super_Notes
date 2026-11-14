import { useEffect, useState } from 'react';

const CATEGORIES = ['Personal', 'Work', 'Ideas', 'To-do'];
const COLORS = ['peach', 'lavender', 'mint', 'butter'];

function NoteEditor({ note, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [category, setCategory] = useState(note?.category ?? 'Personal');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      setError('Add a title and a few words before saving your note.');
      return;
    }

    const color = note?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)];
    setError('');
    setIsSaving(true);
    try {
      await onSave({ title: cleanTitle, body: cleanBody, category, color });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your note could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-heading" onSubmit={handleSubmit}>
        <div className="editor__heading">
          <div>
            <span className="eyebrow">{note ? 'A LITTLE UPDATE' : 'A BRAND NEW THOUGHT'}</span>
            <h2 id="editor-heading">{note ? 'Edit your note' : 'Make a little note'}</h2>
          </div>
          <button className="icon-button editor__close" type="button" aria-label="Close note editor" onClick={onClose}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg>
          </button>
        </div>

        <label className="field-label" htmlFor="note-title">A title for this thought</label>
        <input
          autoFocus
          className="editor__title"
          id="note-title"
          maxLength={90}
          placeholder="e.g. Things that make me smile"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label className="field-label" htmlFor="note-body">Let it all out</label>
        <textarea
          id="note-body"
          maxLength={5000}
          placeholder="Your ideas, plans, little reminders..."
          rows={6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        <fieldset className="category-picker">
          <legend className="field-label">Tuck it into a category</legend>
          <div className="category-picker__options">
            {CATEGORIES.map((item) => (
              <button
                className={`category-chip ${category === item ? 'is-selected' : ''}`}
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="editor__error" role="alert">{error}</p>}

        <div className="editor__actions">
          {onDelete && (
            <button className="button button--danger" type="button" disabled={isSaving} onClick={onDelete}>
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
              Delete
            </button>
          )}
          <button className="button button--quiet" type="button" disabled={isSaving} onClick={onClose}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : note ? 'Save changes' : 'Save note'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NoteEditor;