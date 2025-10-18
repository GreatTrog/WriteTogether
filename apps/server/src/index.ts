import http from "node:http";
import app from "./server";

const port = Number(process.env.PORT || 4000);

const server = http.createServer(app);

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`WriteTogether API listening on http://localhost:${port}`);
});
