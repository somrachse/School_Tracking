const { query } = require('../config/db');

const getLookupRows = async (table) =>
    query(
        `SELECT id, name
         FROM ${table}
         WHERE is_active = 1
         ORDER BY name ASC`
    );

exports.getChurches = async (req, res) => {
    try {
        const churches = await getLookupRows('churches');
        return res.json(churches);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
};

exports.createChurch = async (req, res) => {
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
};

exports.deleteChurch = async (req, res) => {
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
};
