import { useRef, useState, useEffect } from 'react';
import { useApp, calcAge, getLevel, packStatus, toggleStudentPackStatus, formatStudentCode } from '../AppContext';

const HEADER_ALIASES = {
  name: ['name', 'full name', 'student name'],
  dob: ['dob', 'date of birth', 'birth date'],
  gender: ['gender', 'sex'],
  grade: ['grade', 'class', 'grade level'],
  school: ['school', 'school name'],
  phone: ['phone', 'phone number', 'student phone'],
  ministry: ['ministry'],
  church: ['church'],
  address: ['address', 'city', 'province'],
  futureGoal: ['future goal', 'future dream', 'goal', 'future dream / goal'],
  rolePosition: ['role', 'position', 'role / position'],
  studentType: ['new / old', 'student type', 'type', 'new old'],
  conversionDate: ['conversion date', 'date of conversion'],
  baptismDate: ['baptism date', 'date of baptism'],
  fatherName: ["father's name", 'father name'],
  fatherPhone: ["father's phone number", 'father phone'],
  motherName: ["mother's name", 'mother name'],
  motherPhone: ["mother's phone number", 'mother phone'],
  guardianName: ['guardian', 'guardian name'],
  guardianPhone: ["guardian's phone number", 'guardian phone'],
  packYear: ['pack history year', 'pack year', 'year'],
  status: ['status', 'pack status'],
  bag: ['bag', 'bag given'],
  uniforms: ['uniform', 'uniforms', 'uniforms given'],
  books: ['book', 'books', 'books given'],
  photo: ['photo', 'photo url'],
};

const normalizeHeader = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
      row.push(value.trim());
      const hasContent = row.some((item) => item !== '');
      if (hasContent) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    const hasContent = row.some((item) => item !== '');
    if (hasContent) rows.push(row);
  }

  return rows;
};

const excelSerialToDate = (serialValue) => {
  const serial = Number(serialValue);
  if (!Number.isFinite(serial) || serial < 1) return '';
  const base = new Date(Date.UTC(1899, 11, 30));
  base.setUTCDate(base.getUTCDate() + Math.floor(serial));
  return base.toISOString().slice(0, 10);
};

const formatDateValue = (value) => {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return excelSerialToDate(raw);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const parseBoolean = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'done'].includes(normalized);
};

const parsePackItemsFromStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['complete', 'completed', 'done', 'received'].includes(normalized)) {
    return { bag: true, uniforms: true, books: true };
  }
  if (['pending', 'none', 'not complete', 'incomplete', 'no'].includes(normalized)) {
    return { bag: false, uniforms: false, books: false };
  }
  return null;
};

const getRowValue = (rowMap, key) => {
  const aliases = HEADER_ALIASES[key] || [];
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(rowMap, normalizedAlias)) {
      return rowMap[normalizedAlias];
    }
  }
  return '';
};

const hasRowValue = (rowMap, key) => String(getRowValue(rowMap, key) || '').trim() !== '';

export default function Students({ onViewDetail }) {
  const { students, settings, updateStudent, bulkAddStudents, showToast, deleteStudent, setEditingId, setCurrentView } = useApp();
  const [search, setSearch] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [filterLvl, setFilterLvl] = useState('');
  const [filterGen, setFilterGen] = useState('');
  const [filterPackYear, setFilterPackYear] = useState('');
  const [sortBy, setSortBy] = useState('');
  const importInputRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const packYears = Array.from(
    new Set(
      students.flatMap((student) => {
        if (Array.isArray(student.packHistory) && student.packHistory.length > 0) {
          return student.packHistory.map((entry) => String(entry.year)).filter(Boolean);
        }
        if (student.packYear) return [String(student.packYear)];
        return [];
      }),
    ),
  ).sort((a, b) => Number(b) - Number(a));

  const filtered = students.filter(s => {
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !(s.phone || '').includes(search) &&
      !(s.student_id || formatStudentCode(s.id)).toLowerCase().includes(search.toLowerCase())
    ) return false;
    if (filterChurch && s.church !== filterChurch) return false;
    if (filterLvl && getLevel(s.grade) !== filterLvl) return false;
    if (filterGen && s.gender !== filterGen) return false;
    if (filterPackYear) {
      const years = Array.isArray(s.packHistory) && s.packHistory.length > 0
        ? s.packHistory.map((entry) => String(entry.year))
        : [String(s.packYear || '')];
      if (!years.includes(filterPackYear)) return false;
    }
    return true;
  });

  const downloadFile = (content, filename, type) => {
    let payload = content;
    // Ensure CSVs have a UTF-8 BOM so Excel on Windows detects UTF-8 encoding
    if (typeof payload === 'string' && ((type || '').toLowerCase().includes('csv') || (filename || '').toLowerCase().endsWith('.csv'))) {
      payload = '\uFEFF' + payload;
    }

    const blob = new Blob([payload], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sorted = (() => {
    const copy = [...filtered];
    if (sortBy === 'az') return copy.sort((a, b) => (String(a.name || '')).localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    if (sortBy === 'za') return copy.sort((a, b) => (String(b.name || '')).localeCompare(String(a.name || ''), undefined, { sensitivity: 'base' }));
    return copy;
  })();
  const visibleIds = sorted.map((student) => String(student.id));
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(String(id)));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(String(id)));

  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const exportExcel = () => {
    if (filtered.length === 0) {
      showToast('No student data to export', 'error');
      return;
    }

    const rows = [
      [
        'អត្តលេខសិស្ស',
        'ឈ្មោះពេញ',
        'អាយុ',
        'ថ្ងៃខែឆ្នាំកំណើត',
        'ភេទ',
        'ថ្នាក់',
        'សាលារៀន',
        'ព្រះវិហារ/ក្រុមជំនុំ',
        'អាស័យដ្ឋាន',
        'ក្តីស្រមៃថ្ងៃអនាគត',
        'តួនាទី',
        'ថ្ងៃទទួលជឿព្រះ',
        'ថ្ងៃទទួលពិធីជ្រមុជទឹក',
        'ឈ្មោះឪពុក',
        'លេខទូរស័ព្ទឪពុក',
        'ឈ្មោះម្តាយ',
        'លេខទូរស័ព្ទម្តាយ',
        'អាណាព្យាបាល',
        'លេខទូរស័ព្ទអាណាព្យាបាល',
        'សិស្ស ថ្មី/ចាស់',
      ],
      ...filtered.map((student) => [
        student.student_id || formatStudentCode(student.id), // Prefer backend student_id, then formatted id
        student.name || '',
        calcAge(student.dob),
        student.dob || '',
        student.gender === 'Male' ? 'ប្រុស' : student.gender === 'Female' ? 'ស្រី' : student.gender || '',
        student.grade || '',
        student.school || '',
        student.church || '',
        student.address || '',
        student.futureGoal || '',
        student.rolePosition || '',
        student.conversionDate || '',
        student.baptismDate || '',
        student.fatherName || '',
        student.fatherPhone || '',
        student.motherName || '',
        student.motherPhone || '',
        student.guardianName || '',
        student.guardianPhone || '',
        student.studentType === 'New' ? 'សិស្ស ថ្មី' : student.studentType === 'Old' ? 'សិស្ស ចាស់' : student.studentType || '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => csvCell(value)).join(','),
      )
      .join('\n');

    downloadFile(csv, 'students-report.csv', 'text/csv;charset=utf-8;');
    showToast('Excel export downloaded');
  };

  const exportPdfReport = () => {
    if (filtered.length === 0) {
      showToast('No student data to export', 'error');
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) {
      showToast('Allow popups to open the PDF report', 'error');
      return;
    }

    const rows = filtered
      .map((student, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${student.name || ''}</td>
            <td>${calcAge(student.dob)}</td>
            <td>${student.gender || ''}</td>
            <td>${student.grade || ''}</td>
            <td>${student.school || ''}</td>
          </tr>
        `;
      })
      .join('');

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Students PDF Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 20px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
            @media print { body { margin: 12px; } }
          </style>
        </head>
        <body>
          <h1>Student Report</h1>
          <p>Total records: ${filtered.length}</p>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>School</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    showToast('PDF report opened');
  };

  const downloadImportTemplate = () => {
    const headers = [
      'Full Name',
      'Date of Birth',
      'Gender',
      'Grade',
      'School',
      'Phone Number',
      'Role / Position',
      'Church',
      'Address',
      'Future Dream / Goal',
      'New / Old',
      'Date of Conversion',
      'Date of Baptism',
      "Father's Name",
      "Father's Phone Number",
      "Mother's Name",
      "Mother's Phone Number",
      'Guardian',
      "Guardian's Phone Number",
      'Pack History Year',
      'Status',
      'Bag',
      'Uniforms',
      'Books',
      'Photo URL',
    ];

    const sample = [
      'Sample Student',
      '2012-02-18',
      'Female',
      '7',
      'Phnom Penh High School',
      '012345678',
      'Member',
      'Main Church',
      'Phnom Penh',
      'Teacher',
      'New',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      String(new Date().getFullYear()),
      'Pending',
      'No',
      'No',
      'No',
      '',
    ];

    const csv = [headers, sample]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(csv, 'students-import-template.csv', 'text/csv;charset=utf-8;');
    showToast('Template downloaded');
  };

  const mapCsvRowsToStudents = (rows) => {
    if (!rows.length) return { validStudents: [], errors: ['File is empty'] };

    const headers = rows[0].map((header) => normalizeHeader(header));
    const validStudents = [];
    const errors = [];
    const currentYear = new Date().getFullYear();

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowMap = {};

      headers.forEach((header, index) => {
        rowMap[header] = row[index] ?? '';
      });

      const name = String(getRowValue(rowMap, 'name') || '').trim();
      const dob = formatDateValue(getRowValue(rowMap, 'dob'));
      const genderRaw = String(getRowValue(rowMap, 'gender') || '').trim().toLowerCase();
      const gender =
        genderRaw === 'm' || genderRaw === 'male' ? 'Male' : genderRaw === 'f' || genderRaw === 'female' ? 'Female' : '';
      const grade = Number.parseInt(String(getRowValue(rowMap, 'grade') || '').trim(), 10);
      const school = String(getRowValue(rowMap, 'school') || '').trim();
      const rolePosition = String(getRowValue(rowMap, 'rolePosition') || '').trim();
      const packYearRaw = Number.parseInt(String(getRowValue(rowMap, 'packYear') || '').trim(), 10);
      const packYear = Number.isNaN(packYearRaw) ? currentYear : packYearRaw;
      const statusItems = parsePackItemsFromStatus(getRowValue(rowMap, 'status'));
      const hasItemColumns =
        hasRowValue(rowMap, 'bag') ||
        hasRowValue(rowMap, 'uniforms') ||
        hasRowValue(rowMap, 'books');
      const packItems = hasItemColumns
        ? {
            bag: parseBoolean(getRowValue(rowMap, 'bag')),
            uniforms: parseBoolean(getRowValue(rowMap, 'uniforms')),
            books: parseBoolean(getRowValue(rowMap, 'books')),
          }
        : statusItems || { bag: false, uniforms: false, books: false };

      if (!name || !dob || !gender || Number.isNaN(grade) || !school || !rolePosition) {
        errors.push(`Row ${i + 1}: missing required data (name, dob, gender, grade, school, role / position).`);
        continue;
      }

      validStudents.push({
        name,
        dob,
        gender,
        grade,
        school,
        phone: String(getRowValue(rowMap, 'phone') || '').trim(),
        ministry: String(getRowValue(rowMap, 'ministry') || '').trim(),
        church: String(getRowValue(rowMap, 'church') || '').trim(),
        address: String(getRowValue(rowMap, 'address') || '').trim(),
        futureGoal: String(getRowValue(rowMap, 'futureGoal') || '').trim(),
        rolePosition,
        studentType: String(getRowValue(rowMap, 'studentType') || '').trim(),
        conversionDate: formatDateValue(getRowValue(rowMap, 'conversionDate')),
        baptismDate: formatDateValue(getRowValue(rowMap, 'baptismDate')),
        fatherName: String(getRowValue(rowMap, 'fatherName') || '').trim(),
        fatherPhone: String(getRowValue(rowMap, 'fatherPhone') || '').trim(),
        motherName: String(getRowValue(rowMap, 'motherName') || '').trim(),
        motherPhone: String(getRowValue(rowMap, 'motherPhone') || '').trim(),
        guardianName: String(getRowValue(rowMap, 'guardianName') || '').trim(),
        guardianPhone: String(getRowValue(rowMap, 'guardianPhone') || '').trim(),
        photo: String(getRowValue(rowMap, 'photo') || '').trim(),
        packYear,
        packHistory: [
          {
            year: packYear,
            items: packItems,
          },
        ],
      });
    }

    return { validStudents, errors };
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv') {
      showToast('Please upload CSV from Excel (Save As > CSV)', 'error');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const { validStudents, errors } = mapCsvRowsToStudents(rows);

      if (validStudents.length === 0) {
        showToast(errors[0] || 'No valid rows found for import', 'error');
        event.target.value = '';
        return;
      }

      bulkAddStudents(validStudents, () => {
        if (errors.length > 0) {
          showToast(`Imported ${validStudents.length}. Skipped ${errors.length} invalid row(s).`, 'info');
        } else {
          showToast(`Imported ${validStudents.length} students successfully`);
        }
      });
    } catch {
      showToast('Failed to read import file', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleToggleStatus = (event, student) => {
    event.stopPropagation();
    const updatedStudent = toggleStudentPackStatus(student);
    updateStudent(student.id, updatedStudent, () => {
      showToast(packStatus(student) === 'complete' ? 'Status changed to pending' : 'Status changed to complete');
    });
  };

  const openEdit = (student) => {
    setEditingId(student.id);
    setCurrentView('register');
    setOpenMenuId(null);
  };

  const handleDelete = (student) => {
    const confirmed = window.confirm(`Delete ${student.name}? This action cannot be undone.`);
    if (!confirmed) return;
    deleteStudent(student.id, () => {
      showToast('Student deleted');
    });
    setOpenMenuId(null);
  };

  const setStudentPackStatus = (student, isComplete) => {
    const packYear = student.packYear || new Date().getFullYear();
    const packHistory = [...(student.packHistory || [])];
    const items = isComplete
      ? { bag: true, uniforms: true, books: true }
      : { bag: false, uniforms: false, books: false };

    if (packHistory.length === 0) {
      return { ...student, packYear, packHistory: [{ year: packYear, items }] };
    }

    const lastIndex = packHistory.length - 1;
    packHistory[lastIndex] = {
      ...packHistory[lastIndex],
      year: packHistory[lastIndex].year || packYear,
      items,
    };

    return { ...student, packYear, packHistory };
  };

  const toggleSelected = (event, studentId) => {
    event.stopPropagation();
    const id = String(studentId);
    setSelectedIds((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };

  const toggleSelectAllVisible = (event) => {
    event.stopPropagation();
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(String(id)));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBulkStatus = (isComplete) => {
    const selectedStudents = students.filter((student) => selectedVisibleIds.includes(String(student.id)));
    if (selectedStudents.length === 0) return;

    let finished = 0;
    selectedStudents.forEach((student) => {
      updateStudent(student.id, setStudentPackStatus(student, isComplete), () => {
        finished += 1;
        if (finished === selectedStudents.length) {
          showToast(`${selectedStudents.length} student(s) changed to ${isComplete ? 'Complete' : 'Pending'}`);
          setSelectedIds([]);
        }
      });
    });
  };

  const handleBulkDelete = () => {
    const selectedStudents = students.filter((student) => selectedVisibleIds.includes(String(student.id)));
    if (selectedStudents.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedStudents.length} selected student(s)? This action cannot be undone.`);
    if (!confirmed) return;

    let finished = 0;
    selectedStudents.forEach((student) => {
      deleteStudent(student.id, () => {
        finished += 1;
        if (finished === selectedStudents.length) {
          showToast(`${selectedStudents.length} student(s) deleted`);
          setSelectedIds([]);
        }
      });
    });
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest('[data-menu]') && !e.target.closest('[data-menu-trigger]')) setOpenMenuId(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenuId(null); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => students.some((student) => String(student.id) === String(id))));
  }, [students]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
        <div><h2 style={{ fontSize: '22px' }}>Students</h2><p style={{ color: 'var(--fg2)', fontSize: '14px' }}>{filtered.length} records</p></div>
        <div style={{ display: 'flex', gap: '8px' }} className="no-print">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button onClick={() => importInputRef.current?.click()} className="btn btn-secondary btn-sm">
            <i className="fas fa-file-import"></i>Import
          </button>
          <button onClick={downloadImportTemplate} className="btn btn-secondary btn-sm">
            <i className="fas fa-download"></i>Template
          </button>
          <button onClick={exportExcel} className="btn btn-secondary btn-sm"><i className="fas fa-file-excel"></i>Excel</button>
          <button onClick={exportPdfReport} className="btn btn-secondary btn-sm"><i className="fas fa-file-pdf"></i>PDF Report</button>
        </div>
      </div>
      
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg3)', fontSize: '13px' }}></i>
          <input type="text" className="input-field" style={{ paddingLeft: '36px' }} placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: '130px' }} value={filterChurch} onChange={e => setFilterChurch(e.target.value)}>
          <option value="">All Churches</option>
          {settings.churches.map(church => <option key={church} value={church}>{church}</option>)}
        </select>
        <select className="input-field" style={{ width: 'auto', minWidth: '130px' }} value={filterLvl} onChange={e => setFilterLvl(e.target.value)}>
          <option value="">All Levels</option><option value="primary">Primary (1-6)</option><option value="high">High School (7-12)</option>
        </select>
        <select className="input-field" style={{ width: 'auto', minWidth: '110px' }} value={filterGen} onChange={e => setFilterGen(e.target.value)}>
          <option value="">All Genders</option><option value="Male">Male</option><option value="Female">Female</option>
        </select>
        <select className="input-field" style={{ width: 'auto', minWidth: '130px' }} value={filterPackYear} onChange={e => setFilterPackYear(e.target.value)}>
          <option value="">All Pack Years</option>
          {packYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <select className="input-field" style={{ width: 'auto', minWidth: '140px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="">Sort</option>
          <option value="az">A - Z</option>
          <option value="za">Z - A</option>
        </select>
      </div>

      {selectedVisibleIds.length > 0 ? (
        <div className="bulk-actions no-print">
          <strong>{selectedVisibleIds.length} selected</strong>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleBulkStatus(true)}>
            <i className="fas fa-check"></i>Complete
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleBulkStatus(false)}>
            <i className="fas fa-clock"></i>Pending
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            <i className="fas fa-trash"></i>Delete
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="card" style={{ padding: '8px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><i className="fas fa-search"></i><p>No students match your filters</p></div>
        ) : (
          <div className="students-table">
            <div className="student-header">
              <div className="student-col student-select">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible students"
                />
              </div>
              <div className="student-col student-id">Student ID</div>
              <div className="student-col student-name">Full Name</div>
              <div className="student-col student-gender">Gender</div>
              <div className="student-col student-age">Age</div>
              <div className="student-col student-grade">Grade</div>
              <div className="student-col student-status">Status</div>
              <div className="student-col student-actions" aria-hidden="true"></div>
            </div>

            {sorted.map((s) => {
              const age = calcAge(s.dob);
              const st = packStatus(s);
              const isSelected = selectedIds.includes(String(s.id));
              return (
                <div key={s.id} className={`student-row ${isSelected ? 'selected' : ''}`} onClick={() => onViewDetail(s.id)}>
                  <div className="student-col student-select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => toggleSelected(event, s.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select ${s.name}`}
                    />
                  </div>
                  <div className="student-col student-id">{s.student_id || formatStudentCode(s.id)}</div>

                  <div className="student-col student-name" style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="student-photo">{s.photo ? <img src={s.photo} alt="" /> : <i className="fas fa-user"></i>}</div>
                    <div className="student-name-meta" style={{ marginLeft: '10px', minWidth: 0 }}>
                      <div className="student-name-main">{s.name}</div>
                      <div className="student-name-church">{s.church || ''}</div>
                      <div className="student-gender-inline">{s.gender || ''}</div>
                    </div>
                  </div>

                  <div className="student-col student-gender">{s.gender || '-'}</div>

                  <div className="student-col student-age">{age}</div>

                  <div className="student-col student-grade">{s.grade || '-'}</div>

                  <div className="student-col student-status">
                    <button
                      type="button"
                      className={`badge ${st === 'complete' ? 'badge-success' : st === 'partial' ? 'badge-warn' : 'badge-info'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={(event) => handleToggleStatus(event, s)}
                    >
                      {st === 'complete' ? 'Complete' : st === 'partial' ? 'Partial' : 'Pending'}
                    </button>
                  </div>

                  <div className="student-col student-actions">
                    <button
                      type="button"
                      className="btn btn-icon"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}
                      aria-label="Actions"
                      data-menu-trigger={s.id}
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                    {openMenuId === s.id && (
                      <div className="action-menu" data-menu>
                        <button type="button" className="action-item" onClick={(e) => { e.stopPropagation(); openEdit(s); }}><i className="fas fa-pen" style={{ marginRight: 8 }}></i>Edit</button>
                        <button type="button" className="action-item delete" onClick={(e) => { e.stopPropagation(); handleDelete(s); }}><i className="fas fa-trash" style={{ marginRight: 8 }}></i>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
