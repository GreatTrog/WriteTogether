import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import router from "./routes";

const app = express();

// Harden and expose the minimal API used by the prototype front-end.
app.use(helmet());
const resolvedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (resolvedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

app.options("*", cors());
app.use(express.json());
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
