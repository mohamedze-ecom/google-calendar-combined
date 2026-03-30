import React from 'react'
import MiniCalendar from './MiniCalendar'

const ACCOUNT_COLORS = ['#8ab4f8', '#f28b82'];

export default function Sidebar({ accounts, onConnect, onDisconnect, currentDate, onDateSelect, onMiniCalNavigate }) {
  return (
    <aside className="sidebar">
      <MiniCalendar
        currentDate={currentDate}
        onDateSelect={onDateSelect}
        onNavigate={onMiniCalNavigate}
      />

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Accounts</h3>
        {[0, 1].map(slot => (
          <div key={slot} className="account-item">
            {accounts[slot] ? (
              <>
                <div className="account-dot" style={{ backgroundColor: ACCOUNT_COLORS[slot] }} />
                <span className="account-email">{accounts[slot].email}</span>
                <button
                  className="account-disconnect"
                  onClick={() => onDisconnect(slot)}
                  title="Disconnect"
                >
                  <span className="material-icons-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </>
            ) : (
              <button className="connect-btn" onClick={() => onConnect(slot)}>
                <span className="material-icons-outlined" style={{ fontSize: 18, marginRight: 8 }}>add</span>
                Connect Account {slot + 1}
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
