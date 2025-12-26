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
const {
    validateRegister,
    validateLogin,
    validateRefresh,
    validateProfileUpdate,
} = require("../validators/auth");
const { requireAuth } = require("../auth/middleware");
const { resolvePermissions } = require("../auth/permissions");
const { trackEvent } = require("../analytics/metrics");

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

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

        const email = normalizeEmail(value.email);

        if (findUserByEmail(email)) {
            return next(createError(409, "Email already registered", "AUTH_EXISTS"));
        }

        const passwordHash = await bcrypt.hash(String(value.password), 10);
        const user = createUser({
            name: String(value.name || "").trim(),
            email,
            passwordHash,
            role: "user",
            avatar: value.avatar || null,
        });

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        addRefreshToken(refreshToken, user.id);

        trackEvent("register", { userId: user.id });

        return res.status(201).json({
            user: serializeUser(user),
            accessToken,
            refreshToken,
        });
    })
);

// POST /api/auth/login
router.post(
    "/login",
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateLogin(req.body);
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const email = normalizeEmail(value.email);

        const user = findUserByEmail(email);
        if (!user) return next(createError(401, "Invalid credentials", "AUTH_INVALID"));

        const match = await bcrypt.compare(String(value.password), String(user.passwordHash));
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
        } catch {
            return next(createError(401, "Invalid refresh token", "AUTH_INVALID"));
        }

        const userId = String(payload.sub || "");
        if (!userId) return next(createError(401, "Invalid refresh token", "AUTH_INVALID"));

        if (!isRefreshTokenActive(value.refreshToken, userId)) {
            return next(createError(401, "Refresh token revoked", "AUTH_INVALID"));
        }

        const user = findUserById(userId);
        if (!user) return next(createError(401, "Account not found", "AUTH_INVALID"));

        // rotate
        revokeRefreshToken(value.refreshToken);

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        addRefreshToken(refreshToken, user.id);

        return res.json({
            accessToken,
            refreshToken,
            user: serializeUser(user), // client ignore qilsa ham bo‘ladi
        });
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

// PATCH/PUT/POST /api/auth/me
const handleProfileUpdate = asyncHandler(async (req, res, next) => {
    const { ok, errors, value } = validateProfileUpdate(req.body);
    if (!ok) return res.status(400).json({ message: "Validation failed", errors });

    const updated = updateUserProfile(req.user.id, value);
    if (!updated) return next(createError(404, "Account not found", "AUTH_INVALID"));

    return res.json({ user: serializeUser(updated) });
});

router.patch("/me", requireAuth, handleProfileUpdate);
router.put("/me", requireAuth, handleProfileUpdate);
router.post("/me", requireAuth, handleProfileUpdate); // legacy fallback

module.exports = router;
