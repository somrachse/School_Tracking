import { useState } from 'react';
import { useApp } from '../AppContext';

export default function Layout({ activeView, onNavigate }) {
  const { currentView, setCurrentView, toggleTheme, theme } = useApp();
  const isDark = (theme || 'dark') === 'dark';
  const selectedView = activeView || currentView;
  const [logoVisible, setLogoVisible] = useState(true);

  const handleNavigate = (view) => {
    if (onNavigate) {
      onNavigate(view);
      return;
    }
    setCurrentView(view);
  };

  const navItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'students', icon: 'fa-users', label: 'Students' },
    { id: 'register', icon: 'fa-user-plus', label: 'Add Student' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];

  return (
    <>
      <aside className="sidebar no-print">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/** Logo: show image at natural aspect ratio (no rounded box) */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logoVisible ? (
              <img
                src="/img/FFCC.PNG"
                alt="FFCC"
                onLoad={() => setLogoVisible(true)}
                onError={() => setLogoVisible(false)}
                style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '14px', letterSpacing: '0.6px' }}>FFCC</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'Kantumruy', fontWeight: 700, fontSize: '15px' }}>Pack Tracker</div>
            <div style={{ fontSize: '11px', color: 'var(--fg3)' }}>Data Management</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${selectedView === item.id ? 'active' : ''}`} onClick={() => handleNavigate(item.id)}>
              <i className={`fas ${item.icon}`}></i>{item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--fg3)' }}>Dark Mode</span>
          <label className="switch">
            <input type="checkbox" checked={isDark} onChange={(e) => toggleTheme(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </aside>

      <nav className="bottom-nav no-print">
        {navItems.map(item => (
          <div key={item.id} className={`bnav-item ${selectedView === item.id ? 'active' : ''}`} onClick={() => handleNavigate(item.id)}>
            <i className={`fas ${item.icon}`}></i>{item.label}
          </div>
        ))}
      </nav>
    </>
  );
}
