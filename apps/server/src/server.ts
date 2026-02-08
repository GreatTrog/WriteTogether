import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import router from "./routes/index.js";

const app = express();
app.enable("trust proxy");
const requireHttps =
  process.env.REQUIRE_HTTPS === "true" ||
  (process.env.REQUIRE_HTTPS !== "false" &&
    process.env.NODE_ENV === "production");

if (requireHttps) {
  app.use((req, res, next) => {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto?.split(",")[0];
    if (req.secure || proto === "https") {
      return next();
    }
    return res.status(426).json({
      error: "HTTPS required",
      message: "This API only accepts HTTPS requests in production.",
    });
  });
}

// Harden and expose the minimal API used by the prototype front-end.
app.use(helmet());
const resolvedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!resolvedOrigins.includes("https://write-together-web.vercel.app")) {
  resolvedOrigins.push("https://write-together-web.vercel.app");
}

app.use((req, res, next) => {
  if (req.method !== "OPTIONS") {
    return next();
  }
  const origin = req.headers.origin;
  if (origin && resolvedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  res.status(204).end();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (resolvedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

// Health check keeps deployment monitors simple.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Route modules live under a single /api namespace for clarity.
app.use("/api", router);

// Fallback keeps the JSON contract consistent for unknown routes.
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;
