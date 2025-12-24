const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { asyncHandler } = require("../utils/asyncHandler");
const { createError } = require("../utils/errors");
const {
    createUser,
    findUserByEmail,
    findUserById,
    addRefreshToken,
    revokeRefreshToken,
    isRefreshTokenActive,
    updateUserProfile,
} = require("../auth/store");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../auth/tokens");
const { validateRegister, validateLogin, validateRefresh, validateProfileUpdate } = require("../validators/auth");
const { requireAuth } = require("../auth/middleware");
const { resolvePermissions } = require("../auth/permissions");
const { trackEvent } = require("../analytics/metrics");

function serializeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        permissions: resolvePermissions(user.role),
    };
}

// POST /api/auth/register
router.post(
    "/register",
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateRegister(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        if (findUserByEmail(value.email)) {
            return next(createError(409, "Email already registered", "AUTH_EXISTS"));
        }

        const passwordHash = await bcrypt.hash(value.password, 10);
        const user = createUser({
            name: value.name,
            email: value.email,
            passwordHash,
            role: "user",
            avatar: value.avatar,
        });

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        addRefreshToken(refreshToken, user.id);
        trackEvent("register", { userId: user.id });

        return res.status(201).json({ user: serializeUser(user), accessToken, refreshToken });
    })
);

// POST /api/auth/login
router.post(
    "/login",
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateLogin(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const user = findUserByEmail(value.email);
        if (!user) return next(createError(401, "Invalid credentials", "AUTH_INVALID"));

        const match = await bcrypt.compare(value.password, user.passwordHash);
        if (!match) return next(createError(401, "Invalid credentials", "AUTH_INVALID"));

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        addRefreshToken(refreshToken, user.id);
        trackEvent("login", { userId: user.id });

        return res.json({ user: serializeUser(user), accessToken, refreshToken });
    })
);

// POST /api/auth/refresh
router.post(
    "/refresh",
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateRefresh(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        let payload;
        try {
            payload = verifyRefreshToken(value.refreshToken);
        } catch (err) {
            return next(createError(401, "Invalid refresh token", "AUTH_INVALID"));
        }

        if (!isRefreshTokenActive(value.refreshToken, payload.sub)) {
            return next(createError(401, "Refresh token revoked", "AUTH_INVALID"));
        }

        const user = findUserById(payload.sub);
        if (!user) return next(createError(401, "Account not found", "AUTH_INVALID"));

        revokeRefreshToken(value.refreshToken);
        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        addRefreshToken(refreshToken, user.id);

        return res.json({ accessToken, refreshToken });
    })
);

// POST /api/auth/logout
router.post(
    "/logout",
    asyncHandler(async (req, res) => {
        const { ok, errors, value } = validateRefresh(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });
        revokeRefreshToken(value.refreshToken);
        return res.json({ ok: true });
    })
);

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// PATCH /api/auth/me
router.patch(
    "/me",
    requireAuth,
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateProfileUpdate(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const updated = updateUserProfile(req.user.id, value);
        if (!updated) return next(createError(404, "Account not found", "AUTH_INVALID"));

        return res.json({ user: serializeUser(updated) });
    })
);

module.exports = router;
