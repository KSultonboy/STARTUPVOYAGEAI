require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const placesRoutes = require("./src/routes/places");
const planRoutes = require("./src/routes/plan");
const offersRoutes = require("./src/routes/offers");
const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const { seedAdmin } = require("./src/auth/seed");
const { config, assertProductionConfig } = require("./src/config");
const { DATA_PATH, flush } = require("./src/storage/dataStore");

const app = express();
assertProductionConfig();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
    const id =
        typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    req.id = id;
    res.setHeader("x-request-id", id);
    next();
});

morgan.token("id", (req) => req.id || "-");

// ✅ CORS: mobile’da origin bo‘lmasligi mumkin => allow. Aks holda explicit reject.
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (config.corsOrigins.includes("*")) return callback(null, true);
            if (config.corsOrigins.includes(origin)) return callback(null, true);
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: config.bodyLimit }));

if (config.logFormat !== "none") {
    app.use(morgan(config.logFormat));
}

app.use(
    rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

app.use(
    "/api/auth",
    rateLimit({
        windowMs: config.authRateLimit.windowMs,
        max: config.authRateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

app.get("/health", (req, res) =>
    res.json({ ok: true, name: "Voyage AI Server", env: config.env, ts: Date.now() })
);

app.use("/api/places", placesRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

seedAdmin().catch((err) => {
    console.error("Admin seed failed:", err.message || err);
});

app.use((req, res) => {
    res.status(404).json({ message: "Route not found", requestId: req.id });
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (!config.isProd) {
        console.error(`[error] ${req.id || "-"} ${err.stack || err.message || err}`);
    } else {
        console.error(`[error] ${req.id || "-"} ${status} ${err.message || "Server error"}`);
    }
    res.status(status).json({
        message: err.message || "Server error",
        code: err.code || "SERVER_ERROR",
        requestId: req.id,
    });
});

const server = app.listen(config.port, () => {
    console.log(`Voyage AI server running on http://localhost:${config.port}`);
    console.log(`Data store: ${DATA_PATH}`);
});

function shutdown(signal) {
    console.log(`[shutdown] ${signal} received, closing server...`);
    try {
        flush();
    } catch (err) {
        console.error("[shutdown] failed to flush data store:", err?.message || err);
    }
    server.close(() => process.exit(0));
    const timeout = setTimeout(() => process.exit(1), 5000);
    if (typeof timeout.unref === "function") timeout.unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
    console.error("[fatal] uncaughtException", err);
    shutdown("uncaughtException");
});
process.on("unhandledRejection", (err) => {
    console.error("[fatal] unhandledRejection", err);
    shutdown("unhandledRejection");
});
