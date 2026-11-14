const formatNoteDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

function NoteCard({ note, onEdit, onDelete, onToggleFavorite }) {
  return (
    <article className={`note-card note-card--${note.color || 'peach'}`}>
      <div className="note-card__topline">
        <span className="category-label">{note.category}</span>
        <div className="note-card__actions">
          <button
            className={`icon-button favorite-button ${note.favorite ? 'is-favorite' : ''}`}
            type="button"
            aria-label={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={Boolean(note.favorite)}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            {note.favorite ? '♥' : '♡'}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`Delete ${note.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        </div>
      </div>
      <button className="note-card__open" type="button" onClick={onEdit} aria-label={`Edit note: ${note.title}`}>
        <h3>{note.title}</h3>
        <p className="note-card__body">{note.body}</p>
        <span className="note-card__footer">
          <time dateTime={note.updatedAt}>Updated {formatNoteDate(note.updatedAt)}</time>
          <span className="note-card__sparkle" aria-hidden="true">✦</span>
        </span>
      </button>
    </article>
  );
}

export default NoteCard;