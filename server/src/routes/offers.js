// server/src/routes/offers.js
const router = require("express").Router();
const { listOffers } = require("../storage/dataStore");
const { requireAuth, requirePermission } = require("../auth/middleware");
const { PERMISSIONS } = require("../auth/permissions");

// GET /api/offers?city=Tashkent&budget=comfort
router.get("/", requireAuth, requirePermission(PERMISSIONS.OFFERS_READ), (req, res) => {
    const city = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : undefined;
    const budget = typeof req.query.budget === "string" ? req.query.budget.trim().toLowerCase() : undefined;

    let list = listOffers();

    if (city) list = list.filter((o) => String(o.city || "").toLowerCase() === city);
    if (budget) list = list.filter((o) => String(o.budget || "").toLowerCase() === budget);

    res.json(list);
});

module.exports = router;
