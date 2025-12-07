/**
 * LenteXhibit Backend Server - Production Ready
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

// Session Configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600, // lazy session update (24 hours)
        crypto: {
            secret: process.env.SESSION_SECRET || 'LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO'
        }
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        path: '/'
    },
    name: 'lentexhibit.sid', // Custom session cookie name
    rolling: true // Reset cookie expiration on each response
};

app.use(session(sessionConfig));

// CORS Configuration - Allow frontend to access backend
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy if behind a reverse proxy (required for Render)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        console.error('💡 Check your MONGODB_URI in .env file');
        process.exit(1); // Exit if cannot connect to database
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
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        session: !!req.sessionID
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthcheck = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
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
// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    // Don't leak error details in production
    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error'
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = err;
        errorResponse.stack = err.stack;
    }

    res.status(err.status || 500).json(errorResponse);
});

// START SERVER
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🍪 Session config: rolling=${sessionConfig.rolling}, maxAge=${sessionConfig.cookie.maxAge}ms`);
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