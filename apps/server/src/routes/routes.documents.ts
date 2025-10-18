import { Router } from "express";

const documentsRouter = Router();

documentsRouter.get("/", (_req, res) => {
  res.json({ documents: [] });
});

documentsRouter.post("/", (req, res) => {
  const document = req.body;
  res.status(201).json({ document });
});

export default documentsRouter;
