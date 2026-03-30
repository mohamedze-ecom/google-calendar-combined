import React, { useRef, useEffect, useState, useCallback } from 'react'
import { layoutEvents } from '../utils/layoutEvents'

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function getEventStyle(event, dayStart) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMinutes = (start - dayStart) / 60000;
  const duration = Math.max((end - start) / 60000, 30);
  const top = (startMinutes / 60) * 48;
  const height = (duration / 60) * 48;

  // Side-by-side layout for overlapping events
  const totalCols = event.totalColumns || 1;
  const col = event.column || 0;
  const colWidth = 100 / totalCols;
  const left = col * colWidth;
  const width = colWidth;

  return {
    top: `${top}px`,
    height: `${Math.max(height, 20)}px`,
    left: `calc(${left}% + 1px)`,
    width: `calc(${width}% - 3px)`,
    right: 'auto',
  };
}

export default function WeekView({ currentDate, events, onEventClick, onEventDrop }) {
  const gridRef = useRef(null);
  const today = new Date();
  const [dragEvent, setDragEvent] = useState(null);
  const [dragGhostPos, setDragGhostPos] = useState(null);
  const [now, setNow] = useState(new Date());
  const dragStartY = useRef(0);
  const dragStartTime = useRef(null);

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 8 * 48;
  }, []);

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const allDayEvents = events.filter(e => e.allDay);
  const timedEvents = events.filter(e => !e.allDay);

  const getEventsForDay = (date, eventsList) => {
    const dayStr = date.toISOString().split('T')[0];
    return eventsList.filter(e => e.start.split('T')[0] === dayStr);
  };

  const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * 48;

  const handleDragStart = useCallback((e, event) => {
    e.preventDefault();
    setDragEvent(event);
    dragStartY.current = e.clientY;
    dragStartTime.current = new Date(event.start);

    const handleDragMove = (moveE) => {
      const deltaY = moveE.clientY - dragStartY.current;
      const deltaMinutes = Math.round(deltaY / 48 * 60 / 15) * 15;
      const newStart = new Date(dragStartTime.current.getTime() + deltaMinutes * 60000);
      setDragGhostPos({ deltaY, newStart });
    };

    const handleDragEnd = (upE) => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      const deltaY = upE.clientY - dragStartY.current;
      if (Math.abs(deltaY) > 10) {
        const deltaMinutes = Math.round(deltaY / 48 * 60 / 15) * 15;
        const newStart = new Date(dragStartTime.current.getTime() + deltaMinutes * 60000);
        if (newStart.getTime() !== dragStartTime.current.getTime()) {
          onEventDrop(event, newStart);
        }
      }
      setDragEvent(null);
      setDragGhostPos(null);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [onEventDrop]);

  return (
    <div className="week-view">
      <div className="week-allday-section">
        <div className="week-allday-label"></div>
        <div className="week-allday-row">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day, allDayEvents);
            return (
              <div key={i} className="week-allday-cell">
                {dayEvents.map(event => (
                  <div key={event.id} className="allday-event" style={{ backgroundColor: event.color }}
                    onClick={(e) => onEventClick(event, e)}>
                    {event.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="week-header">
        <div className="week-gutter"></div>
        {days.map((day, i) => (
          <div key={i} className={`week-day-header ${isToday(day) ? 'today' : ''}`}>
            <span className="week-day-name">{DAY_NAMES[i]}</span>
            <span className={`week-day-number ${isToday(day) ? 'today-circle' : ''}`}>{day.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="week-grid-scroll" ref={gridRef}>
        <div className="week-grid">
          <div className="week-time-col">
            {HOURS.map(h => (
              <div key={h} className="week-time-label">{h > 0 && <span>{formatHour(h)}</span>}</div>
            ))}
          </div>
          {days.map((day, i) => {
            const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
            const dayEvents = layoutEvents(getEventsForDay(day, timedEvents));

            return (
              <div key={i} className={`week-day-col ${isToday(day) ? 'today-col' : ''}`}>
                {HOURS.map(h => (<div key={h} className="week-hour-cell" />))}
                {dayEvents.map(event => {
                  const isDragging = dragEvent?.id === event.id && dragEvent?.accountIndex === event.accountIndex;
                  const baseStyle = getEventStyle(event, dayStart);
                  const style = isDragging && dragGhostPos
                    ? { ...baseStyle, transform: `translateY(${dragGhostPos.deltaY}px)`, opacity: 0.7, zIndex: 10 }
                    : baseStyle;

                  return (
                    <div key={`${event.id}-${event.accountIndex}`}
                      className={`week-event ${isDragging ? 'dragging' : ''}`}
                      style={{ ...style, backgroundColor: event.color, cursor: 'grab' }}
                      onClick={(e) => { if (!dragGhostPos) onEventClick(event, e); }}
                      onMouseDown={(e) => handleDragStart(e, event)}
                    >
                      <div className="week-event-title">{event.title}</div>
                      <div className="week-event-time">
                        {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {' – '}
                        {new Date(event.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      {event.meetLink && (
                        <div className="week-event-meet">
                          <span className="material-icons-outlined" style={{ fontSize: 12 }}>videocam</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isToday(day) && (
                  <div className="current-time-line" style={{ top: `${nowTop}px` }}>
                    <div className="current-time-dot" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
