const router = require("express").Router();
const { makePlan } = require("../planner/plan");
const { validatePlan } = require("../validators/plan");
const { requireAuth, requirePermission } = require("../auth/middleware");
const { PERMISSIONS } = require("../auth/permissions");
const { trackEvent } = require("../analytics/metrics");

// POST /api/plan
router.post("/", requireAuth, requirePermission(PERMISSIONS.PLAN_WRITE), (req, res) => {
    const { ok, errors, value } = validatePlan(req.body);
    if (!ok) return res.status(400).json({ message: "Validation failed", errors });

    const plan = makePlan({
        city: value.city,
        days: value.days,
        budget: value.budget,
        interests: value.interests,
    });

    trackEvent("plan_generated", { userId: req.user?.id || null, city: value.city });
    res.json(plan);
});

module.exports = router;
