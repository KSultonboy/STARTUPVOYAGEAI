const router = require("express").Router();
const { listOffers } = require("../storage/dataStore");
const { requireAuth, requirePermission } = require("../auth/middleware");
const { PERMISSIONS } = require("../auth/permissions");

// GET /api/offers?city=Tashkent&budget=comfort
router.get("/", requireAuth, requirePermission(PERMISSIONS.OFFERS_READ), (req, res) => {
    const city = typeof req.query.city === "string" ? req.query.city.toLowerCase() : undefined;
    const budget = typeof req.query.budget === "string" ? req.query.budget.toLowerCase() : undefined;
    let list = listOffers();

    if (city) list = list.filter((o) => o.city.toLowerCase() === city);
    if (budget) list = list.filter((o) => o.budget === budget);

    res.json(list);
});

module.exports = router;
