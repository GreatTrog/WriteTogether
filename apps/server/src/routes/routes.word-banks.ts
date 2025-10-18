import { Router } from "express";

const wordBanksRouter = Router();

wordBanksRouter.get("/", (_req, res) => {
  res.json({ wordBanks: [] });
});

wordBanksRouter.post("/", (req, res) => {
  const bank = req.body;
  res.status(201).json({ wordBank: bank });
});

export default wordBanksRouter;
