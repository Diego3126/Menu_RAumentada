const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'defaultchangemechangemechangeme123456';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, secret, (err, payload) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = { username: payload.sub, role: payload.role };
        next();
    });
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient role' });
        next();
    };
}

module.exports = { authenticateToken, requireRole };
