const { verifyAccessToken } = require("./tokens");
const { findUserById } = require("./store");
const { resolvePermissions, hasPermission } = require("./permissions");
const { createError } = require("../utils/errors");

function extractBearerToken(req) {
    const header = String(req.headers.authorization || "").trim();
    if (!header) return null;
    if (!header.toLowerCase().startsWith("bearer ")) return null;
    const token = header.slice(7).trim();
    return token || null;
}

function requireAuth(req, res, next) {
    const token = extractBearerToken(req);
    if (!token) return next(createError(401, "Missing auth token", "AUTH_REQUIRED"));

    try {
        const payload = verifyAccessToken(token);

        // payload.sub bizning tokens.js da subject bo‘ladi
        const userId = payload.sub || payload.subject || payload.userId;
        if (!userId) return next(createError(401, "Invalid token payload", "AUTH_INVALID"));

        const user = findUserById(String(userId));
        if (!user) return next(createError(401, "Account not found", "AUTH_INVALID"));

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: resolvePermissions(user.role),
        };

        return next();
    } catch (err) {
        return next(createError(401, "Invalid or expired token", "AUTH_INVALID"));
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) return next(createError(401, "Missing auth token", "AUTH_REQUIRED"));
        if (req.user.role !== role) {
            return next(createError(403, "Role not permitted", "FORBIDDEN"));
        }
        return next();
    };
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) return next(createError(401, "Missing auth token", "AUTH_REQUIRED"));
        const permissions = req.user.permissions || [];
        if (!hasPermission(permissions, permission)) {
            return next(createError(403, "Permission denied", "FORBIDDEN"));
        }
        return next();
    };
}

module.exports = { requireAuth, requireRole, requirePermission };
