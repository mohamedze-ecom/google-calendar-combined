import React, { useState, useEffect, useRef } from 'react'

function toLocalDatetime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventModal({ event, onSave, onClose }) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [location, setLocation] = useState(event.location || '');
  const [start, setStart] = useState(toLocalDatetime(event.start));
  const [end, setEnd] = useState(toLocalDatetime(event.end));
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...event,
      title,
      description,
      location,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="edit-modal">
        <div className="edit-modal-header">
          <h2>Edit Event</h2>
          <button className="icon-btn" onClick={onClose}>
            <span className="material-icons-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="edit-field">
            <span className="material-icons-outlined edit-field-icon">title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="edit-input edit-input-title"
              autoFocus
            />
          </div>

          <div className="edit-field">
            <span className="material-icons-outlined edit-field-icon">schedule</span>
            <div className="edit-time-row">
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="edit-input" />
              <span className="edit-time-sep">to</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="edit-input" />
            </div>
          </div>

          <div className="edit-field">
            <span className="material-icons-outlined edit-field-icon">location_on</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="edit-input"
            />
          </div>

          <div className="edit-field">
            <span className="material-icons-outlined edit-field-icon">notes</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              className="edit-input edit-textarea"
              rows={3}
            />
          </div>

          <div className="edit-modal-footer">
            <button type="button" className="edit-btn edit-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="edit-btn edit-btn-save" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
