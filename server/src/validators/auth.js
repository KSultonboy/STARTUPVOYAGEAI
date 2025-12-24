const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;
const AVATAR_MAX = 900000;

function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeAvatar(value) {
    if (value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function validateRegister(body = {}) {
    const errors = [];
    const name = cleanString(body.name);
    const email = cleanString(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const avatar = normalizeAvatar(body.avatar);

    if (!name) errors.push({ field: "name", message: "Name is required" });
    if (!EMAIL_RE.test(email)) errors.push({ field: "email", message: "Valid email is required" });
    if (password.length < PASSWORD_MIN) {
        errors.push({ field: "password", message: `Password must be at least ${PASSWORD_MIN} characters` });
    }
    if (password.length > PASSWORD_MAX) {
        errors.push({ field: "password", message: "Password is too long" });
    }
    if (avatar && avatar.length > AVATAR_MAX) {
        errors.push({ field: "avatar", message: "Avatar image is too large" });
    }

    return {
        ok: errors.length === 0,
        errors,
        value: { name, email, password, avatar },
    };
}

function validateLogin(body = {}) {
    const errors = [];
    const email = cleanString(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!EMAIL_RE.test(email)) errors.push({ field: "email", message: "Valid email is required" });
    if (!password) errors.push({ field: "password", message: "Password is required" });

    return {
        ok: errors.length === 0,
        errors,
        value: { email, password },
    };
}

function validateRefresh(body = {}) {
    const errors = [];
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

    if (!refreshToken) errors.push({ field: "refreshToken", message: "Refresh token is required" });

    return {
        ok: errors.length === 0,
        errors,
        value: { refreshToken },
    };
}

function validateProfileUpdate(body = {}) {
    const errors = [];
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, "avatar");
    const avatar = hasAvatar ? normalizeAvatar(body.avatar) : undefined;

    if (hasAvatar && avatar && avatar.length > AVATAR_MAX) {
        errors.push({ field: "avatar", message: "Avatar image is too large" });
    }

    return {
        ok: errors.length === 0,
        errors,
        value: hasAvatar ? { avatar } : {},
    };
}

module.exports = { validateRegister, validateLogin, validateRefresh, validateProfileUpdate };
