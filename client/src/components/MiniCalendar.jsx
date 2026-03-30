import React from 'react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MiniCalendar({ currentDate, onDateSelect, onNavigate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const isToday = (day) =>
    day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="mini-calendar">
      <div className="mini-cal-header">
        <span className="mini-cal-title">{MONTHS[month]} {year}</span>
        <div>
          <button className="icon-btn mini-nav" onClick={() => onNavigate(-1)}>
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          <button className="icon-btn mini-nav" onClick={() => onNavigate(1)}>
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>
      </div>
      <div className="mini-cal-grid">
        {DAYS.map((d, i) => (
          <div key={i} className="mini-cal-day-label">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`mini-cal-cell ${day ? 'has-day' : ''} ${isToday(day) ? 'today' : ''}`}
            onClick={() => day && onDateSelect(new Date(year, month, day))}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
