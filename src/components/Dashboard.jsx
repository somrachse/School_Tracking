import { useApp, calcAge, getLevel, packStatus, completeDistributions, totalDistributions } from '../AppContext';

export default function Dashboard() {
  const { students, settings } = useApp();
  const total = students.length;
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const primary = students.filter(s => getLevel(s.grade) === 'primary').length;
  const high = students.filter(s => getLevel(s.grade) === 'high').length;
  const comp = completeDistributions(students);
  const dist = totalDistributions(students);
  

  // Church breakdown instead of ministry
  const churchCounts = {};
  students.forEach(s => { churchCounts[s.church] = (churchCounts[s.church] || 0) + 1; });
  const maxChurch = Math.max(...Object.values(churchCounts), 1);

  const recent = [...students].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  // Distribution trends (Target vs Actual): show every year that has registrations.
  const packEntries = students.flatMap((s) => {
    const history = Array.isArray(s.packHistory) ? s.packHistory : [];
    const entries = history.map((entry) => ({
      year: entry?.year ?? s.packYear ?? new Date().getFullYear(),
      items: entry?.items || {},
    }));

    if (s.packYear && !entries.some((entry) => String(entry.year) === String(s.packYear))) {
      entries.push({
        year: s.packYear,
        items: { bag: false, uniforms: false, books: false },
      });
    }

    return entries;
  });

  const uniqueYears = Array.from(new Set(packEntries.map((e) => Number(e.year)).filter(Boolean))).sort((a, b) => a - b);
  const currentYear = new Date().getFullYear();
  const yearsToShow = uniqueYears.length > 0 ? uniqueYears : [currentYear];

  const actualByYear = {};
  const registeredByYear = {};
  packEntries.forEach((e) => {
    const y = String(e.year);
    const items = e.items || {};
    registeredByYear[y] = (registeredByYear[y] || 0) + 1;
    if (items.bag && items.uniforms && items.books) {
      actualByYear[y] = (actualByYear[y] || 0) + 1;
    }
  });

  const settingsTargets = settings.distributionTargets || settings.targets || {};
  const targetByYear = {};
  yearsToShow.forEach((y) => {
    const key = String(y);
    if (settingsTargets && Object.prototype.hasOwnProperty.call(settingsTargets, key)) {
      targetByYear[key] = Number(settingsTargets[key]) || 0;
    } else {
      targetByYear[key] = registeredByYear[key] || 0;
    }
  });

  const chartData = yearsToShow.map((y) => {
    const key = String(y);
    return {
      year: y,
      // show the actual year label for every column (instead of "Current")
      label: String(y),
      actual: actualByYear[key] || 0,
      target: targetByYear[key] || 0,
    };
  });

  const maxVal = Math.max(1, ...chartData.flatMap((d) => [d.actual, d.target]));

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '22px' }}>Dashboard</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>Overview of school pack distribution</p></div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Students</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', marginTop: '4px' }}>{total}</div></div>
        <div className="card stat-card blue"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Male</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', color: 'var(--info)', marginTop: '4px' }}>{maleCount}</div></div>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Female</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', color: 'var(--accent)', marginTop: '4px' }}>{femaleCount}</div></div>
        <div className="card stat-card blue"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Primary</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', marginTop: '4px' }}>{primary}</div></div>
        <div className="card stat-card amber"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>High School</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', color: 'var(--warn)', marginTop: '4px' }}>{high}</div></div>
        <div className="card stat-card green"><div style={{ fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase' }}>Packs Given</div><div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Kantumruy', color: 'var(--accent)', marginTop: '4px' }}>{comp}</div><div style={{ fontSize: '10px', color: 'var(--fg3)', marginTop: '2px' }}>{dist} total distributions</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Church Breakdown</h3>
          {Object.entries(churchCounts).sort((a,b) => b[1]-a[1]).map(([n, c]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</div>
              <div className="ministry-bar"><div className="ministry-bar-fill" style={{ width: `${(c/maxChurch*100).toFixed(1)}%` }}></div></div>
              <div style={{ fontSize: '13px', fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>{c}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>Distribution Trends</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--fg2)' }}>Growth Comparison ({chartData.length ? `${chartData[0].label} - ${chartData[chartData.length - 1].label}` : ''})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 12, height: 12, background: 'var(--info-bg)', borderRadius: 8, display: 'inline-block' }}></span><small style={{ color: 'var(--fg2)' }}>Target</small></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 12, height: 12, background: 'var(--info)', borderRadius: 8, display: 'inline-block' }}></span><small style={{ color: 'var(--fg2)' }}>Actual</small></div>
          </div>
        </div>

        <div className="dist-chart-wrap">
          <div className="dist-scroll">
            <div className="dist-values-row" aria-hidden="false">
              {chartData.map((d) => (
                <div className="dist-values-cell" key={`val-${d.year}`}>
                  <div className="dist-value dist-value-target" title={`Target ${d.target.toLocaleString()}`}>{d.target.toLocaleString()}</div>
                  <div className="dist-value dist-value-actual" title={`Actual ${d.actual.toLocaleString()}`}>{d.actual.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="dist-chart">
              {chartData.map((d) => (
                <div className="dist-col" key={`col-${d.year}`}>
                  <div className="dist-bar-wrapper" aria-hidden="true">
                    <div className="dist-bar target" style={{ height: `${Math.round((d.target / maxVal) * 100)}%` }} />
                    <div className="dist-bar actual" style={{ height: `${Math.round((d.actual / maxVal) * 100)}%` }} />
                  </div>
                  <div className="dist-label" style={{ marginTop: '8px' }}>{d.label}</div>
                </div>
              ))}
            </div>
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
