import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import router from "./routes";

const app = express();

// Harden and expose the minimal API used by the prototype front-end.
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
    credentials: true,
  }),
);
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
