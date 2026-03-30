import React from 'react'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({ currentDate, events, onEventClick, onDateSelect }) {
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Build grid of weeks
  const weeks = [];
  let current = new Date(firstDay);
  current.setDate(current.getDate() - current.getDay()); // Start from Sunday

  while (current <= lastDay || current.getDay() !== 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (current > lastDay && current.getDay() === 0) break;
  }

  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const isCurrentMonth = (date) => date.getMonth() === month;

  const getEventsForDay = (date) => {
    const dayStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      const eStart = e.start.split('T')[0];
      return eStart === dayStr;
    });
  };

  return (
    <div className="month-view">
      <div className="month-header-row">
        {DAY_NAMES.map(d => (
          <div key={d} className="month-day-label">{d}</div>
        ))}
      </div>
      <div className="month-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="month-week-row">
            {week.map((day, di) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={di}
                  className={`month-cell ${!isCurrentMonth(day) ? 'other-month' : ''}`}
                  onClick={() => onDateSelect(day)}
                >
                  <span className={`month-date ${isToday(day) ? 'today-circle' : ''}`}>
                    {day.getDate()}
                  </span>
                  <div className="month-events">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`month-event ${event.allDay ? 'allday' : 'timed'}`}
                        style={event.allDay ? { backgroundColor: event.color } : {}}
                        onClick={(e) => onEventClick(event, e)}
                      >
                        {!event.allDay && (
                          <span className="month-event-dot" style={{ backgroundColor: event.color }} />
                        )}
                        <span className="month-event-title">
                          {!event.allDay && (
                            <span className="month-event-time">
                              {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                          {' '}{event.title}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="month-more">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
