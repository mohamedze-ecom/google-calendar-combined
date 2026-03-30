import React, { useEffect, useRef, useState } from 'react'

const RESPONSE_LABELS = {
  accepted: 'Yes',
  declined: 'No',
  tentative: 'Maybe',
  needsAction: 'Pending',
};
const RESPONSE_COLORS = {
  accepted: '#81c995',
  declined: '#f28b82',
  tentative: '#fdd663',
  needsAction: '#9aa0a6',
};

export default function EventPopover({ event, position, onClose, onEdit, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const style = { ...position };
  if (style.left + 400 > window.innerWidth) {
    style.left = Math.max(8, position.left - 420);
  }
  if (style.top + 500 > window.innerHeight) {
    style.top = Math.max(8, window.innerHeight - 520);
  }

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const dateStr = startDate.toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const timeStr = event.allDay
    ? 'All day'
    : `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

  const duration = event.allDay ? null : (() => {
    const mins = Math.round((endDate - startDate) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  })();

  return (
    <div className="event-popover" ref={ref} style={style}>
      {/* Header with action buttons */}
      <div className="popover-header">
        <div className="popover-actions">
          <button className="icon-btn" onClick={() => onEdit(event)} title="Edit event">
            <span className="material-icons-outlined" style={{ fontSize: 20 }}>edit</span>
          </button>
          <button className="icon-btn" onClick={() => onDelete(event)} title="Delete event">
            <span className="material-icons-outlined" style={{ fontSize: 20 }}>delete</span>
          </button>
          {event.htmlLink && (
            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Open in Google Calendar">
              <span className="material-icons-outlined" style={{ fontSize: 20 }}>open_in_new</span>
            </a>
          )}
          <button className="icon-btn" onClick={onClose}>
            <span className="material-icons-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
      </div>

      <div className="popover-body">
        <div className="popover-color-bar" style={{ backgroundColor: event.color }} />
        <div className="popover-content">
          {/* Title */}
          <h3 className="popover-title">{event.title}</h3>

          {/* Date & Time */}
          <p className="popover-date">{dateStr}</p>
          <p className="popover-time">
            {timeStr}
            {duration && <span className="popover-duration"> ({duration})</span>}
          </p>

          {/* Join Meeting Button */}
          {event.meetLink && (
            <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="join-meeting-btn">
              <span className="material-icons-outlined" style={{ fontSize: 18 }}>videocam</span>
              Join {event.conferenceData?.type || 'meeting'}
            </a>
          )}

          {/* Location */}
          {event.location && (
            <div className="popover-detail">
              <span className="material-icons-outlined popover-icon">location_on</span>
              <span>{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="popover-detail">
              <span className="material-icons-outlined popover-icon">notes</span>
              <div className="popover-description" dangerouslySetInnerHTML={{ __html: event.description }} />
            </div>
          )}

          {/* Organizer */}
          {event.organizer && (
            <div className="popover-detail">
              <span className="material-icons-outlined popover-icon">person</span>
              <span>Organized by <strong>{event.organizer.displayName}</strong></span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="popover-attendees">
              <div className="popover-detail" style={{ marginBottom: 4 }}>
                <span className="material-icons-outlined popover-icon">group</span>
                <span>{event.attendees.length} guest{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="attendees-list">
                {event.attendees.map((a, i) => (
                  <div key={i} className="attendee-row">
                    <div className="attendee-avatar" style={{ backgroundColor: RESPONSE_COLORS[a.responseStatus] || '#9aa0a6' }}>
                      {(a.displayName || a.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="attendee-info">
                      <span className="attendee-name">
                        {a.displayName || a.email}
                        {a.organizer && <span className="attendee-tag">Organizer</span>}
                        {a.self && <span className="attendee-tag">You</span>}
                      </span>
                      <span className="attendee-status" style={{ color: RESPONSE_COLORS[a.responseStatus] }}>
                        {RESPONSE_LABELS[a.responseStatus] || a.responseStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar & Account */}
          <div className="popover-meta">
            <div className="popover-detail">
              <span className="material-icons-outlined popover-icon">event</span>
              <span>{event.calendarName}</span>
            </div>
            <div className="popover-detail">
              <span className="material-icons-outlined popover-icon">mail</span>
              <span>{event.accountEmail}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
