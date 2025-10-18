import { Router } from "express";

const classesRouter = Router();

classesRouter.get("/", (_req, res) => {
  res.json({ classes: [] });
});

classesRouter.post("/", (req, res) => {
  const classroom = req.body;
  res.status(201).json({ class: classroom });
});

export default classesRouter;
