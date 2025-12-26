// server/src/routes/admin.js
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

    listCountries,
    listCities,
    findCountryById,
    findCountryByName,
    createCountry,
    deleteCountry,
    findCityByName,
    createCity,
    deleteCity,
} = require("../storage/dataStore");

const { getOverview } = require("../analytics/metrics");
const { validatePlace, validateOffer, validateRole } = require("../validators/admin");

const adminOnly = [requireAuth, requireRole("admin")];

// GET /api/admin/overview
router.get(
    "/overview",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(getOverview());
    })
);

// -------- Places --------
router.get(
    "/places",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(listPlaces());
    })
);

router.post(
    "/places",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const { ok, errors, value } = validatePlace(req.body || {});
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });
        const created = createPlace(value);
        res.status(201).json(created);
    })
);

router.put(
    "/places/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validatePlace(req.body || {});
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const updated = updatePlace(req.params.id, value);
        if (!updated) return next(createError(404, "Place not found", "NOT_FOUND"));
        res.json(updated);
    })
);

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
router.get(
    "/offers",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(listOffers());
    })
);

router.post(
    "/offers",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const { ok, errors, value } = validateOffer(req.body || {});
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });
        const created = createOffer(value);
        res.status(201).json(created);
    })
);

router.put(
    "/offers/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateOffer(req.body || {});
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const updated = updateOffer(req.params.id, value);
        if (!updated) return next(createError(404, "Offer not found", "NOT_FOUND"));
        res.json(updated);
    })
);

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

router.patch(
    "/users/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const { ok, errors, value } = validateRole(req.body || {});
        if (!ok) return res.status(400).json({ message: "Validation failed", errors });

        const updated = updateUserRole(req.params.id, value.role);
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

// -------- Locations --------
router.get(
    "/locations/countries",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        res.json(listCountries());
    })
);

router.post(
    "/locations/countries",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const name = String(req.body?.name || "").trim();
        if (!name) return next(createError(400, "Country name is required", "VALIDATION"));
        if (findCountryByName(name)) return next(createError(409, "Country already exists", "ALREADY_EXISTS"));
        const created = createCountry({ name });
        res.status(201).json(created);
    })
);

router.delete(
    "/locations/countries/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const removed = deleteCountry(req.params.id);
        if (!removed) return next(createError(404, "Country not found", "NOT_FOUND"));
        res.json({ ok: true });
    })
);

router.get(
    "/locations/cities",
    ...adminOnly,
    asyncHandler(async (req, res) => {
        const countryId = typeof req.query.countryId === "string" ? req.query.countryId : null;
        const countries = listCountries();
        const countryMap = new Map(countries.map((c) => [c.id, c]));

        let cities = listCities();
        if (countryId) cities = cities.filter((c) => c.countryId === countryId);

        const result = cities.map((c) => ({
            id: c.id,
            name: c.name,
            countryId: c.countryId,
            country: countryMap.get(c.countryId)?.name || null,
        }));

        res.json(result);
    })
);

router.post(
    "/locations/cities",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const name = String(req.body?.name || "").trim();
        const countryId = String(req.body?.countryId || "").trim();

        if (!name || !countryId) {
            return next(createError(400, "City name and countryId are required", "VALIDATION"));
        }

        const country = findCountryById(countryId);
        if (!country) return next(createError(404, "Country not found", "NOT_FOUND"));

        if (findCityByName(name, countryId)) {
            return next(createError(409, "City already exists", "ALREADY_EXISTS"));
        }

        const created = createCity({ name, countryId });
        res.status(201).json({
            id: created.id,
            name: created.name,
            countryId: created.countryId,
            country: country.name,
        });
    })
);

router.delete(
    "/locations/cities/:id",
    ...adminOnly,
    asyncHandler(async (req, res, next) => {
        const removed = deleteCity(req.params.id);
        if (!removed) return next(createError(404, "City not found", "NOT_FOUND"));
        res.json({ ok: true });
    })
);

module.exports = router;
