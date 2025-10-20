import { Router } from "express";

const classesRouter = Router();

// Placeholder endpoints keep the contract visible while the data layer is built.

classesRouter.get("/", (_req, res) => {
  res.json({ classes: [] });
});

classesRouter.post("/", (req, res) => {
  const classroom = req.body;
  res.status(201).json({ class: classroom });
});

export default classesRouter;
