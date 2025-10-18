import { Router } from "express";

const assignmentsRouter = Router();

assignmentsRouter.get("/", (_req, res) => {
  res.json({ assignments: [] });
});

assignmentsRouter.post("/", (req, res) => {
  const assignment = req.body;
  // TODO: persist via data layer
  res.status(201).json({ assignment });
});

export default assignmentsRouter;
