// scripts/playtest.mjs — exercise every section of Harbor & Home Budget.
// Usage: node scripts/playtest.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

import http from "node:http";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const f = path.join(appDir, req.url.split("?")[0].split("#")[0] === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0].slice(1)));
  if (!f.startsWith(appDir) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const app = base + "/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const badRequests = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => badRequests.push(r.url()));
page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) badRequests.push("EXTERNAL: " + r.url()); });

const check = (name, ok) => console.log((ok ? "PASS" : "FAIL") + " — " + name);
await page.goto(app, { waitUntil: "load" });
await page.waitForTimeout(500);

// 1. Dashboard renders with real figures
const dash = await page.textContent("#view");
check("dashboard shows income $8,138.25", dash.includes("$8,138.25"));
check("dashboard shows expenses $4,710.18", dash.includes("$4,710.18"));
check("dashboard shows savings rate", dash.includes("Savings rate"));

// 2. Click every nav link
for (const route of ["transactions", "budget", "bills", "goals", "reports"]) {
  await page.click(`a[href="#/${route}"]`);
  await page.waitForTimeout(300);
  const heading = await page.textContent("h1");
  check(`nav #/${route} renders (h1: ${heading})`, heading.length > 0);
  check(`hash is #/${route}`, page.url().includes(`#/${route}`));
}
await page.click('a[href="#/"]');
await page.waitForTimeout(300);

// 3. Transactions: search, then add one
await page.click('a[href="#/transactions"]');
await page.waitForTimeout(300);
await page.fill("#q", "Whole Foods");
await page.waitForTimeout(300);
const rows = await page.locator("tbody tr").count();
check(`search "Whole Foods" finds rows (${rows})`, rows >= 3);
await page.fill("#q", "");
await page.waitForTimeout(300);
await page.click("#add-tx");
await page.fill("#f-desc", "Test Bakery");
await page.fill("#f-amount", "12.50");
await page.click('button[type="submit"]');
await page.waitForTimeout(300);
const afterAdd = await page.textContent("#view");
check("added transaction appears", afterAdd.includes("Test Bakery"));

// 4. Edit it, then delete it
await page.fill("#q", "Test Bakery");
await page.waitForTimeout(300);
await page.click("[data-edit]");
await page.fill("#f-amount", "15.00");
await page.click('button[type="submit"]');
await page.waitForTimeout(300);
check("edited transaction shows $15.00", (await page.textContent("#view")).includes("$15.00"));
await page.fill("#q", "Test Bakery");
await page.waitForTimeout(300);
await page.click("[data-del]");
await page.click("#confirm-del");
await page.waitForTimeout(300);
check("deleted transaction gone", !(await page.textContent("#view")).includes("Test Bakery"));
await page.fill("#q", "");
await page.waitForTimeout(200);

// 5. Budget: change Groceries budget and save
await page.click('a[href="#/budget"]');
await page.waitForTimeout(300);
await page.fill("#b-groceries", "800");
await page.click("#save-budget");
await page.waitForTimeout(300);
check("budget saved message", (await page.textContent("#view")).includes("Budget saved"));
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("harbor-home-budget-v1")).categories.find((c) => c.id === "groceries").budget);
check("groceries budget persisted as 800", stored === 800);

// 6. Bills: toggle one bill paid
await page.click('a[href="#/bills"]');
await page.waitForTimeout(300);
const before = await page.textContent("#view");
await page.locator("[data-bill]").first().click();
await page.waitForTimeout(300);
check("bill toggle changes view", (await page.textContent("#view")) !== before);

// 7. Goals: add money to a goal
await page.click('a[href="#/goals"]');
await page.waitForTimeout(300);
const goalBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("harbor-home-budget-v1")).goals[0].saved);
await page.locator("[data-contribute]").first().click();
await page.fill("#g-amount", "50");
await page.click('button[type="submit"]');
await page.waitForTimeout(300);
const goalAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("harbor-home-budget-v1")).goals[0].saved);
check(`goal contribution saved (${goalBefore} -> ${goalAfter})`, goalAfter === goalBefore + 50);

// 8. Reports: CSV export produces a download
await page.click('a[href="#/reports"]');
await page.waitForTimeout(300);
const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
await page.click("#export-csv");
const dl = await downloadPromise;
const dlPath = path.join("/tmp", "budget-test-export.csv");
await dl.saveAs(dlPath);
const csv = fs.readFileSync(dlPath, "utf8");
check(`CSV export has header + rows (${csv.split("\n").length} lines)`, csv.startsWith("Date,Description,Category,Type,Amount (USD),Note") && csv.split("\n").length > 40);
check("CSV contains a sample transaction", csv.includes("Whole Foods Market"));

console.log("console errors:", errors.length ? errors : "none");
console.log("failed/external requests:", badRequests.length ? badRequests : "none");
await browser.close();
server.close();
if (errors.length || badRequests.length) process.exit(1);
console.log("PLAYTEST OK");
