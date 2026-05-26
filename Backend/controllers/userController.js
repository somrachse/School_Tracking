const { query } = require('../config/db');

exports.getUsers = async (req, res) => {
    try {
        const users = await query('SELECT * FROM users');
        return res.json(users);
    } catch (error) {
        return res.status(500).json({ error: error.sqlMessage || error.message });
    }
};
