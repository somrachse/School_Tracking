import { useState } from 'react';
import { useApp } from '../AppContext';

export default function Settings() {
  const {
    settings,
    saveSettings,
    addMinistry: createMinistry,
    removeMinistry: deleteMinistry,
    addChurch: createChurch,
    removeChurch: deleteChurch,
    showToast,
  } = useApp();
  const [newMin, setNewMin] = useState('');
  const [newChurch, setNewChurch] = useState('');

  const addMinistry = () => {
    const trimmed = newMin.trim();
    if (!trimmed || settings.ministries.includes(trimmed)) return showToast('Already exists', 'error');
    createMinistry(trimmed, () => {
      setNewMin('');
      showToast('Ministry added');
    });
  };

  const removeMinistry = (m) => {
    deleteMinistry(m, () => showToast('Ministry deleted'));
  };
  
  const addChurch = () => {
    const trimmed = newChurch.trim();
    if (!trimmed || settings.churches.includes(trimmed)) return showToast('Already exists', 'error');
    createChurch(trimmed, () => {
      setNewChurch('');
      showToast('Church added');
    });
  };

  const removeChurch = (c) => {
    deleteChurch(c, () => showToast('Church deleted'));
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '22px' }}>Settings</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>Configure your system preferences</p></div>
      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}><i className="fas fa-boxes-stacked" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>Inventory</h3><div><label className="field-label">Total Packs in Stock</label><input type="number" className="input-field" style={{ maxWidth: '200px' }} min="0" value={settings.stock} onChange={e => saveSettings({...settings, stock: parseInt(e.target.value)||0})} /></div></div>
        
        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}><i className="fas fa-church" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>Ministries</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>{settings.ministries.map(m => <span key={m} className="tag">{m}<button onClick={() => removeMinistry(m)}>&times;</button></span>)}</div>
          <div style={{ display: 'flex', gap: '8px' }}><input type="text" className="input-field" placeholder="Add ministry..." value={newMin} onChange={e => setNewMin(e.target.value)} /><button onClick={addMinistry} className="btn btn-primary btn-sm"><i className="fas fa-plus"></i>Add</button></div>
        </div>

        <div className="card"><h3 style={{ fontSize: '15px', marginBottom: '16px' }}><i className="fas fa-place-of-worship" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>Churches</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>{settings.churches.map(c => <span key={c} className="tag">{c}<button onClick={() => removeChurch(c)}>&times;</button></span>)}</div>
          <div style={{ display: 'flex', gap: '8px' }}><input type="text" className="input-field" placeholder="Add church..." value={newChurch} onChange={e => setNewChurch(e.target.value)} /><button onClick={addChurch} className="btn btn-primary btn-sm"><i className="fas fa-plus"></i>Add</button></div>
        </div>
      </div>
    </div>
  );
}
