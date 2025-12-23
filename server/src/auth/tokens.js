const jwt = require("jsonwebtoken");
const { config } = require("../config");

function mustGetSecret(value, name) {
    const v = String(value || "").trim();
    if (!v) throw new Error(`${name} is required`);
    if (v.length < 16) throw new Error(`${name} must be at least 16 chars`);
    return v;
}

const ACCESS_SECRET = mustGetSecret(config.jwt.accessSecret, "JWT_SECRET");
const REFRESH_SECRET = mustGetSecret(config.jwt.refreshSecret, "JWT_REFRESH_SECRET");

const ACCESS_TTL = config.jwt.accessTtl || "15m";
const REFRESH_TTL = config.jwt.refreshTtl || "30d";

// optional (recommended)
const ISSUER = process.env.JWT_ISSUER || "voyage-ai";
const AUDIENCE = process.env.JWT_AUDIENCE || "voyage-ai-mobile";

function signAccessToken(user) {
    return jwt.sign(
        { role: user.role },
        ACCESS_SECRET,
        {
            subject: user.id,
            expiresIn: ACCESS_TTL,
            issuer: ISSUER,
            audience: AUDIENCE,
        }
    );
}

function signRefreshToken(user) {
    return jwt.sign(
        {},
        REFRESH_SECRET,
        {
            subject: user.id,
            expiresIn: REFRESH_TTL,
            issuer: ISSUER,
            audience: AUDIENCE,
        }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET, { issuer: ISSUER, audience: AUDIENCE });
}

function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET, { issuer: ISSUER, audience: AUDIENCE });
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
