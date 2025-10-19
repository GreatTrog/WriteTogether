import { Router } from "express";

const documentsRouter = Router();

// Placeholder endpoints keep the contract visible while the data layer is built.

documentsRouter.get("/", (_req, res) => {
  res.json({ documents: [] });
});

documentsRouter.post("/", (req, res) => {
  const document = req.body;
  res.status(201).json({ document });
});

export default documentsRouter;
