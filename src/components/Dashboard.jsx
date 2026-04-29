import { useApp, calcAge, getLevel, packStatus, completeDistributions, totalDistributions } from '../AppContext';

export default function Dashboard() {
  const { students, settings } = useApp();
  const total = students.length;
  const boys = students.filter(s => s.gender === 'Male').length;
  const girls = students.filter(s => s.gender === 'Female').length;
  const primary = students.filter(s => getLevel(s.grade) === 'primary').length;
  const high = students.filter(s => getLevel(s.grade) === 'high').length;
  const avgAge = total > 0 ? (students.reduce((a, s) => a + calcAge(s.dob), 0) / total).toFixed(1) : '—';
  const comp = completeDistributions(students);
  const dist = totalDistributions(students);
  const remaining = Math.max(0, settings.stock - comp);

  // Church breakdown instead of ministry
  const churchCounts = {};
  students.forEach(s => { churchCounts[s.church] = (churchCounts[s.church] || 0) + 1; });
  const maxChurch = Math.max(...Object.values(churchCounts), 1);

  const recent = [...students].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '22px' }}>Dashboard</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>Overview of school pack distribution</p></div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Students</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', marginTop: '4px' }}>{total}</div></div>
        <div className="card stat-card blue"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Boys</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--info)', marginTop: '4px' }}>{boys}</div></div>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Girls</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--accent)', marginTop: '4px' }}>{girls}</div></div>
        <div className="card stat-card blue"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Primary</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', marginTop: '4px' }}>{primary}</div></div>
        <div className="card stat-card amber"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>High School</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--warn)', marginTop: '4px' }}>{high}</div></div>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Age</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', marginTop: '4px' }}>{avgAge}</div></div>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Packs Given</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--accent)', marginTop: '4px' }}>{comp}</div><div style={{ fontSize: '10px', color: 'var(--fg3)', marginTop: '2px' }}>{dist} total distributions</div></div>
        <div className={`card stat-card ${remaining < 20 ? 'red' : 'blue'}`}><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Remaining</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Space Grotesk', color: remaining < 20 ? 'var(--danger)' : 'var(--info)', marginTop: '4px' }}>{remaining}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Church Breakdown</h3>
          {Object.entries(churchCounts).sort((a,b) => b[1]-a[1]).map(([n, c]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</div>
              <div className="ministry-bar"><div className="ministry-bar-fill" style={{ width: `${(c/maxChurch*100).toFixed(1)}%` }}></div></div>
              <div style={{ fontSize: '13px', fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>{c}</div>
            </div>
          ))}
        </div>
        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Demographics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--info-bg)', borderRadius: '10px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--info)', fontFamily: 'Space Grotesk' }}>{boys}</div><div style={{ fontSize: '12px', color: 'var(--fg2)', marginTop: '2px' }}>Boys ({total?((boys/total*100).toFixed(0)):0}%)</div></div>
            <div style={{ padding: '14px', background: 'var(--accent-bg)', borderRadius: '10px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'Space Grotesk' }}>{girls}</div><div style={{ fontSize: '12px', color: 'var(--fg2)', marginTop: '2px' }}>Girls ({total?((girls/total*100).toFixed(0)):0}%)</div></div>
            <div style={{ padding: '14px', background: 'var(--bg3)', borderRadius: '10px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{primary}</div><div style={{ fontSize: '12px', color: 'var(--fg2)', marginTop: '2px' }}>Primary</div></div>
            <div style={{ padding: '14px', background: 'var(--warn-bg)', borderRadius: '10px', textAlign: 'center' }}><div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warn)', fontFamily: 'Space Grotesk' }}>{high}</div><div style={{ fontSize: '12px', color: 'var(--fg2)', marginTop: '2px' }}>High School</div></div>
          </div>
          <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--fg2)' }}>Average Age</span><span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{avgAge} yrs</span>
          </div>
        </div>
      </div>

      <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Recently Added</h3>
        {recent.length === 0 ? <div className="empty-state"><i className="fas fa-user-plus"></i><p>No students registered yet</p></div> : 
          recent.map(s => (
            <div key={s.id} className="student-card" onClick={() => { /* Navigate to detail handled in App */ }}>
              <div className="student-photo">{s.photo ? <img src={s.photo} alt="" /> : <i className="fas fa-user"></i>}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--fg3)' }}>Grade {s.grade} · {s.ministry}</div>
              </div>
              <span className={`badge ${packStatus(s)==='complete'?'badge-success':packStatus(s)==='partial'?'badge-warn':'badge-info'}`}>{packStatus(s)==='complete'?'Complete':packStatus(s)==='partial'?'Partial':'Pending'}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
