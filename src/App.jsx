import { AppProvider, useApp, calcAge, getLevelLabel, packStatus, entryStatus, toggleStudentPackStatus, formatStudentCode } from './AppContext';
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Register from './components/Register';
import Settings from './components/Settings';
import { ToastContainer, CameraModal, DocumentModal } from './components/Modals';

function StudentDetail({ studentId, onBack }) {
  const { students, updateStudent, deleteStudent, showToast, setEditingId, setCurrentView, setDocViewer } = useApp();
  const student = students.find((item) => item.id === studentId);

  if (!student) {
    return (
      <div className="fade-in">
        <div style={{ marginBottom: '20px' }}>
          <button onClick={onBack} className="btn btn-secondary btn-sm no-print">
            <i className="fas fa-arrow-left"></i> Back to List
          </button>
        </div>
        <div className="card">
          <h2 style={{ fontSize: '22px' }}>Student Not Found</h2>
          <p style={{ color: 'var(--fg3)', marginTop: '10px' }}>
            This student record is missing or may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  const status = packStatus(student);
  const age = calcAge(student.dob);
  const packHistory = [...(student.packHistory || [])].sort((a, b) => (b.year || 0) - (a.year || 0));
  const displayPackHistory =
    packHistory.length > 0
      ? packHistory
      : student.packYear
        ? [{ year: student.packYear, items: { bag: false, uniforms: false, books: false }, fromPackYear: true }]
        : [];

  const openEdit = () => {
    setEditingId(student.id);
    setCurrentView('register');
    onBack();
  };

  const handleToggleStatus = () => {
    const updatedStudent = toggleStudentPackStatus(student);
    updateStudent(student.id, updatedStudent, () => {
      showToast(status === 'complete' ? 'Status changed to pending' : 'Status changed to complete');
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete ${student.name}? This action cannot be undone.`);
    if (!confirmed) return;

    deleteStudent(student.id, () => {
      showToast('Student deleted successfully');
      onBack();
    });
  };

  const badgeClass =
    status === 'complete' ? 'badge-success' : status === 'partial' ? 'badge-warn' : 'badge-info';
  const badgeText = status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Pending';
  const genderText = student.gender === 'Male' ? 'ប្រុស' : student.gender === 'Female' ? 'ស្រី' : student.gender;
  const studentTypeText = student.studentType === 'New' ? 'សិស្ស ថ្មី' : student.studentType === 'Old' ? 'សិស្ស ចាស់' : student.studentType;

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <button onClick={onBack} className="btn btn-secondary btn-sm no-print">
          <i className="fas fa-arrow-left"></i> Back to List
        </button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleDelete} className="btn btn-danger btn-sm no-print">
            <i className="fas fa-trash"></i> Delete Student
          </button>
          <button onClick={openEdit} className="btn btn-primary btn-sm no-print">
            <i className="fas fa-pen"></i> Edit Student
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
          gap: '16px',
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              className="student-photo"
              style={{ width: '110px', height: '110px', borderRadius: '20px', fontSize: '36px', marginBottom: '14px' }}
            >
              {student.photo ? <img src={student.photo} alt={student.name} /> : <i className="fas fa-user"></i>}
            </div>
            <h2 style={{ fontSize: '24px' }}>{student.name}</h2>
            <p style={{ color: 'var(--accent)', marginTop: '6px', fontWeight: 700 }}>
              {student.studentCode || formatStudentCode(student.id)}
            </p>
            <p style={{ color: 'var(--fg3)', marginTop: '6px' }}>
              ថ្នាក់ទី {student.grade} • {getLevelLabel(student.grade)} • អាយុ {age}
            </p>
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className={`badge ${badgeClass}`}
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={handleToggleStatus}
              >
                {badgeText}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>សាលារៀន</div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.school || 'N/A'}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>តួនាទី</div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.rolePosition || 'N/A'}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ព្រះវិហារ/ក្រុមជំនុំ</div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.church || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>ព័ត៌មានសិស្ស</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>អត្តលេខសិស្ស</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.studentCode || formatStudentCode(student.id)}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ភេទ</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{genderText || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ថ្ងៃខែឆ្នាំកំណើត</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.dob || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>លេខទូរស័ព្ទផ្ទាល់ខ្លួន</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.phone || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>អាស័យដ្ឋាន</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.address || 'N/A'}</div>
              </div>
            </div>
            {student.documents && student.documents.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '12px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Attached Documents</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {student.documents.map((doc, i) => (
                    <div key={i} style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      {doc.url && String(doc.url).startsWith('data:image') ? (
                        <button type="button" onClick={() => setDocViewer({ open: true, url: doc.url, name: doc.name })} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}>
                          <img src={doc.url} alt={doc.name} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setDocViewer({ open: true, url: doc.url, name: doc.name })} style={{ display: 'flex', width: 120, height: 80, alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                        </button>
                      )}
                      <button type="button" onClick={() => setDocViewer({ open: true, url: doc.url, name: doc.name })} style={{ fontSize: 12, color: 'var(--fg3)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', background: 'transparent', border: 0, cursor: 'pointer' }}>{doc.name}</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>គ្រួសារ និង គោលដៅ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ក្តីស្រមៃថ្ងៃអនាគត</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.futureGoal || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>សិស្ស ថ្មី/ចាស់</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{studentTypeText || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ថ្ងៃទទួលជឿព្រះ</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.conversionDate || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ថ្ងៃទទួលពិធីជ្រមុជទឹក</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.baptismDate || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ឈ្មោះឪពុក</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.fatherName || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>លេខទូរស័ព្ទឪពុក</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.fatherPhone || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>ឈ្មោះម្តាយ</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.motherName || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>លេខទូរស័ព្ទម្តាយ</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.motherPhone || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>អាណាព្យាបាល</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.guardianName || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', textTransform: 'uppercase', fontWeight: 600 }}>លេខទូរស័ព្ទអាណាព្យាបាល</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>{student.guardianPhone || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Pack History</h3>
            {displayPackHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <i className="fas fa-box-open"></i>
                <p>No pack distribution history yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {displayPackHistory.map((entry) => {
                  const state = entryStatus(entry.items || {});
                  const entryBadgeClass =
                    state === 'complete' ? 'badge-success' : state === 'partial' ? 'badge-warn' : 'badge-info';
                  const entryBadgeText = state === 'complete' ? 'Complete' : state === 'partial' ? 'Partial' : 'Pending';

                  return (
                    <div
                      key={`${student.id}-${entry.year}`}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '14px',
                        background: 'var(--bg3)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>Year {entry.year}</div>
                        <button
                          type="button"
                          className={`badge ${entryBadgeClass}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={handleToggleStatus}
                        >
                          {entryBadgeText}
                        </button>
                      </div>
                      <div style={{ color: 'var(--fg2)', fontSize: '13px' }}>
                        School pack received in {entry.year}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentView, setCurrentView } = useApp();
  const [detailId, setDetailId] = useState(null);
  const [prevView, setPrevView] = useState(null);

  const handleNavigate = (view) => {
    setDetailId(null);
    setPrevView(null);
    setCurrentView(view);
  };

  const openStudentDetail = (id) => {
    // remember where we came from so Back can restore it
    setPrevView(currentView);
    setDetailId(id);
  };

  const renderView = () => {
    if (detailId) return <StudentDetail studentId={detailId} onBack={() => { setDetailId(null); setPrevView(null); }} />;
    switch (currentView) {
      case 'dashboard': return <Dashboard onViewDetail={openStudentDetail} />;
      case 'students': return <Students onViewDetail={openStudentDetail} />;
      case 'register': return <Register />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="main-wrap">
      <Layout activeView={detailId ? (prevView || 'students') : currentView} onNavigate={handleNavigate} />
      <main className="main-content">
        <div className="container">
          {renderView()}
        </div>
      </main>
      <CameraModal />
      <DocumentModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
