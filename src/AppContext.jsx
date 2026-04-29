import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const API_BASE_URL = 'http://localhost:5000';

const DEFAULT_MINISTRIES = ["Youth Ministry","Women's Ministry","Men's Ministry","Children's Ministry","Sunday School","Outreach Ministry","Worship Team"];
const DEFAULT_CHURCHES = ['Main Church','North Branch','South Branch','Community Center'];

export const formatStudentCode = (id) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return '';
  return `FFCC${String(Math.trunc(numericId)).padStart(4, '0')}`;
};

const normalizePackHistory = (value, fallbackYear) => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (fallbackYear) {
    return [{ year: fallbackYear, items: { bag: false, uniforms: false, books: false } }];
  }

  return [];
};

const normalizeStudent = (student) => ({
  ...student,
  grade: student.grade === null || student.grade === undefined ? '' : Number(student.grade),
  packYear: student.packYear === null || student.packYear === undefined ? '' : Number(student.packYear),
  packHistory: normalizePackHistory(student.packHistory, student.packYear),
  studentCode: student.studentCode || formatStudentCode(student.id),
});


export function AppProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState({ stock: 200, ministries: [...DEFAULT_MINISTRIES], churches: [...DEFAULT_CHURCHES] });
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState('');
  const [toasts, setToasts] = useState([]);

  // Modals
  const [cameraModal, setCameraModal] = useState(false);
  const [packModal, setPackModal] = useState({ open: false, studentId: null, editYear: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', msg: '', onConfirm: null });

  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.error?.sqlMessage || data?.error?.message || data?.error || 'Request failed');
    }

    return data;
  };

  // Fetch students from backend on mount
  useEffect(() => {
    apiRequest('/ministries')
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          ministries: data.map((item) => item.name),
        }));
      })
      .catch(() => {
        setSettings((prev) => ({ ...prev, ministries: [...DEFAULT_MINISTRIES] }));
        showToast('Failed to load ministries', 'error');
      });

    apiRequest('/churches')
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          churches: data.map((item) => item.name),
        }));
      })
      .catch(() => {
        setSettings((prev) => ({ ...prev, churches: [...DEFAULT_CHURCHES] }));
        showToast('Failed to load churches', 'error');
      });

    apiRequest('/students')
      .then(data => setStudents(data.map(normalizeStudent)))
      .catch(() => {
        setStudents([]);
        showToast('Failed to load students', 'error');
      });

    // Theme
    const theme = localStorage.getItem('spt_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Add student
  const addStudent = (student, cb) => {
    apiRequest('/students', {
      method: 'POST',
      body: JSON.stringify(student)
    })
      .then(newStudent => {
        const normalized = normalizeStudent(newStudent);
        setStudents(prev => [...prev, normalized]);
        if (cb) cb(normalized);
      })
      .catch((error) => showToast(error.message || 'Failed to add student', 'error'));
  };

  // Update student
  const updateStudent = (id, student, cb) => {
    apiRequest(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student)
    })
      .then(updated => {
        const normalized = normalizeStudent(updated);
        setStudents(prev => prev.map(s => String(s.id) === String(id) ? normalized : s));
        if (cb) cb(normalized);
      })
      .catch((error) => showToast(error.message || 'Failed to update student', 'error'));
  };

  // Delete student
  const deleteStudent = (id, cb) => {
    apiRequest(`/students/${id}`, { method: 'DELETE' })
      .then(() => {
        setStudents(prev => prev.filter(s => String(s.id) !== String(id)));
        if (cb) cb();
      })
      .catch((error) => showToast(error.message || 'Failed to delete student', 'error'));
  };

  const clearStudents = (cb) => {
    apiRequest('/students', { method: 'DELETE' })
      .then(() => {
        setStudents([]);
        if (cb) cb();
      })
      .catch((error) => showToast(error.message || 'Failed to clear students', 'error'));
  };

  const bulkAddStudents = (newStudents, cb) => {
    apiRequest('/students/bulk', {
      method: 'POST',
      body: JSON.stringify(newStudents)
    })
      .then((createdStudents) => {
        const normalized = createdStudents.map(normalizeStudent);
        setStudents(prev => [...prev, ...normalized]);
        if (cb) cb(normalized);
      })
      .catch((error) => showToast(error.message || 'Failed to import students', 'error'));
  };

  const addMinistry = (name, cb) => {
    apiRequest('/ministries', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
      .then((created) => {
        setSettings((prev) => ({
          ...prev,
          ministries: prev.ministries.includes(created.name)
            ? prev.ministries
            : [...prev.ministries, created.name].sort((a, b) => a.localeCompare(b)),
        }));
        if (cb) cb(created);
      })
      .catch((error) => showToast(error.message || 'Failed to add ministry', 'error'));
  };

  const removeMinistry = (name, cb) => {
    apiRequest(`/ministries/${encodeURIComponent(name)}`, { method: 'DELETE' })
      .then(() => {
        setSettings((prev) => ({
          ...prev,
          ministries: prev.ministries.filter((item) => item !== name),
        }));
        if (cb) cb();
      })
      .catch((error) => showToast(error.message || 'Failed to delete ministry', 'error'));
  };

  const addChurch = (name, cb) => {
    apiRequest('/churches', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
      .then((created) => {
        setSettings((prev) => ({
          ...prev,
          churches: prev.churches.includes(created.name)
            ? prev.churches
            : [...prev.churches, created.name].sort((a, b) => a.localeCompare(b)),
        }));
        if (cb) cb(created);
      })
      .catch((error) => showToast(error.message || 'Failed to add church', 'error'));
  };

  const removeChurch = (name, cb) => {
    apiRequest(`/churches/${encodeURIComponent(name)}`, { method: 'DELETE' })
      .then(() => {
        setSettings((prev) => ({
          ...prev,
          churches: prev.churches.filter((item) => item !== name),
        }));
        if (cb) cb();
      })
      .catch((error) => showToast(error.message || 'Failed to delete church', 'error'));
  };

  // Deprecated: saveStudents (use addStudent, updateStudent, deleteStudent)
  const saveStudents = (newStudents) => {
    setStudents(newStudents);
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('spt_settings', JSON.stringify(newSettings));
  };

  const toggleTheme = (isChecked) => {
    const theme = isChecked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spt_theme', theme);
  };


  return (
    <AppContext.Provider value={{
      students, saveStudents, addStudent, updateStudent, deleteStudent, clearStudents, bulkAddStudents,
      settings, saveSettings, addMinistry, removeMinistry, addChurch, removeChurch,
      currentView, setCurrentView, editingId, setEditingId,
      currentPhoto, setCurrentPhoto, toasts, showToast,
      cameraModal, setCameraModal, packModal, setPackModal,
      confirmModal, setConfirmModal, toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

export const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
export const calcAge = (dob) => { if (!dob) return '—'; const b = new Date(dob), t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
export const getLevel = (g) => parseInt(g) <= 6 ? 'primary' : 'high';
export const getLevelLabel = (g) => parseInt(g) <= 6 ? 'Primary' : 'High School';
export const getLatestItems = (s) => { const h = s.packHistory; if (!h || h.length === 0) return { bag: false, uniforms: false, books: false }; return h[h.length - 1].items; };
export const packStatus = (s) => { const it = getLatestItems(s); return it.bag && it.uniforms && it.books ? 'complete' : (it.bag || it.uniforms || it.books ? 'partial' : 'none'); };
export const entryStatus = (items) => items.bag && items.uniforms && items.books ? 'complete' : (items.bag || items.uniforms || items.books ? 'partial' : 'none');
export const toggleStudentPackStatus = (student) => {
  const nextItems =
    packStatus(student) === 'complete'
      ? { bag: false, uniforms: false, books: false }
      : { bag: true, uniforms: true, books: true };
  const packYear = student.packYear || new Date().getFullYear();
  const packHistory = [...(student.packHistory || [])];

  if (packHistory.length === 0) {
    return { ...student, packHistory: [{ year: packYear, items: nextItems }] };
  }

  const lastIndex = packHistory.length - 1;
  packHistory[lastIndex] = { ...packHistory[lastIndex], year: packHistory[lastIndex].year || packYear, items: nextItems };
  return { ...student, packHistory };
};
export const totalDistributions = (students = []) =>
  students.reduce((total, student) => total + (student.packHistory?.length || 0), 0);
export const completeDistributions = (students = []) =>
  students.reduce(
    (total, student) =>
      total +
      (student.packHistory?.filter(
        (entry) => entry.items?.bag && entry.items?.uniforms && entry.items?.books,
      ).length || 0),
    0,
  );
