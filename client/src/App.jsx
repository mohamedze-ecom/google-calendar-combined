import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import CalendarHeader from './components/CalendarHeader'
import MonthView from './components/MonthView'
import WeekView from './components/WeekView'
import DayView from './components/DayView'
import EventPopover from './components/EventPopover'
import EditEventModal from './components/EditEventModal'

const API_BASE = '';

function App() {
  const [accounts, setAccounts] = useState([null, null]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [miniCalDate, setMiniCalDate] = useState(new Date());

  useEffect(() => { fetchAuthStatus(); }, []);

  useEffect(() => {
    if (accounts.some(a => a !== null)) fetchEvents();
  }, [accounts, currentDate, view]);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
      const data = await res.json();
      setAccounts(data.accounts.length >= 2 ? data.accounts : [...data.accounts, ...Array(2 - data.accounts.length).fill(null)]);
    } catch (err) { console.error('Failed to fetch auth status:', err); }
  };

  const connectAccount = async (slot) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login?slot=${slot}`, { credentials: 'include' });
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) { console.error('Failed to start auth:', err); }
  };

  const disconnectAccount = async (slot) => {
    try {
      await fetch(`${API_BASE}/auth/disconnect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ slot }),
      });
      fetchAuthStatus();
      setEvents(prev => prev.filter(e => e.accountIndex !== slot));
    } catch (err) { console.error('Failed to disconnect:', err); }
  };

  const getDateRange = useCallback(() => {
    const d = new Date(currentDate);
    let timeMin, timeMax;
    if (view === 'month') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      timeMin = new Date(first); timeMin.setDate(timeMin.getDate() - timeMin.getDay());
      timeMax = new Date(last); timeMax.setDate(timeMax.getDate() + (6 - timeMax.getDay()) + 1);
    } else if (view === 'week') {
      timeMin = new Date(d); timeMin.setDate(d.getDate() - d.getDay()); timeMin.setHours(0, 0, 0, 0);
      timeMax = new Date(timeMin); timeMax.setDate(timeMin.getDate() + 7);
    } else {
      timeMin = new Date(d); timeMin.setHours(0, 0, 0, 0);
      timeMax = new Date(d); timeMax.setDate(d.getDate() + 1);
    }
    return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
  }, [currentDate, view]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { timeMin, timeMax } = getDateRange();
      const res = await fetch(`${API_BASE}/api/events?timeMin=${timeMin}&timeMax=${timeMax}`, { credentials: 'include' });
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) { console.error('Failed to fetch events:', err); }
    setLoading(false);
  };

  const navigateDate = (direction) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setDate(d.getDate() + direction);
    setCurrentDate(d);
  };

  const goToToday = () => { setCurrentDate(new Date()); setMiniCalDate(new Date()); };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({ top: rect.top, left: rect.right + 8 });
    setSelectedEvent(event);
  };

  const closePopover = () => { setSelectedEvent(null); setPopoverPosition(null); };

  const handleDateSelect = (date) => { setCurrentDate(date); };

  // Edit event
  const handleEditEvent = (event) => {
    closePopover();
    setEditingEvent(event);
  };

  const handleSaveEvent = async (updatedEvent) => {
    try {
      const calId = encodeURIComponent(updatedEvent.calendarId);
      const res = await fetch(`${API_BASE}/api/events/${updatedEvent.accountIndex}/${calId}/${updatedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: updatedEvent.title,
          description: updatedEvent.description,
          location: updatedEvent.location,
          start: updatedEvent.start,
          end: updatedEvent.end,
          allDay: updatedEvent.allDay,
        }),
      });
      if (res.ok) {
        setEditingEvent(null);
        await fetchEvents();
      }
    } catch (err) { console.error('Failed to save event:', err); }
  };

  // Delete event
  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try {
      const calId = encodeURIComponent(event.calendarId);
      const res = await fetch(`${API_BASE}/api/events/${event.accountIndex}/${calId}/${event.id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (res.ok) {
        closePopover();
        setEvents(prev => prev.filter(e => e.id !== event.id));
      }
    } catch (err) { console.error('Failed to delete event:', err); }
  };

  // Drag-to-move: update event time
  const handleEventDrop = async (event, newStart) => {
    const duration = new Date(event.end) - new Date(event.start);
    const newEnd = new Date(newStart.getTime() + duration);

    // Optimistic update
    setEvents(prev => prev.map(e =>
      e.id === event.id && e.accountIndex === event.accountIndex
        ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() }
        : e
    ));

    try {
      const calId = encodeURIComponent(event.calendarId);
      await fetch(`${API_BASE}/api/events/${event.accountIndex}/${calId}/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          allDay: event.allDay,
        }),
      });
    } catch (err) {
      console.error('Failed to move event:', err);
      await fetchEvents(); // Revert on error
    }
  };

  // Check URL for auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
      fetchAuthStatus();
    }
  }, []);

  const hasAccounts = accounts.some(a => a !== null);

  return (
    <div className="app">
      <CalendarHeader
        currentDate={currentDate} view={view}
        onViewChange={setView} onNavigate={navigateDate}
        onToday={goToToday} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="app-body">
        {sidebarOpen && (
          <Sidebar
            accounts={accounts} onConnect={connectAccount} onDisconnect={disconnectAccount}
            currentDate={miniCalDate} onDateSelect={handleDateSelect}
            onMiniCalNavigate={(dir) => { const d = new Date(miniCalDate); d.setMonth(d.getMonth() + dir); setMiniCalDate(d); }}
          />
        )}
        <main className="calendar-main">
          {!hasAccounts ? (
            <div className="empty-state">
              <span className="material-icons-outlined empty-icon">calendar_month</span>
              <h2>Connect your Google accounts</h2>
              <p>Connect at least one Gmail account from the sidebar to see your calendar events.</p>
            </div>
          ) : (
            <>
              {loading && <div className="loading-bar" />}
              {view === 'month' && <MonthView currentDate={currentDate} events={events} onEventClick={handleEventClick} onDateSelect={handleDateSelect} />}
              {view === 'week' && <WeekView currentDate={currentDate} events={events} onEventClick={handleEventClick} onEventDrop={handleEventDrop} />}
              {view === 'day' && <DayView currentDate={currentDate} events={events} onEventClick={handleEventClick} onEventDrop={handleEventDrop} />}
            </>
          )}
        </main>
      </div>
      {selectedEvent && popoverPosition && (
        <EventPopover
          event={selectedEvent} position={popoverPosition}
          onClose={closePopover} onEdit={handleEditEvent} onDelete={handleDeleteEvent}
        />
      )}
      {editingEvent && (
        <EditEventModal event={editingEvent} onSave={handleSaveEvent} onClose={() => setEditingEvent(null)} />
      )}
    </div>
  );
}

export default App;
