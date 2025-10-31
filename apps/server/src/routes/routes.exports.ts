import { Router } from "express";

const exportsRouter = Router();

// Simulate the export queue so the UI can demo status messaging.

exportsRouter.post("/preview", (req, res) => {
  const content: string = req.body?.content ?? "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  res.json({
    status: "queued",
    wordCount,
    downloadUrl: null,
    message:
      "Export job queued. In production this would return a signed download link.",
  });
});

export default exportsRouter;
