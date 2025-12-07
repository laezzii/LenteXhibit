/**
 * LenteXhibit Backend Server - Fixed Session Configuration
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

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - MUST be before session middleware
app.set('trust proxy', 1);

// CORS Configuration - MUST be before session middleware
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:5173',
            'http://localhost:5174',
            'https://lentexhibit-1.onrender.com',
            process.env.FRONTEND_URL
        ];
        
        // In development, allow any origin
        if (process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // CRITICAL: Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'], // Expose set-cookie header
    maxAge: 86400
};

app.use(cors(corsOptions));

// Body parser middleware - BEFORE session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration - FIXED
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO',
    resave: false,
    saveUninitialized: false, // Changed to false - only save sessions with data
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600,
        crypto: {
            secret: process.env.SESSION_SECRET || 'LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO'
        }
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser decide
    },
    name: 'lentexhibit.sid',
    rolling: true, // Refresh cookie on each request
    proxy: true // Trust the reverse proxy
};

app.use(session(sessionConfig));

// Add session debug middleware
app.use((req, res, next) => {
    console.log('📍 Request:', req.method, req.path);
    console.log('🍪 Session ID:', req.sessionID);
    console.log('👤 Session User:', req.session.userId);
    next();
});

// DATABASE CONNECTION
const connectDB = async () => {
    try {
        const mongoOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb+srv://lentexhibit_db:lentexhibit_pass@lentexhibit.da4auec.mongodb.net/lentexhibit',
            mongoOptions
        );

        console.log('✅ MongoDB connected successfully');
        console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        console.error('💡 Check your MONGODB_URI in .env file');
        process.exit(1);
    }
};

connectDB();

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/works', workRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/votes', voteRoutes);

// HEALTH CHECK & ROOT ENDPOINT
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        session: !!req.sessionID,
        user: req.session.userId || null
    });
});

app.get('/api/health', (req, res) => {
    const healthcheck = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        session: !!req.sessionID
    };

    try {
        res.json(healthcheck);
    } catch (err) {
        healthcheck.status = 'error';
        healthcheck.error = err.message;
        res.status(503).json(healthcheck);
    }
});

// ERROR HANDLING MIDDLEWARE
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error'
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = err;
        errorResponse.stack = err.stack;
    }

    res.status(err.status || 500).json(errorResponse);
});

// START SERVER
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🍪 Session config: rolling=${sessionConfig.rolling}, maxAge=${sessionConfig.cookie.maxAge}ms`);
    console.log(`🔒 Cookie secure: ${sessionConfig.cookie.secure}, sameSite: ${sessionConfig.cookie.sameSite}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('🔴 HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('🔴 MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;