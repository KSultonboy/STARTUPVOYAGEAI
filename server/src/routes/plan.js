// server/src/routes/plan.js
const router = require("express").Router();

const { asyncHandler } = require("../utils/asyncHandler");
const { createError } = require("../utils/errors");

const { requireAuth } = require("../auth/middleware");

const { validatePlan } = require("../validators/plan");
const { makePlan } = require("../planner/plan");
const { trackEvent } = require("../analytics/metrics");

// POST /api/plan
router.post(
    "/",
    requireAuth,
    asyncHandler(async (req, res) => {
        const { ok, errors, value } = validatePlan(req.body || {});
        if (!ok) {
            return res.status(400).json({ message: "Validation failed", errors });
        }

        const plan = makePlan(value);

        // analytics
        trackEvent("plan_generated", {
            userId: req.user?.id || null,
            city: value.city,
            days: value.days,
            budget: value.budget,
            interestsCount: (value.interests || []).length,
        });

        res.json(plan);
    })
);

module.exports = router;
