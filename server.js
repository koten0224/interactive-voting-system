require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load password from .env
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Configure Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key-for-voting',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root route to render HTML directly with options
app.get('/', (req, res) => {
    res.render('index', {
        options: {
            red: {
                title: process.env.VOTE_OPTION_RED_TITLE || '紅方',
                subtitle: process.env.VOTE_OPTION_RED_SUBTITLE || '(Red)'
            },
            green: {
                title: process.env.VOTE_OPTION_GREEN_TITLE || '綠方',
                subtitle: process.env.VOTE_OPTION_GREEN_SUBTITLE || '(Green)'
            }
        }
    });
});

// In-memory voting data
let votes = {
    'red': 0,
    'green': 0
};
let globalVotingRound = 1; // Tracks current voting session to invalidate old user sessions on reset

// Role Constants
const ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

// Check auth status
app.get('/api/auth/status', (req, res) => {
    if (req.session.role === ROLES.ADMIN) {
        res.json({ authenticated: true, role: ROLES.ADMIN });
    } else {
        res.json({ authenticated: false, role: ROLES.USER });
    }
});

// Admin Login endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '密碼錯誤 (Incorrect password)' });
    }

    req.session.role = ROLES.ADMIN;
    
    // If the admin voted while they were a normal user, retract their vote
    if (req.session.hasVoted && req.session.votedOption && votes[req.session.votedOption] !== undefined) {
        // Only retract if the voting round matches, otherwise it's a relic vote that doesn't count anyway
        if (req.session.votingRound === globalVotingRound) {
            votes[req.session.votedOption]--;
        }
        req.session.hasVoted = false;
        req.session.votedOption = null;
    }

    res.json({ success: true, role: ROLES.ADMIN });
});

// Admin Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.role = null;
    res.json({ success: true });
});

// Track active requests to prevent rapid concurrent request race conditions
const activeRequests = new Set();

// Submit a vote
app.post('/api/vote', (req, res) => {
    // Check if user's session belongs to an older voting round
    if (req.session.votingRound !== globalVotingRound) {
        req.session.hasVoted = false;
        req.session.votedOption = null;
        req.session.votingRound = globalVotingRound;
    }

    // Admin cannot vote
    if (req.session.role === ROLES.ADMIN) {
        return res.status(403).json({ success: false, message: '管理員無法投票，僅能觀看結果 (Admins cannot vote)' });
    }

    // Prevent concurrent requests from the same session
    if (activeRequests.has(req.sessionID)) {
        return res.status(429).json({ success: false, message: '處理中，請稍候 (Processing, please wait)' });
    }
    
    activeRequests.add(req.sessionID); // Lock

    try {
        const { option } = req.body;

        if (votes[option] === undefined) {
            return res.status(400).json({ success: false, message: '無效的選項 (Invalid option)' });
        }

        // If already voted for the exact same option, do nothing
        if (req.session.hasVoted && req.session.votedOption === option) {
            return res.json({ success: true, message: '維持原判！ (Vote unchanged)' });
        }

        // If changing vote, deduct from previous option
        if (req.session.hasVoted && req.session.votedOption && votes[req.session.votedOption] !== undefined) {
            votes[req.session.votedOption]--;
        }

        // Add new vote
        votes[option]++;
        req.session.hasVoted = true;
        req.session.votedOption = option;
        res.json({ success: true, message: '投票成功！ (Vote successful!)' });
    } finally {
        activeRequests.delete(req.sessionID); // Unlock
    }
});

// Get voting results
app.get('/api/results', (req, res) => {
    // Check if user's session belongs to an older voting round
    if (req.session.votingRound !== globalVotingRound) {
        req.session.hasVoted = false;
        req.session.votedOption = null;
        req.session.votingRound = globalVotingRound;
    }

    res.json({
        votes: votes,
        hasVoted: req.session.hasVoted || false,
        votedOption: req.session.votedOption || null,
        role: req.session.role || ROLES.USER
    });
});

// Reset votes (Admin only)
app.post('/api/reset', (req, res) => {
    if (req.session.role !== ROLES.ADMIN) {
        return res.status(403).json({ success: false, message: '權限不足 (Forbidden)' });
    }
    
    for (let key in votes) {
        votes[key] = 0;
    }
    globalVotingRound++; // Increment round to invalidate all existing user vote sessions
    res.json({ success: true, message: '票數已重置 (Votes reset)' });
});

// Listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
