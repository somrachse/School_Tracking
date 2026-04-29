import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';

const CAMBODIA_ADDRESS_OPTIONS = [
  'Phnom Penh',
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Oddar Meanchey',
  'Pailin',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Preah Sihanouk',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
];

export default function Register() {
  const { students, addStudent, updateStudent, settings, editingId, setEditingId, setCurrentView, currentPhoto, setCurrentPhoto, setCameraModal, showToast } = useApp();
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

    const suggestedYear = Math.max(currentYear, (matchedStudent.packYear || currentYear) + 1);
    setSelectedExistingId(matchedStudent.id);
    setForm(buildFormFromStudent(matchedStudent, suggestedYear));
    setCurrentPhoto(matchedStudent.photo || '');
    showToast(`Loaded ${matchedStudent.name}`);
  };

  const buildPackHistoryForYear = (existingHistory, year) => {
    const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    if (!history.some((entry) => Number(entry.year) === Number(year))) {
      history.push({ year, items: { bag: false, uniforms: false, books: false } });
    }
    return history;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedPackYear = parseInt(form.packYear, 10);
    if (Number.isNaN(parsedPackYear)) {
      showToast('Pack year is invalid', 'error');
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
        grade: parseInt(form.grade, 10),
        packYear: parsedPackYear,
        photo: currentPhoto,
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
        grade: parseInt(form.grade, 10),
        packYear: parsedPackYear,
        photo: currentPhoto,
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
        ...form, grade: parseInt(form.grade, 10), packYear: parsedPackYear, photo: currentPhoto,
        packHistory: [{ year: parsedPackYear, items: { bag: false, uniforms: false, books: false } }],
      };

      addStudent(newStudent, () => {
        showToast('Student registered successfully');
        setForm(emptyForm());
        setStudentLookup('');
        setSelectedExistingId(null);
        setCurrentPhoto('');
      });
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '22px' }}>{editingId ? 'Edit Student' : 'Register Student'}</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>{editingId ? `Editing: ${form.name}` : 'Fill in the student details below'}</p></div>
      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px', width: '100%', maxWidth: '1200px' }}>
        {!editingId ? (
          <div style={{ marginBottom: '20px' }}>
            <label className="field-label">Find Existing Student</label>
            <input
              type="text"
              className="input-field"
              list="student-name-list"
              placeholder="Search student name to auto fill all fields"
              value={studentLookup}
              onChange={(e) => {
                setStudentLookup(e.target.value);
                loadExistingStudent(e.target.value);
              }}
            />
            <datalist id="student-name-list">
              {students.map((student) => <option key={student.id} value={student.name} />)}
            </datalist>
            <p style={{ color: 'var(--fg3)', fontSize: '12px', marginTop: '8px' }}>
              Choose a student from the list to auto fill all details and save a new pack history year.
            </p>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', alignItems: 'start', gap: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="photo-preview" onClick={() => setCameraModal(true)} style={{ width: '120px', height: '120px' }}>
              {currentPhoto ? <img src={currentPhoto} alt="Photo" /> : <><i className="fas fa-camera" style={{ fontSize: '24px' }}></i><span>Add Photo</span></>}
            </div>
            {currentPhoto ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPhoto('')}>
                <i className="fas fa-trash"></i> Remove
              </button>
            ) : null}
          </div>
          <div>
            <div style={{ marginBottom: '12px' }}><label className="field-label">Full Name *</label><input type="text" className="input-field" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label className="field-label">Date of Birth *</label><input type="date" className="input-field" required value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} /></div>
              <div><label className="field-label">Gender *</label><select className="input-field" required value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Grade *</label><select className="input-field" required value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}><option value="">Select Grade</option>{Array.from({length: 12}, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}</select></div>
          <div><label className="field-label">School *</label><input type="text" className="input-field" required value={form.school} onChange={e => setForm({...form, school: e.target.value})} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Phone Number</label><input type="tel" className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label className="field-label">Ministry *</label><select className="input-field" required value={form.ministry} onChange={e => setForm({...form, ministry: e.target.value})}><option value="">Select Ministry</option>{settings.ministries.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Church</label><select className="input-field" value={form.church} onChange={e => setForm({...form, church: e.target.value})}><option value="">Select Church</option>{settings.churches.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div>
            <label className="field-label">Address</label>
            <input
              type="text"
              className="input-field"
              list="cambodia-addresses"
              placeholder="Choose or type city, province"
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
            />
            <datalist id="cambodia-addresses">
              {CAMBODIA_ADDRESS_OPTIONS.map(address => <option key={address} value={address} />)}
            </datalist>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Future Dream / Goal</label><input type="text" className="input-field" value={form.futureGoal} onChange={e => setForm({...form, futureGoal: e.target.value})} /></div>
          <div><label className="field-label">Role / Position</label><input type="text" className="input-field" value={form.rolePosition} onChange={e => setForm({...form, rolePosition: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Date of Conversion</label><input type="date" className="input-field" value={form.conversionDate} onChange={e => setForm({...form, conversionDate: e.target.value})} /></div>
          <div><label className="field-label">Date of Baptism</label><input type="date" className="input-field" value={form.baptismDate} onChange={e => setForm({...form, baptismDate: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Father's Name</label><input type="text" className="input-field" value={form.fatherName} onChange={e => setForm({...form, fatherName: e.target.value})} /></div>
          <div><label className="field-label">Father's Phone Number</label><input type="tel" className="input-field" value={form.fatherPhone} onChange={e => setForm({...form, fatherPhone: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Mother's Name</label><input type="text" className="input-field" value={form.motherName} onChange={e => setForm({...form, motherName: e.target.value})} /></div>
          <div><label className="field-label">Mother's Phone Number</label><input type="tel" className="input-field" value={form.motherPhone} onChange={e => setForm({...form, motherPhone: e.target.value})} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div><label className="field-label">Guardian</label><input type="text" className="input-field" value={form.guardianName} onChange={e => setForm({...form, guardianName: e.target.value})} /></div>
          <div><label className="field-label">Guardian's Phone Number</label><input type="tel" className="input-field" value={form.guardianPhone} onChange={e => setForm({...form, guardianPhone: e.target.value})} /></div>
        </div>

        <div style={{ marginBottom: '24px', maxWidth: '220px' }}>
          <label className="field-label">Pack History Year *</label>
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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> {editingId ? 'Update Student' : selectedExistingId ? 'Save New Pack History Year' : 'Save Student'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setCurrentView('students'); }}><i className="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    </div>
  );
}
