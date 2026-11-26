// scripts/shots.mjs — capture 4 real renders of Harbor & Home Budget.
// Usage: node scripts/shots.mjs   (playwright is in scripts/node_modules)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

import http from "node:http";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const outDir = path.join(root, "screenshots");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const f = path.join(appDir, req.url.split("?")[0].split("#")[0] === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0].slice(1)));
  if (!f.startsWith(appDir) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { file: "1-dashboard.jpg", hash: "#/", width: 1280, height: 800 },
  { file: "2-transactions.jpg", hash: "#/transactions", width: 1280, height: 800 },
  { file: "3-reports.jpg", hash: "#/reports", width: 1280, height: 800 },
  { file: "4-phone.jpg", hash: "#/", width: 390, height: 844 },
];

const browser = await chromium.launch();
const errors = [];
const badRequests = [];
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(s.file + ": " + m.text()); });
  page.on("pageerror", (e) => errors.push(s.file + ": " + String(e)));
  page.on("requestfailed", (r) => badRequests.push(s.file + ": " + r.url()));
  page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) badRequests.push("EXTERNAL: " + r.url()); });
  await page.goto(`${base}/${s.hash}`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, s.file), type: "jpeg", quality: 85 });
  const size = fs.statSync(path.join(outDir, s.file)).size;
  console.log(s.file, size + " bytes", size <= 262144 ? "OK" : "OVER 256 KiB");
  await page.close();
}
await browser.close();
server.close();
console.log("console errors:", errors.length ? errors : "none");
console.log("failed/external requests:", badRequests.length ? badRequests : "none");
if (errors.length || badRequests.length) process.exit(1);
console.log("OK — real screenshots in screenshots/");
