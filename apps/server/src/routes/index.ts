import { Router } from "express";

import assignmentsRouter from "./routes.assignments.js";
import classesRouter from "./routes.classes.js";
import wordBanksRouter from "./routes.word-banks.js";
import documentsRouter from "./routes.documents.js";
import exportsRouter from "./routes.exports.js";
import pupilsRouter from "./routes.pupils.js";
import adminRouter from "./routes.admin.js";

const router = Router();

// Bundle placeholder routes so the client can explore API structure.

// Basic index helps manual testers discover available endpoints.
router.get("/", (_req, res) => {
  res.json({
    message: "WriteTogether API v0",
    endpoints: [
      "/assignments",
      "/classes",
      "/pupils",
      "/word-banks",
      "/documents",
      "/exports/preview",
      "/admin",
    ],
  });
});

router.use("/assignments", assignmentsRouter);
router.use("/classes", classesRouter);
router.use("/word-banks", wordBanksRouter);
router.use("/documents", documentsRouter);
router.use("/exports", exportsRouter);
router.use("/pupils", pupilsRouter);
router.use("/admin", adminRouter);

export default router;
