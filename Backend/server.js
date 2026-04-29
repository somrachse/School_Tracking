const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Somrach123',
    database: 'school_pack_tracker'
});

const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });

const parsePackHistory = (value, fallbackYear) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch (error) {
        }
    }

    if (fallbackYear) {
        return [{ year: Number(fallbackYear), items: { bag: false, uniforms: false, books: false } }];
    }

    return [];
};

const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
};

const formatStudentCode = (id) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) return '';
    return `FFCC${String(Math.trunc(numericId)).padStart(4, '0')}`;
};

const packRowsToHistory = (rows = []) =>
    rows
        .map((row) => ({
            year: Number(row.year),
            items: {
                bag: Boolean(row.bag_given),
                uniforms: Boolean(row.uniforms_given),
                books: Boolean(row.books_given),
            },
        }))
        .sort((a, b) => a.year - b.year);

const buildPackRows = (student, fallbackYear) => {
    const history = parsePackHistory(student.packHistory, student.packYear || fallbackYear);
    const sortedHistory = history
        .map((entry) => ({
            year: Number(entry.year),
            items: {
                bag: Boolean(entry.items?.bag),
                uniforms: Boolean(entry.items?.uniforms),
                books: Boolean(entry.items?.books),
            },
        }))
        .filter((entry) => !Number.isNaN(entry.year))
        .sort((a, b) => a.year - b.year);

    if (sortedHistory.length > 0) return sortedHistory;

    const year = Number(student.packYear || fallbackYear);
    if (Number.isNaN(year)) return [];

    return [{ year, items: { bag: false, uniforms: false, books: false } }];
};

const formatStudentForResponse = (student, packHistory = []) => {
    const latestYear =
        packHistory.length > 0
            ? packHistory[packHistory.length - 1].year
            : new Date().getFullYear();

    return {
        id: student.id,
        studentCode: formatStudentCode(student.id),
        name: student.name || '',
        dob: formatDate(student.date_of_birth),
        gender: student.gender || '',
        grade: student.grade ?? '',
        school: student.school_name || '',
        phone: student.phone_number || '',
        ministry: student.ministry_name || '',
        church: student.church_name || '',
        address: student.address || '',
        futureGoal: student.future_dream || '',
        rolePosition: student.role_position || '',
        conversionDate: formatDate(student.date_of_conversion),
        baptismDate: formatDate(student.date_of_baptism),
        fatherName: student.fathers_name || '',
        fatherPhone: student.fathers_phone || '',
        motherName: student.mothers_name || '',
        motherPhone: student.mothers_phone || '',
        guardianName: student.guardian_name || '',
        guardianPhone: student.guardian_phone || '',
        photo: student.photo_path || '',
        packYear: latestYear,
        packHistory,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
    };
};

const getLookupId = async (table, name) => {
    if (!name || !String(name).trim()) return null;

    const trimmedName = String(name).trim();
    const existing = await query(`SELECT id FROM ${table} WHERE name = ? LIMIT 1`, [trimmedName]);
    if (existing.length > 0) return existing[0].id;

    if (table === 'ministries') {
        const result = await query(
            'INSERT INTO ministries (name, description, is_active) VALUES (?, NULL, 1)',
            [trimmedName]
        );
        return result.insertId;
    }

    if (table === 'churches') {
        const result = await query(
            'INSERT INTO churches (name, location, is_active) VALUES (?, NULL, 1)',
            [trimmedName]
        );
        return result.insertId;
    }

    return null;
};

const getLookupRows = async (table) =>
    query(
        `SELECT id, name
         FROM ${table}
         WHERE is_active = 1
         ORDER BY name ASC`
    );

const mapStudentToDb = async (student) => {
    const ministryId = await getLookupId('ministries', student.ministry);
    const churchId = await getLookupId('churches', student.church);

    // Generate next student_id if not provided
    let studentId = student.studentCode || student.student_id;
    if (!studentId) {
        // Query for the highest student_id in the format FFCC0001
        const [row] = await query("SELECT student_id FROM students WHERE student_id LIKE 'FFCC%' ORDER BY student_id DESC LIMIT 1");
        let nextNum = 1;
        if (row && row.student_id) {
            const match = row.student_id.match(/FFCC(\d{4})/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }
        studentId = `FFCC${String(nextNum).padStart(4, '0')}`;
    }

    return {
        student_id: studentId,
        name: student.name,
        date_of_birth: student.dob || null,
        gender: student.gender,
        grade: Number(student.grade),
        school_name: student.school,
        phone_number: student.phone || null,
        ministry_id: ministryId,
        church_id: churchId,
        address: student.address || null,
        future_dream: student.futureGoal || null,
        role_position: student.rolePosition || null,
        date_of_conversion: student.conversionDate || null,
        date_of_baptism: student.baptismDate || null,
        fathers_name: student.fatherName || null,
        fathers_phone: student.fatherPhone || null,
        mothers_name: student.motherName || null,
        mothers_phone: student.motherPhone || null,
        guardian_name: student.guardianName || null,
        guardian_phone: student.guardianPhone || null,
        pack_history_year: Number(student.packYear) || null,
        photo_path:
            typeof student.photo === 'string' && student.photo.trim() ? student.photo : null,
        is_active: student.isActive === undefined ? 1 : Number(Boolean(student.isActive)),
        created_by: student.createdBy || null,
    };
};

const replacePackHistory = async (studentId, student) => {
    const packRows = buildPackRows(student);

    await query('DELETE FROM pack_distributions WHERE student_id = ?', [studentId]);

    for (const row of packRows) {
        await query(
            `INSERT INTO pack_distributions
                (student_id, year, bag_given, uniforms_given, books_given, notes, distributed_by)
             VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
            [
                studentId,
                row.year,
                Number(row.items.bag),
                Number(row.items.uniforms),
                Number(row.items.books),
            ]
        );
    }
};

const getStudentsWithHistory = async (whereClause = '', params = [], options = {}) => {
    const limitClause = options.limit ? ` LIMIT ${Number(options.limit)}` : '';
    const students = await query(
        `SELECT
            s.*,
            m.name AS ministry_name,
            c.name AS church_name
         FROM students s
         LEFT JOIN ministries m ON m.id = s.ministry_id
         LEFT JOIN churches c ON c.id = s.church_id
         ${whereClause}
         ORDER BY s.created_at DESC
         ${limitClause}`,
        params
    );

    if (students.length === 0) return [];

    const ids = students.map((student) => student.id);
    const packRows = await query(
        `SELECT student_id, year, bag_given, uniforms_given, books_given
         FROM pack_distributions
         WHERE student_id IN (?)
         ORDER BY year ASC, id ASC`,
        [ids]
    );

    const packHistoryByStudent = new Map();
    for (const row of packRows) {
        const current = packHistoryByStudent.get(row.student_id) || [];
        current.push(row);
        packHistoryByStudent.set(row.student_id, current);
    }

    return students.map((student) =>
        formatStudentForResponse(
            student,
            packRowsToHistory(packHistoryByStudent.get(student.id) || [])
        )
    );
};

app.get('/users', async (req, res) => {
    try {
        const users = await query('SELECT * FROM users');
        return res.json(users);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.get('/ministries', async (req, res) => {
    try {
        const ministries = await getLookupRows('ministries');
        return res.json(ministries);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.post('/ministries', async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) {
            return res.status(400).json({ error: 'Ministry name is required' });
        }

        const existing = await query('SELECT id, name, is_active FROM ministries WHERE name = ? LIMIT 1', [name]);
        if (existing.length > 0) {
            if (!existing[0].is_active) {
                await query('UPDATE ministries SET is_active = 1 WHERE id = ?', [existing[0].id]);
            }
            return res.json({ id: existing[0].id, name: existing[0].name });
        }

        const result = await query(
            'INSERT INTO ministries (name, description, is_active) VALUES (?, NULL, 1)',
            [name]
        );
        return res.json({ id: result.insertId, name });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.delete('/ministries/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const result = await query('DELETE FROM ministries WHERE name = ?', [name]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ministry not found' });
        }
        return res.json({ message: 'Ministry deleted.' });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.get('/churches', async (req, res) => {
    try {
        const churches = await getLookupRows('churches');
        return res.json(churches);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.post('/churches', async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) {
            return res.status(400).json({ error: 'Church name is required' });
        }

        const existing = await query('SELECT id, name, is_active FROM churches WHERE name = ? LIMIT 1', [name]);
        if (existing.length > 0) {
            if (!existing[0].is_active) {
                await query('UPDATE churches SET is_active = 1 WHERE id = ?', [existing[0].id]);
            }
            return res.json({ id: existing[0].id, name: existing[0].name });
        }

        const result = await query(
            'INSERT INTO churches (name, location, is_active) VALUES (?, NULL, 1)',
            [name]
        );
        return res.json({ id: result.insertId, name });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.delete('/churches/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const result = await query('DELETE FROM churches WHERE name = ?', [name]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Church not found' });
        }
        return res.json({ message: 'Church deleted.' });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.get('/students', async (req, res) => {
    try {
        const students = await getStudentsWithHistory('WHERE s.is_active = 1');
        return res.json(students);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.get('/students/:id', async (req, res) => {
    try {
        const students = await getStudentsWithHistory('WHERE s.id = ?', [req.params.id], { limit: 1 });
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        return res.json(students[0]);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.post('/students', async (req, res) => {
    try {
        const studentData = await mapStudentToDb(req.body);
        const result = await query('INSERT INTO students SET ?', [studentData]);

        await replacePackHistory(result.insertId, req.body);

        const students = await getStudentsWithHistory('WHERE s.id = ?', [result.insertId], { limit: 1 });
        return res.json(students[0]);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.put('/students/:id', async (req, res) => {
    try {
        const existing = await query('SELECT id FROM students WHERE id = ? LIMIT 1', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const studentData = await mapStudentToDb(req.body);
        await query('UPDATE students SET ? WHERE id = ?', [studentData, req.params.id]);
        await replacePackHistory(req.params.id, req.body);

        const students = await getStudentsWithHistory('WHERE s.id = ?', [req.params.id], { limit: 1 });
        return res.json(students[0]);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.post('/students/bulk', async (req, res) => {
    const students = Array.isArray(req.body) ? req.body : req.body.students;

    if (!Array.isArray(students)) {
        return res.status(400).json({ error: 'Expected an array of students' });
    }

    try {
        const created = [];

        for (const student of students) {
            const studentData = await mapStudentToDb(student);
            const result = await query('INSERT INTO students SET ?', [studentData]);
            await replacePackHistory(result.insertId, student);
            const savedStudents = await getStudentsWithHistory('WHERE s.id = ?', [result.insertId], { limit: 1 });
            created.push(savedStudents[0]);
        }

        return res.json(created);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.delete('/students/:id', async (req, res) => {
    try {
        const students = await getStudentsWithHistory('WHERE s.id = ?', [req.params.id], { limit: 1 });
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = students[0];

        await query(
            `INSERT INTO deleted_students_log
                (student_id, student_name, deleted_by, snapshot_json)
             VALUES (?, ?, NULL, ?)`,
            [student.id, student.name, JSON.stringify(student)]
        );

        await query('DELETE FROM pack_distributions WHERE student_id = ?', [req.params.id]);
        await query('DELETE FROM students WHERE id = ?', [req.params.id]);

        return res.json({ message: 'Student deleted and logged.' });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.delete('/students', async (req, res) => {
    try {
        await query('DELETE FROM pack_distributions');
        await query('DELETE FROM students');
        return res.json({ message: 'All students deleted.' });
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
});

app.listen(5000, () => {
    console.log('Backend server running on port http://localhost:5000');
});
