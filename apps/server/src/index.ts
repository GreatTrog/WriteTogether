import http from "node:http";
import app from "./server";

const port = Number(process.env.PORT || 4000);

const server = http.createServer(app);

// Stand up the Express app without any dev-specific tooling to mimic production hosting.
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`WriteTogether API listening on http://localhost:${port}`);
});
