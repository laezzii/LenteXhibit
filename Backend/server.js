/**
 * LenteXhibit Backend Server
 * Main entry point for the backend server application.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workRoutes = require('./routes/works');
const portfolioRoutes = require('./routes/portfolios');
const themeRoutes = require('./routes/themes');
const voteRoutes = require('./routes/votes');
// Removed accidental React import â€” backend shouldn't require React

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://lentexhibit-1.onrender.com',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://lentexhibit_db:lentexhibit_pass@lentexhibit.da4auec.mongodb.net/lentexhibit?retryWrites=true&w=majority',
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://lentexhibit_db:lentexhibit_pass@lentexhibit.da4auec.mongodb.net/lentexhibit?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err)
)

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/works', workRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/votes', voteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json ({
        status: 'ok',
        message: 'LenteXhibit API is running',
        timestamp: new Date().toISOString()
    });
});

// Database health endpoint for quick verification
app.get('/api/health/db', (req, res) => {
    const readyState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    res.json({
        status: stateMap[readyState] === 'connected' ? 'ok' : 'degraded',
        readyState,
        dbState: stateMap[readyState],
        database: mongoose.connection.name || null,
        hasConnections: mongoose.connection.hosts?.length > 0 || false,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;