const jwt = require('jsonwebtoken');

const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_CONFIG.secret, { expiresIn: JWT_CONFIG.expiresIn });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_CONFIG.secret, { expiresIn: JWT_CONFIG.refreshExpiresIn });
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_CONFIG.secret);
};

module.exports = {
    JWT_CONFIG,
    generateToken,
    generateRefreshToken,
    verifyToken
};
