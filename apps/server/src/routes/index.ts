import { Router } from "express";

import assignmentsRouter from "./routes.assignments";
import classesRouter from "./routes.classes";
import wordBanksRouter from "./routes.word-banks";
import documentsRouter from "./routes.documents";
import exportsRouter from "./routes.exports";
import pupilsRouter from "./routes.pupils";

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
    ],
  });
});

router.use("/assignments", assignmentsRouter);
router.use("/classes", classesRouter);
router.use("/word-banks", wordBanksRouter);
router.use("/documents", documentsRouter);
router.use("/exports", exportsRouter);
router.use("/pupils", pupilsRouter);

export default router;
