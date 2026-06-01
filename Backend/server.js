require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use((req, res, next) => { 
    res.setHeader('ngrok-skip-browser-warning', 'true'); 
    next(); 
});
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Run lightweight migrations to ensure required tables exist
const { runMigrations } = require('./migrations/ensureTables');
runMigrations().catch(err => console.error('Migration error (continuing):', err && err.message ? err.message : err));

// Routes
const studentRoutes = require('./routes/studentRoutes');
const ministryRoutes = require('./routes/ministryRoutes');
const churchRoutes = require('./routes/churchRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/students', studentRoutes);
app.use('/ministries', ministryRoutes);
app.use('/churches', churchRoutes);
app.use('/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port http://localhost:${PORT}`);
});
