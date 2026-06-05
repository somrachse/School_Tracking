import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';

const CAMBODIA_ADDRESS_OPTIONS = [
  'ភ្នំពេញ',
  'បន្ទាយមានជ័យ',
  'បាត់ដំបង',
  'កំពង់ចាម',
  'កំពង់ឆ្នាំង',
  'កំពង់ស្ពឺ',
  'កំពង់ធំ',
  'កំពត',
  'កណ្តាល',
  'កែប',
  'កោះកុង',
  'ក្រចេះ',
  'មណ្ឌលគិរី',
  'ឧត្ដរមានជ័យ',
  'ប៉ៃលិន',
  'ព្រះវិហារ',
  'ព្រៃវែង',
  'ពោធិ៍សាត់',
  'រតនៈគិរី',
  'សៀមរាប',
  'ព្រះសីហនុ',
  'ស្ទឹងត្រែង',
  'ស្វាយរៀង',
  'តាកែវ',
  'ត្បូងឃ្មុំ',
];

export default function Register() {
  const { students, addStudent, updateStudent, settings, editingId, setEditingId, setCurrentView, currentPhoto, setCurrentPhoto, setCurrentDocs, currentDocs, setCameraModal, setCameraTarget, showToast, setDocViewer } = useApp();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: '',
    dob: '',
    gender: '',
    grade: '',
    school: '',
    phone: '',
    ministry: '',
    church: '',
    address: '',
    futureGoal: '',
    rolePosition: '',
    studentType: '',
    conversionDate: '',
    baptismDate: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    guardianName: '',
    guardianPhone: '',
    packYear: new Date().getFullYear().toString()
  });
  const [studentLookup, setStudentLookup] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState(null);
  const [showLookupSuggestions, setShowLookupSuggestions] = useState(false);

  const buildFormFromStudent = (student, yearOverride) => ({
    name: student.name,
    dob: student.dob,
    gender: student.gender,
    grade: student.grade,
    school: student.school,
    phone: student.phone || '',
    ministry: student.ministry,
    church: student.church || '',
    address: student.address || '',
    futureGoal: student.futureGoal || '',
    rolePosition: student.rolePosition || '',
    studentType: student.studentType || '',
    conversionDate: student.conversionDate || '',
    baptismDate: student.baptismDate || '',
    fatherName: student.fatherName || '',
    fatherPhone: student.fatherPhone || '',
    motherName: student.motherName || '',
    motherPhone: student.motherPhone || '',
    guardianName: student.guardianName || '',
    guardianPhone: student.guardianPhone || '',
    packYear: String(yearOverride ?? student.packYear ?? currentYear),
  });

  const emptyForm = () => ({
    name: '',
    dob: '',
    gender: '',
    grade: '',
    school: '',
    phone: '',
    ministry: '',
    church: '',
    address: '',
    futureGoal: '',
    rolePosition: '',
    studentType: '',
    conversionDate: '',
    baptismDate: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    guardianName: '',
    guardianPhone: '',
    packYear: String(currentYear),
  });

  useEffect(() => {
    if (editingId) {
      const s = students.find(st => st.id === editingId);
      if (s) {
        setForm(buildFormFromStudent(s));
        setStudentLookup('');
        setSelectedExistingId(null);
        setCurrentPhoto(s.photo || '');
      }
    } else {
      setForm(emptyForm());
      setStudentLookup('');
      setSelectedExistingId(null);
      setCurrentPhoto('');
    }
  }, [editingId]);

  const loadExistingStudent = (lookupValue) => {
    const normalizedLookup = lookupValue.trim().toLowerCase();
    if (!normalizedLookup) {
      setSelectedExistingId(null);
      return;
    }

    const matchedStudent = students.find((student) => student.name.trim().toLowerCase() === normalizedLookup);
    if (!matchedStudent) return;

    const suggestedYear = Math.max(currentYear, (Number(matchedStudent.packYear) || currentYear) + 1);
    setSelectedExistingId(matchedStudent.id);
    setForm(buildFormFromStudent(matchedStudent, suggestedYear));
    setCurrentPhoto(matchedStudent.photo || '');
    showToast(`Loaded ${matchedStudent.name}`);
  };

  const selectExistingStudent = (student) => {
    setStudentLookup(student.name);
    setShowLookupSuggestions(false);
    loadExistingStudent(student.name);
  };

  const lookupText = studentLookup.trim().toLowerCase();
  const lookupSuggestions = lookupText
    ? students
        .filter((student) => student.name.trim().toLowerCase().includes(lookupText))
        .slice(0, 6)
    : [];

  const buildPackHistoryForYear = (existingHistory, year) => {
    const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    if (!history.some((entry) => Number(entry.year) === Number(year))) {
      history.push({ year, items: { bag: false, uniforms: false, books: false } });
    }
    return history;
  };

  const removeDoc = (index) => {
    setCurrentDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCurrentDocs((prev) => [...prev, { name: f.name, dataUrl: ev.target.result }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedPackYear = parseInt(form.packYear, 10);
    if (Number.isNaN(parsedPackYear)) {
      showToast('Pack year is invalid', 'error');
      return;
    }
    const parsedGrade = parseInt(form.grade, 10);
    if (Number.isNaN(parsedGrade)) {
      showToast('Please select a valid grade', 'error');
      return;
    }

    if (editingId) {
      const student = students.find((item) => item.id === editingId);
      if (!student) {
        showToast('Student not found', 'error');
        return;
      }

      const payload = {
        ...student,
        ...form,
        grade: parsedGrade,
        packYear: parsedPackYear,
        photo: currentPhoto,
        documents: currentDocs,
        packHistory: buildPackHistoryForYear(student.packHistory, parsedPackYear),
      };

      updateStudent(editingId, payload, () => {
        showToast('Student updated successfully');
        setEditingId(null);
        setCurrentView('students');
      });
    } else if (selectedExistingId) {
      const student = students.find((item) => item.id === selectedExistingId);
      if (!student) {
        showToast('Student not found', 'error');
        return;
      }

      const payload = {
        ...student,
        ...form,
        grade: parsedGrade,
        packYear: parsedPackYear,
        photo: currentPhoto,
        documents: currentDocs,
        packHistory: buildPackHistoryForYear(student.packHistory, parsedPackYear),
      };

      updateStudent(selectedExistingId, payload, () => {
        showToast('Existing student updated for new pack year');
        setForm(emptyForm());
        setStudentLookup('');
        setSelectedExistingId(null);
        setCurrentPhoto('');
      });
    } else {
      const newStudent = {
        ...form, grade: parsedGrade, packYear: parsedPackYear, photo: currentPhoto, documents: currentDocs,
        packHistory: [{ year: parsedPackYear, items: { bag: false, uniforms: false, books: false } }],
      };

      addStudent(newStudent, () => {
        showToast('Student registered successfully');
        setForm(emptyForm());
        setStudentLookup('');
        setSelectedExistingId(null);
        setCurrentPhoto('');
        setCurrentDocs([]);
      });
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '22px' }}>{editingId ? 'Edit Student' : 'Register Student'}</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>{editingId ? `Editing: ${form.name}` : 'Fill in the student details below'}</p></div>
      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px', width: '100%', maxWidth: '1200px' }}>
        {!editingId ? (
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label className="field-label">Find Existing Student</label>
            <input
              type="text"
              className="input-field"
              placeholder="Search student name to auto fill all fields"
              value={studentLookup}
              onChange={(e) => {
                setStudentLookup(e.target.value);
                setSelectedExistingId(null);
                setShowLookupSuggestions(Boolean(e.target.value.trim()));
              }}
              onFocus={() => setShowLookupSuggestions(Boolean(studentLookup.trim()))}
              onBlur={() => {
                setTimeout(() => {
                  setShowLookupSuggestions(false);
                  loadExistingStudent(studentLookup);
                }, 120);
              }}
            />
            {showLookupSuggestions && lookupSuggestions.length > 0 ? (
              <div className="lookup-suggestions">
                {lookupSuggestions.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="lookup-suggestion"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectExistingStudent(student);
                    }}
                  >
                    <span>{student.name}</span>
                    <small>{student.school || 'No school'} • Grade {student.grade || '-'}</small>
                  </button>
                ))}
              </div>
            ) : null}
            <p style={{ color: 'var(--fg3)', fontSize: '12px', marginTop: '8px' }}>
              Choose a student from the list to auto fill all details and save a new pack history year.
            </p>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', alignItems: 'start', gap: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="photo-preview" onClick={() => { setCameraTarget('photo'); setCameraModal(true); }} style={{ width: '120px', height: '120px' }}>
              {currentPhoto ? <img src={currentPhoto} alt="Photo" /> : <><i className="fas fa-camera" style={{ fontSize: '24px' }}></i><span>Add Photo</span></>}
            </div>
            {currentPhoto ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPhoto('')}>
                <i className="fas fa-trash"></i> Remove
              </button>
            ) : null}
              <div style={{ marginTop: 8, width: '120px', textAlign: 'center' }}>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fg3)' }}>Photo ID</div>
              </div>
          </div>
          <div>
            <div style={{ marginBottom: '12px' }}><label className="field-label">ឈ្មោះពេញ*</label><input type="text" className="input-field" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label className="field-label">ថ្ងៃខែឆ្នាំកំណើត *</label><input type="date" className="input-field" required value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} /></div>
              <div><label className="field-label">ភេទ *</label><select className="input-field" required value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option value="">ជ្រើសរើស</option><option value="Male">ប្រុស</option><option value="Female">ស្រី</option></select></div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">ថ្នាក់ *</label><select className="input-field" required value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}><option value=""></option>{Array.from({length: 12}, (_, i) => i + 1).map(g => <option key={g} value={g}>ថ្នាក់{g}</option>)}</select></div>
          <div><label className="field-label">សាលារៀន *</label><input type="text" className="input-field" required value={form.school} onChange={e => setForm({...form, school: e.target.value})} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">លេខទូរសព្ទផ្ទាល់ខ្លួន</label><input type="tel" className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label className="field-label">តួនាទី *</label><select className="input-field" required value={form.rolePosition} onChange={e => setForm({...form, rolePosition: e.target.value})}><option value="">Select Role / Position</option><option value="កុមារ">កុមារ</option><option value="យុវជន">យុវជន</option></select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label className="field-label">ព្រះវិហារ/ក្រុមជុំនំ</label>
            <select className="input-field" value={form.church} onChange={e => setForm({...form, church: e.target.value})}><option value="">Select Church</option>{settings.churches.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="field-label">អាស័យដ្ឋាន *</label>
            <select className="input-field" value={form.address} onChange={e => setForm({...form, address: e.target.value})}>
              <option value="">ជ្រើសរើសអាស័យដ្ឋាន</option>
              {CAMBODIA_ADDRESS_OPTIONS.map(address => <option key={address} value={address}>{address}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">ក្តីស្រមៃថ្ងៃនាគត</label><input type="text" className="input-field" value={form.futureGoal} onChange={e => setForm({...form, futureGoal: e.target.value})} /></div>
          <div><label className="field-label">សិស្ស ថ្មី/ចាស់</label><select className="input-field" value={form.studentType} onChange={e => setForm({...form, studentType: e.target.value})}><option value="">Select</option><option value="New">សិស្ស ថ្មី</option><option value="Old">សិស្ស ចាស់</option></select></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">ថ្ងៃទទួលជឿព្រះ</label><input type="date" className="input-field" value={form.conversionDate} onChange={e => setForm({...form, conversionDate: e.target.value})} /></div>
          <div><label className="field-label">ថ្ងៃទទួលពិធីជ្រមុជទឹក</label><input type="date" className="input-field" value={form.baptismDate} onChange={e => setForm({...form, baptismDate: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">ឈ្មោះឪពុក</label><input type="text" className="input-field" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} /></div>
          <div><label className="field-label">លេខទូរសព្ទ​ឪពុក</label><input type="tel" className="input-field" value={form.fatherPhone} onChange={e => setForm({...form, fatherPhone: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">ឈ្មោះម្តាយ</label><input type="text" className="input-field" value={form.motherName} onChange={e => setForm({...form, motherName: e.target.value})} /></div>
          <div><label className="field-label">លេខទូរសព្ទ​ម្តាយ</label><input type="tel" className="input-field" value={form.motherPhone} onChange={e => setForm({...form, motherPhone: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">អាណាព្យាបាល</label><input type="text" className="input-field" value={form.guardianName} onChange={e => setForm({...form, guardianName: e.target.value})} /></div>
          <div><label className="field-label">លេខទូរសព្ទ​អាណាព្យាបាល</label><input type="tel" className="input-field" value={form.guardianPhone} onChange={e => setForm({...form, guardianPhone: e.target.value})} /></div>
        </div>

        <div style={{ marginBottom: '24px', maxWidth: '220px' }}>
          <label className="field-label">ឆ្នាំទទួលកញ្ចប់សិក្សា *</label>
          <input
            type="number"
            className="input-field"
            min="2000"
            max="2100"
            required
            value={form.packYear}
            onChange={e => setForm({...form, packYear: e.target.value})}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Attached Documents</label>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <input type="file" id="docUpload" accept="image/*,application/pdf" style={{ display: 'none' }} multiple onChange={handleDocFiles} />
            <label htmlFor="docUpload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}><i className="fas fa-upload"></i> Add Document</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCameraTarget('document'); setCameraModal(true); }}><i className="fas fa-camera"></i> Scan</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: 8 }}>
                {currentDocs.length === 0 ? (
              <div style={{ color: 'var(--fg3)' }}>No documents attached</div>
            ) : currentDocs.map((doc, idx) => (
              <div key={idx} style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {doc.dataUrl && String(doc.dataUrl).startsWith('data:image') ? (
                  <button type="button" onClick={() => setDocViewer({ open: true, url: doc.dataUrl, name: doc.name })} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}>
                    <img src={doc.dataUrl} alt={doc.name} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  </button>
                ) : (
                  <button type="button" onClick={() => setDocViewer({ open: true, url: doc.dataUrl, name: doc.name })} style={{ width: 120, height: 120, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                  </button>
                )}
                <div style={{ fontSize: 12, color: 'var(--fg3)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{doc.name}</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeDoc(idx)}><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> {editingId ? 'Update Student' : selectedExistingId ? 'Save New Pack History Year' : 'Save Student'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setCurrentView('students'); }}><i className="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    </div>
  );
}
