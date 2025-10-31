import { Router } from "express";

const wordBanksRouter = Router();

// Placeholder endpoints keep the contract visible while the data layer is built.

wordBanksRouter.get("/", (_req, res) => {
  res.json({ wordBanks: [] });
});

wordBanksRouter.post("/", (req, res) => {
  const bank = req.body;
  res.status(201).json({ wordBank: bank });
});

export default wordBanksRouter;
