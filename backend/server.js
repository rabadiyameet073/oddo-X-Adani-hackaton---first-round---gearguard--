const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Production base URL for CORS
const PRODUCTION_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.SITE_URL || 'https://oddo-x-adani-hackaton.vercel.app';

// Middleware
app.use(cors({
    origin: [PRODUCTION_URL, 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const teamRoutes = require('./routes/teams');
const equipmentRoutes = require('./routes/equipment');
const requestRoutes = require('./routes/requests');
const reportRoutes = require('./routes/reports');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'GearGuard API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Export for Vercel serverless; only listen when running locally
module.exports = app;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 GearGuard API Server running on port ${PORT}`);
    });
}
