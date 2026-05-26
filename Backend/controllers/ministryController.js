const { query } = require('../config/db');

const getLookupRows = async (table) =>
    query(
        `SELECT id, name
         FROM ${table}
         WHERE is_active = 1
         ORDER BY name ASC`
    );

exports.getMinistries = async (req, res) => {
    console.log('GET /ministries called');
    try {
        const ministries = await getLookupRows('ministries');
        console.log('Ministries loaded:', ministries.length);
        return res.json(ministries);
    } catch (error) {
        console.error('Error in getMinistries:', error);
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
};

exports.createMinistry = async (req, res) => {
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
};

exports.deleteMinistry = async (req, res) => {
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
};
