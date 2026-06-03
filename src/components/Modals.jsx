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
  const { cameraModal, setCameraModal, setCurrentPhoto, setCurrentDocs, cameraTarget, showToast } = useApp();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');
  const [crop, setCrop] = useState({ x: 0.5, y: 0.5, size: 0.6 }); // center x/y (0-1), size as fraction of min dimension
  const draggingRef = useRef(null);
  const resizingRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const lastDetectRef = useRef(0);

  useEffect(() => {
    if (cameraModal && videoRef.current) {
      const facing = cameraTarget === 'document' ? 'environment' : facingMode;
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } } }).then(stream => {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }).catch(() => showToast('Camera not available', 'error'));
    }
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [cameraModal, cameraTarget, facingMode]);

  // Recompute overlay position when window resizes
  useEffect(() => {
    if (!cameraModal) return;
    const onResize = () => setCrop(c => ({ ...c }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [cameraModal]);

  // Live object/face tracking: update crop to follow detected face or motion
  useEffect(() => {
    if (!cameraModal || !videoRef.current) return;
    let rafId = 0;
    let detector = null;
    let stopped = false;

    const run = async () => {
      try {
        if (draggingRef.current || resizingRef.current) {
          // user is interacting; skip tracking updates
        } else {
          const now = performance.now();
          if (now - (lastDetectRef.current || 0) < 120) {
            // throttle
          } else {
            lastDetectRef.current = now;
            const v = videoRef.current;
            const rect = v.getBoundingClientRect();

            if ('FaceDetector' in window) {
              try {
                if (!detector) detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
                const faces = await detector.detect(v);
                if (faces && faces.length > 0) {
                  const box = faces[0].boundingBox || faces[0];
                  // box may have left/top/width/height or x/y/width/height
                  const bx = box.left ?? box.x ?? 0;
                  const by = box.top ?? box.y ?? 0;
                  const bw = box.width != null ? box.width : (box.right != null ? (box.right - bx) : 0);
                  const bh = box.height != null ? box.height : (box.bottom != null ? (box.bottom - by) : 0);
                  // If values appear in intrinsic pixels, scale to display
                  let sx = bx, sy = by, sw = bw, sh = bh;
                  if (v.videoWidth && v.videoHeight && (bw > rect.width || bh > rect.height)) {
                    const scaleX = rect.width / v.videoWidth;
                    const scaleY = rect.height / v.videoHeight;
                    sx = bx * scaleX; sy = by * scaleY; sw = bw * scaleX; sh = bh * scaleY;
                  }
                  const centerX = clamp((sx + sw / 2) / rect.width, 0.05, 0.95);
                  const centerY = clamp((sy + sh / 2) / rect.height, 0.05, 0.95);
                  const size = Math.min(0.95, Math.max(0.15, Math.max(sw / rect.width, sh / rect.height)));
                  setCrop((prev) => ({ ...prev, x: centerX, y: centerY, size }));
                }
              } catch (err) {
                // ignore face detector failures and fall back
              }
            } else {
              // motion detection fallback (simple frame-diff)
              try {
                const analysisCanvas = analysisCanvasRef.current || (analysisCanvasRef.current = document.createElement('canvas'));
                const aw = 160;
                const ah = Math.max(80, Math.round((aw * v.videoHeight) / v.videoWidth));
                analysisCanvas.width = aw; analysisCanvas.height = ah;
                const actx = analysisCanvas.getContext('2d');
                actx.drawImage(v, 0, 0, aw, ah);
                const frame = actx.getImageData(0, 0, aw, ah);
                const prev = analysisCanvas._prevFrame;
                if (prev) {
                  let minX = aw, minY = ah, maxX = 0, maxY = 0, count = 0;
                  const threshold = 50;
                  for (let y = 0; y < ah; y++) {
                    for (let x = 0; x < aw; x++) {
                      const i = (y * aw + x) * 4;
                      const r = frame.data[i], g = frame.data[i + 1], b = frame.data[i + 2];
                      const pr = prev.data[i], pg = prev.data[i + 1], pb = prev.data[i + 2];
                      const d = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
                      if (d > threshold) {
                        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                        count++;
                      }
                    }
                  }
                  if (count > 20) {
                    const left = minX / aw; const top = minY / ah; const w = (maxX - minX) / aw; const h = (maxY - minY) / ah;
                    const centerX = clamp(left + w / 2, 0.05, 0.95); const centerY = clamp(top + h / 2, 0.05, 0.95);
                    const size = Math.min(0.95, Math.max(0.15, Math.max(w, h)));
                    setCrop((prev) => ({ ...prev, x: centerX, y: centerY, size }));
                  }
                }
                analysisCanvas._prevFrame = frame;
              } catch (err) {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        // swallow errors
      }
      if (!stopped) rafId = requestAnimationFrame(run);
    };

    rafId = requestAnimationFrame(run);
    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (detector && detector.close) detector.close();
    };
  }, [cameraModal, facingMode, cameraTarget]);

  // Initialize crop when video metadata is available
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      // keep default center crop; no action needed but ensure overlay updates
      setCrop((c) => ({ ...c }));
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [cameraModal]);

  const toggleFacing = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const getDisplayRects = () => {
    const video = videoRef.current;
    if (!video) return null;
    const vRect = video.getBoundingClientRect();
    return { videoRect: vRect };
  };

  const startDrag = (e) => {
    e.preventDefault();
    const rects = getDisplayRects();
    if (!rects) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      videoRect: rects.videoRect
    };
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag);
  };

  const onDrag = (e) => {
    const d = draggingRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.videoRect.width;
    const dy = (e.clientY - d.startY) / d.videoRect.height;
    const minDim = Math.min(d.videoRect.width, d.videoRect.height);
    const halfW = (d.startCrop.size * minDim) / (2 * d.videoRect.width);
    const halfH = (d.startCrop.size * minDim) / (2 * d.videoRect.height);
    let nx = d.startCrop.x + dx;
    let ny = d.startCrop.y + dy;
    nx = clamp(nx, halfW, 1 - halfW);
    ny = clamp(ny, halfH, 1 - halfH);
    setCrop((prev) => ({ ...prev, x: nx, y: ny }));
  };

  const endDrag = () => {
    draggingRef.current = null;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', endDrag);
  };

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rects = getDisplayRects();
    if (!rects) return;
    const minDim = Math.min(rects.videoRect.width, rects.videoRect.height);
    resizingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startSize: crop.size,
      videoRect: rects.videoRect,
      minDim
    };
    document.addEventListener('pointermove', onResize);
    document.addEventListener('pointerup', endResize);
  };

  const onResize = (e) => {
    const r = resizingRef.current;
    if (!r) return;
    const deltaPx = Math.max(e.clientX - r.startX, e.clientY - r.startY);
    const newSize = r.startSize + deltaPx / r.minDim;
    // clamp based on available space around center
    const leftPx = crop.x * r.videoRect.width;
    const rightPx = (1 - crop.x) * r.videoRect.width;
    const topPx = crop.y * r.videoRect.height;
    const bottomPx = (1 - crop.y) * r.videoRect.height;
    const maxHalf = Math.min(leftPx, rightPx, topPx, bottomPx);
    const maxSize = Math.min(0.98, (2 * maxHalf) / r.minDim);
    const minSize = 0.15;
    const sz = clamp(newSize, minSize, maxSize);
    setCrop((prev) => ({ ...prev, size: sz }));
  };

  const endResize = () => {
    resizingRef.current = null;
    document.removeEventListener('pointermove', onResize);
    document.removeEventListener('pointerup', endResize);
  };

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (cameraTarget === 'document') {
      // capture larger image for documents
      const w = 1200;
      const h = Math.round((v.videoHeight / v.videoWidth) * w) || 900;
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0, w, h);
      const data = c.toDataURL('image/jpeg', 0.8);
      setCurrentDocs((prev) => [...prev, { name: `doc-${Date.now()}.jpg`, dataUrl: data }]);
      setCameraModal(false);
      return;
    }
    try {
      // crop according to overlay
      const videoRect = videoRef.current.getBoundingClientRect();
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const sx = (overlayRect.left - videoRect.left) * (v.videoWidth / videoRect.width);
      const sy = (overlayRect.top - videoRect.top) * (v.videoHeight / videoRect.height);
      const sw = overlayRect.width * (v.videoWidth / videoRect.width);
      const sh = overlayRect.height * (v.videoHeight / videoRect.height);
      c.width = 200; c.height = 200;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, 200, 200);
    } catch (err) {
      // fallback to center square
      c.width = 200; c.height = 200;
      const ctx = c.getContext('2d');
      const sz = Math.min(v.videoWidth, v.videoHeight);
      ctx.drawImage(v, (v.videoWidth - sz) / 2, (v.videoHeight - sz) / 2, sz, sz, 0, 0, 200, 200);
    }
    setCurrentPhoto(c.toDataURL('image/jpeg', 0.5));
    setCameraModal(false);
  };

  const handleUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        if (cameraTarget === 'document') {
          // keep full aspect for document
          const w = 1200; const h = Math.round((img.height / img.width) * w) || 900;
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          setCurrentDocs((prev) => [...prev, { name: f.name, dataUrl: c.toDataURL('image/jpeg', 0.8) }]);
          setCameraModal(false);
          return;
        }
        try {
          // try to crop according to overlay on the video preview
          const vRect = videoRef.current ? videoRef.current.getBoundingClientRect() : null;
          const overlayRect = overlayRef.current ? overlayRef.current.getBoundingClientRect() : null;
          if (vRect && overlayRect) {
            const left = overlayRect.left - vRect.left;
            const top = overlayRect.top - vRect.top;
            const sx = (left / vRect.width) * img.width;
            const sy = (top / vRect.height) * img.height;
            const sw = (overlayRect.width / vRect.width) * img.width;
            const sh = (overlayRect.height / vRect.height) * img.height;
            c.width = 200; c.height = 200;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 200, 200);
            setCurrentPhoto(c.toDataURL('image/jpeg', 0.5));
            setCameraModal(false);
            return;
          }
        } catch (err) {
          // fallthrough to center crop
        }

        c.width = 200; c.height = 200;
        const ctx = c.getContext('2d');
        const sz = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 200, 200);
        setCurrentPhoto(c.toDataURL('image/jpeg', 0.5));
        setCameraModal(false);
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };

  if (!cameraModal) return null;

  // compute overlay style based on current crop and video display size
  const vRect = videoRef.current ? videoRef.current.getBoundingClientRect() : null;
  const cRect = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
  let overlayStyle = { left: 0, top: 0, width: 0, height: 0 };
  if (vRect && cRect) {
    const minDim = Math.min(vRect.width, vRect.height) || 0;
    const ow = crop.size * minDim;
    const oh = ow;
    const leftRel = vRect.left - cRect.left;
    const topRel = vRect.top - cRect.top;
    const left = leftRel + crop.x * vRect.width - ow / 2;
    const top = topRel + crop.y * vRect.height - oh / 2;
    overlayStyle = { left: `${left}px`, top: `${top}px`, width: `${ow}px`, height: `${oh}px` };
  }

  return (
    <div className="modal-overlay" onClick={() => setCameraModal(false)}>
      <div className="modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h3 style={{ fontSize: '16px' }}>Take Photo</h3><button onClick={() => setCameraModal(false)} className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }}><i className="fas fa-times"></i></button></div>
        <div style={{ padding: '20px' }}>
          <div ref={containerRef} style={{ position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000', minHeight: '240px', display: 'block' }} />
            <div
              ref={overlayRef}
              onPointerDown={startDrag}
              style={{ position: 'absolute', pointerEvents: 'auto', boxSizing: 'border-box', ...overlayStyle }}
            >
              <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(255,255,255,0.9)', borderRadius: 6, background: 'rgba(0,0,0,0.15)' }} />
              <div onPointerDown={startResize} style={{ position: 'absolute', width: 18, height: 18, right: -9, bottom: -9, background: 'white', borderRadius: 3, cursor: 'nwse-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-arrows-alt" style={{ fontSize: 10, color: '#333' }} />
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}><i className="fas fa-upload"></i>Upload<input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} /></label>
            <button type="button" className="btn btn-secondary" onClick={toggleFacing} title="Flip camera"><i className="fas fa-sync"></i>Flip</button>
            <button onClick={capture} className="btn btn-primary"><i className="fas fa-camera"></i>Capture</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentModal() {
  const { docViewer, setDocViewer } = useApp();
  if (!docViewer || !docViewer.open) return null;
  const { url, name } = docViewer;
  const s = String(url || '').toLowerCase();
  const isImage = s.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s);
  const isPdf = s.startsWith('data:application/pdf') || s.endsWith('.pdf') || /\.pdf(\?|$)/i.test(s);

  return (
    <div className="modal-overlay" onClick={() => setDocViewer({ open: false, url: '', name: '' })}>
      <div className="modal-box" style={{ maxWidth: '950px', width: '94%' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>{name || 'Document'}</h3>
          <button onClick={() => setDocViewer({ open: false, url: '', name: '' })} className="btn btn-secondary btn-icon" style={{ width: '36px', height: '36px' }}><i className="fas fa-times"></i></button>
        </div>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {isImage ? (
            <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
          ) : isPdf ? (
            <iframe title={name || 'pdf'} src={url} style={{ width: '100%', height: '80vh', border: 0 }} />
          ) : url ? (
            <div>
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary">Open Document in New Tab</a>
            </div>
          ) : (
            <div style={{ color: 'var(--fg3)' }}>No preview available</div>
          )}
        </div>
      </div>
    </div>
  );
}
