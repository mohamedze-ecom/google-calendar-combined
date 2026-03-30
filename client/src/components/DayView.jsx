import React, { useRef, useEffect, useState, useCallback } from 'react'
import { layoutEvents } from '../utils/layoutEvents'

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function DayView({ currentDate, events, onEventClick, onEventDrop }) {
  const gridRef = useRef(null);
  const today = new Date();
  const dayStr = currentDate.toISOString().split('T')[0];
  const [dragEvent, setDragEvent] = useState(null);
  const [dragGhostPos, setDragGhostPos] = useState(null);
  const [now, setNow] = useState(new Date());
  const dragStartY = useRef(0);
  const dragStartTime = useRef(null);

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);

  const isToday =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getDate() === today.getDate();

  const dayEvents = events.filter(e => e.start.split('T')[0] === dayStr);
  const allDayEvents = dayEvents.filter(e => e.allDay);
  const timedEvents = layoutEvents(dayEvents.filter(e => !e.allDay));

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 8 * 48;
  }, []);

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="day-view">
      <div className="day-header-bar">
        <div className="week-gutter"></div>
        <div className={`week-day-header ${isToday ? 'today' : ''}`}>
          <span className="week-day-name">{DAY_NAMES[currentDate.getDay()].substring(0, 3).toUpperCase()}</span>
          <span className={`week-day-number ${isToday ? 'today-circle' : ''}`}>{currentDate.getDate()}</span>
        </div>
      </div>

      {allDayEvents.length > 0 && (
        <div className="week-allday-section">
          <div className="week-allday-label"></div>
          <div className="week-allday-row" style={{ gridTemplateColumns: '1fr' }}>
            <div className="week-allday-cell">
              {allDayEvents.map(event => (
                <div key={event.id} className="allday-event" style={{ backgroundColor: event.color }}
                  onClick={(e) => onEventClick(event, e)}>
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="week-grid-scroll" ref={gridRef}>
        <div className="week-grid" style={{ gridTemplateColumns: '60px 1fr' }}>
          <div className="week-time-col">
            {HOURS.map(h => (
              <div key={h} className="week-time-label">{h > 0 && <span>{formatHour(h)}</span>}</div>
            ))}
          </div>
          <div className={`week-day-col ${isToday ? 'today-col' : ''}`}>
            {HOURS.map(h => (<div key={h} className="week-hour-cell" />))}
            {timedEvents.map(event => {
              const start = new Date(event.start);
              const end = new Date(event.end);
              const startMin = (start - dayStart) / 60000;
              const duration = Math.max((end - start) / 60000, 30);
              const top = (startMin / 60) * 48;
              const height = Math.max((duration / 60) * 48, 20);

              const totalCols = event.totalColumns || 1;
              const col = event.column || 0;
              const colWidth = 100 / totalCols;

              const isDragging = dragEvent?.id === event.id;
              const baseStyle = {
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(${col * colWidth}% + 1px)`,
                width: `calc(${colWidth}% - 3px)`,
                right: 'auto',
              };
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
                    {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  {event.meetLink && (
                    <div className="week-event-meet">
                      <span className="material-icons-outlined" style={{ fontSize: 12 }}>videocam</span>
                    </div>
                  )}
                </div>
              );
            })}
            {isToday && (
              <div className="current-time-line" style={{ top: `${nowTop}px` }}>
                <div className="current-time-dot" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
