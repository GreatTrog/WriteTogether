import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import app from "./server.js";

const port = Number(process.env.PORT || 4000);

const server = http.createServer(app);

// Stand up the Express app without any dev-specific tooling to mimic production hosting.
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`WriteTogether API listening on http://localhost:${port}`);
});
