const router = require("express").Router();
const { asyncHandler } = require("../utils/asyncHandler");
const { createError } = require("../utils/errors");

const { requireAuth, requireRole } = require("../auth/middleware");
const {
    listUsers,
    updateUserRole,
    listPlaces,
    createPlace,
    updatePlace,
    deletePlaceByKey,
    listOffers,
    createOffer,
    updateOffer,
    deleteOffer,
} = require("../auth/store");

const { getOverview } = require("../analytics/metrics");

// ✅ Admin guard
const adminOnly = [requireAuth, requireRole("admin")];

// GET /api/admin/overview
router.get(
    "/overview",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const overview = getOverview();
        res.json(overview);
    })
);

// -------- Places --------

// GET /api/admin/places
router.get(
    "/places",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(listPlaces());
    })
);

// POST /api/admin/places
router.post(
    "/places",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        // Minimal server-side validation (sizda validators/admin.js bo‘lsa, o‘shani ishlatsangiz ham bo‘ladi)
        const b = req.body || {};
        if (!b.name || !b.city || !b.type) {
            throw createError(400, "Missing required fields", "VALIDATION");
        }
        const created = createPlace(b);
        res.status(201).json(created);
    })
);

// PUT /api/admin/places/:id
router.put(
    "/places/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const updated = updatePlace(req.params.id, req.body || {});
        if (!updated) return next(createError(404, "Place not found", "NOT_FOUND"));
        res.json(updated);
    })
);

// DELETE /api/admin/places/:id
// ✅ BU YERDA endi id/slug/name ham ishlaydi
router.delete(
    "/places/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const removed = deletePlaceByKey(req.params.id);
        if (!removed) return next(createError(404, "Place not found", "NOT_FOUND"));
        res.json({ ok: true });
    })
);

// -------- Offers --------

// GET /api/admin/offers
router.get(
    "/offers",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(listOffers());
    })
);

// POST /api/admin/offers
router.post(
    "/offers",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const b = req.body || {};
        if (!b.title || !b.city || !b.budget) {
            throw createError(400, "Missing required fields", "VALIDATION");
        }
        const created = createOffer(b);
        res.status(201).json(created);
    })
);

// PUT /api/admin/offers/:id
router.put(
    "/offers/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const updated = updateOffer(req.params.id, req.body || {});
        if (!updated) return next(createError(404, "Offer not found", "NOT_FOUND"));
        res.json(updated);
    })
);

// DELETE /api/admin/offers/:id
router.delete(
    "/offers/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const removed = deleteOffer(req.params.id);
        if (!removed) return next(createError(404, "Offer not found", "NOT_FOUND"));
        res.json({ ok: true });
    })
);

// -------- Users --------

// GET /api/admin/users
router.get(
    "/users",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const users = listUsers().map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
        }));
        res.json(users);
    })
);

// PATCH /api/admin/users/:id  { role: "admin" | "user" }
router.patch(
    "/users/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const role = String(req.body?.role || "").trim();
        if (role !== "admin" && role !== "user") {
            return next(createError(400, "Invalid role", "VALIDATION"));
        }
        const updated = updateUserRole(req.params.id, role);
        if (!updated) return next(createError(404, "User not found", "NOT_FOUND"));

        res.json({
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            createdAt: updated.createdAt,
        });
    })
);

module.exports = router;
