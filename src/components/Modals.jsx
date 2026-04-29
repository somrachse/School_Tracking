import { useRef, useState, useEffect } from 'react';
import { useApp, entryStatus, getLevelLabel, calcAge } from '../AppContext';

export function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i className={`fas ${t.type==='success'?'fa-check-circle':t.type==='error'?'fa-times-circle':'fa-info-circle'}`}></i><span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function CameraModal() {
  const { cameraModal, setCameraModal, setCurrentPhoto, showToast } = useApp();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (cameraModal && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }).catch(() => showToast('Camera not available', 'error'));
    }
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [cameraModal]);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    c.width = 200; c.height = 200;
    const ctx = c.getContext('2d');
    const sz = Math.min(v.videoWidth, v.videoHeight);
    ctx.drawImage(v, (v.videoWidth-sz)/2, (v.videoHeight-sz)/2, sz, sz, 0, 0, 200, 200);
    setCurrentPhoto(c.toDataURL('image/jpeg', 0.5));
    setCameraModal(false);
  };

  const handleUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current; c.width = 200; c.height = 200;
        const ctx = c.getContext('2d');
        const sz = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width-sz)/2, (img.height-sz)/2, sz, sz, 0, 0, 200, 200);
        setCurrentPhoto(c.toDataURL('image/jpeg', 0.5));
        setCameraModal(false);
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };

  if (!cameraModal) return null;
  return (
    <div className="modal-overlay" onClick={() => setCameraModal(false)}>
      <div className="modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h3 style={{ fontSize: '16px' }}>Take Photo</h3><button onClick={() => setCameraModal(false)} className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }}><i className="fas fa-times"></i></button></div>
        <div style={{ padding: '20px' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000', minHeight: '240px' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}><i className="fas fa-upload"></i>Upload<input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} /></label>
            <button onClick={capture} className="btn btn-primary"><i className="fas fa-camera"></i>Capture</button>
          </div>
        </div>
      </div>
    </div>
  );
}
