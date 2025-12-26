const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { config } = require("../config");

function getSecret(value, name) {
    const v = String(value || "").trim();
    if (v && v.length >= 16) return v;

    // Production’da majburiy
    if (config.isProd) {
        throw new Error(`${name} is required and must be at least 16 chars`);
    }

    // Dev’da fallback (restartlarda ham bir xil bo‘lishi uchun deterministic)
    const fallback = crypto
        .createHash("sha256")
        .update(`voyage-ai-dev:${name}:${process.cwd()}`)
        .digest("hex");

    console.warn(`[config] ${name} is missing/weak in development; using a dev fallback secret.`);
    return fallback;
}

const ACCESS_SECRET = getSecret(config.jwt.accessSecret, "JWT_SECRET");
const REFRESH_SECRET = getSecret(config.jwt.refreshSecret, "JWT_REFRESH_SECRET");

const ACCESS_TTL = config.jwt.accessTtl || "15m";
const REFRESH_TTL = config.jwt.refreshTtl || "30d";

const ISSUER = config.jwt.issuer || "voyage-ai";
const AUDIENCE = config.jwt.audience || "voyage-ai-mobile";

function signAccessToken(user) {
    return jwt.sign(
        { role: user.role },
        ACCESS_SECRET,
        {
            subject: String(user.id),
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
            subject: String(user.id),
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
