import { useRef, useState } from 'react';
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
  conversionDate: ['conversion date', 'date of conversion'],
  baptismDate: ['baptism date', 'date of baptism'],
  fatherName: ["father's name", 'father name'],
  fatherPhone: ["father's phone number", 'father phone'],
  motherName: ["mother's name", 'mother name'],
  motherPhone: ["mother's phone number", 'mother phone'],
  guardianName: ['guardian', 'guardian name'],
  guardianPhone: ["guardian's phone number", 'guardian phone'],
  packYear: ['pack history year', 'pack year', 'year'],
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

export default function Students({ onViewDetail }) {
  const { students, settings, updateStudent, bulkAddStudents, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [filterLvl, setFilterLvl] = useState('');
  const [filterGen, setFilterGen] = useState('');
  const [filterPackYear, setFilterPackYear] = useState('');
  const importInputRef = useRef(null);

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
      !(s.studentCode || formatStudentCode(s.id)).toLowerCase().includes(search.toLowerCase())
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
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const excelText = (value) => `="${String(value ?? '').replace(/"/g, '""')}"`;

  const exportExcel = () => {
    if (filtered.length === 0) {
      showToast('No student data to export', 'error');
      return;
    }

    const rows = [
      [
        'Student ID',
        'Name',
        'Date of Birth',
        'Gender',
        'Grade',
        'School',
        'Phone',
        'Ministry',
        'Church',
        'Address',
        'Future Dream / Goal',
        'Role / Position',
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
      ],
      ...filtered.map((student) => [
        student.student_id || student.student_id || formatStudentCode(student.id), // Student ID from DB or fallback
        student.name || '',
        student.dob || '',
        student.gender || '',
        student.grade || '',
        student.school || '',
        excelText(student.phone || ''),
        student.ministry || '',
        student.church || '',
        student.address || '',
        student.futureGoal || '',
        student.rolePosition || '',
        student.conversionDate || '',
        student.baptismDate || '',
        student.fatherName || '',
        excelText(student.fatherPhone || ''),
        student.motherName || '',
        excelText(student.motherPhone || ''),
        student.guardianName || '',
        excelText(student.guardianPhone || ''),
        student.packYear || '',
        packStatus(student),
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
        const status = packStatus(student);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${student.name || ''}</td>
            <td>${student.gender || ''}</td>
            <td>${student.grade || ''}</td>
            <td>${student.school || ''}</td>
            <td>${student.ministry || ''}</td>
            <td>${student.phone || ''}</td>
            <td>${student.packYear || ''}</td>
            <td>${status}</td>
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
                <th>Gender</th>
                <th>Grade</th>
                <th>School</th>
                <th>Ministry</th>
                <th>Phone</th>
                <th>Pack History Year</th>
                <th>Status</th>
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
      'Ministry',
      'Church',
      'Address',
      'Future Dream / Goal',
      'Role / Position',
      'Date of Conversion',
      'Date of Baptism',
      "Father's Name",
      "Father's Phone Number",
      "Mother's Name",
      "Mother's Phone Number",
      'Guardian',
      "Guardian's Phone Number",
      'Pack History Year',
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
      'Youth Ministry',
      'Main Church',
      'Phnom Penh',
      'Teacher',
      'Member',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      String(new Date().getFullYear()),
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
      const ministry = String(getRowValue(rowMap, 'ministry') || '').trim();
      const packYearRaw = Number.parseInt(String(getRowValue(rowMap, 'packYear') || '').trim(), 10);
      const packYear = Number.isNaN(packYearRaw) ? currentYear : packYearRaw;

      if (!name || !dob || !gender || Number.isNaN(grade) || !school || !ministry) {
        errors.push(`Row ${i + 1}: missing required data (name, dob, gender, grade, school, ministry).`);
        continue;
      }

      validStudents.push({
        name,
        dob,
        gender,
        grade,
        school,
        phone: String(getRowValue(rowMap, 'phone') || '').trim(),
        ministry,
        church: String(getRowValue(rowMap, 'church') || '').trim(),
        address: String(getRowValue(rowMap, 'address') || '').trim(),
        futureGoal: String(getRowValue(rowMap, 'futureGoal') || '').trim(),
        rolePosition: String(getRowValue(rowMap, 'rolePosition') || '').trim(),
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
            items: {
              bag: parseBoolean(getRowValue(rowMap, 'bag')),
              uniforms: parseBoolean(getRowValue(rowMap, 'uniforms')),
              books: parseBoolean(getRowValue(rowMap, 'books')),
            },
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
          <option value="">All Genders</option><option value="Male">Boys</option><option value="Female">Girls</option>
        </select>
        <select className="input-field" style={{ width: 'auto', minWidth: '130px' }} value={filterPackYear} onChange={e => setFilterPackYear(e.target.value)}>
          <option value="">All Pack Years</option>
          {packYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: '8px' }}>
        {filtered.length === 0 ? <div className="empty-state"><i className="fas fa-search"></i><p>No students match your filters</p></div> : 
          filtered.map(s => {
            const age = calcAge(s.dob);
            const st = packStatus(s);
            return (
              <div key={s.id} className="student-card" onClick={() => onViewDetail(s.id)}>
                <div className="student-photo">{s.photo ? <img src={s.photo} alt="" /> : <i className="fas fa-user"></i>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.4px' }}>
                    {s.studentCode || formatStudentCode(s.id)}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--fg3)', marginTop: '2px' }}>Grade {s.grade} · {s.school} · Age {age}</div>
                </div>
                <button
                  type="button"
                  className={`badge ${st==='complete'?'badge-success':st==='partial'?'badge-warn':'badge-info'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={(event) => handleToggleStatus(event, s)}
                >
                  {st==='complete'?'Complete':st==='partial'?'Partial':'Pending'}
                </button>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
