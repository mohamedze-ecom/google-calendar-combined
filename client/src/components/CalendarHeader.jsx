import React from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getHeaderLabel(date, view) {
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  if (view === 'month') return `${month} ${year}`;

  if (view === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    if (weekStart.getFullYear() === weekEnd.getFullYear()) {
      return `${MONTHS[weekStart.getMonth()]} – ${MONTHS[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()} – ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  }

  return `${month} ${date.getDate()}, ${year}`;
}

export default function CalendarHeader({ currentDate, view, onViewChange, onNavigate, onToday, onToggleSidebar }) {
  return (
    <header className="cal-header">
      <div className="cal-header-left">
        <button className="icon-btn" onClick={onToggleSidebar} title="Main menu">
          <span className="material-icons-outlined">menu</span>
        </button>
        <div className="cal-logo">
          <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" alt="" className="cal-logo-img" />
          <span className="cal-logo-text">Calendar</span>
        </div>
        <button className="today-btn" onClick={onToday}>Today</button>
        <button className="icon-btn nav-btn" onClick={() => onNavigate(-1)}>
          <span className="material-icons-outlined">chevron_left</span>
        </button>
        <button className="icon-btn nav-btn" onClick={() => onNavigate(1)}>
          <span className="material-icons-outlined">chevron_right</span>
        </button>
        <h1 className="cal-header-title">{getHeaderLabel(currentDate, view)}</h1>
      </div>
      <div className="cal-header-right">
        <div className="view-switcher">
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              className={`view-btn ${view === v ? 'active' : ''}`}
              onClick={() => onViewChange(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
