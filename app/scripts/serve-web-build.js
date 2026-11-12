// Serves the exported web build for Playwright. Unknown paths get index.html, the same as the rewrite
// rule on the Render static site, so opening /map directly works.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const dist = path.join(__dirname, "..", "..", "dist");
const port = Number(process.env.PORT ?? 8081);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf" };

http
  .createServer((request, response) => {
    const requested = path.normalize(path.join(dist, decodeURIComponent(new URL(request.url, "http://localhost").pathname)));
    const isFile = requested.startsWith(dist) && fs.existsSync(requested) && fs.statSync(requested).isFile();
    const file = isFile ? requested : path.join(dist, "index.html");
    response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () => console.log(`Serving ${dist} on http://localhost:${port}`));
