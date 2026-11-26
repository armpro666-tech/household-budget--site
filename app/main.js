// Harbor & Home Budget — single-page app, hash routing, localStorage persistence.
// No network requests, no external libraries: charts are hand-drawn inline SVG.
import { SEED } from "./data.js";

const KEY = "harbor-home-budget-v1";
const view = document.getElementById("view");
const modalRoot = document.getElementById("modal-root");

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch (e) { /* corrupted storage: fall back to seed */ }
  return structuredClone(SEED);
}
let state = load();
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

const money = (n) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n) => (n < 0 ? "−" : "") + money(n);
const cat = (id) => state.categories.find((c) => c.id === id) || { id, name: "Other", color: "#9a9a9a", budget: 0 };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => { const [y, m, day] = d.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1] + " " + (+day) + ", " + y; };

function monthStats() {
  let income = 0, expenses = 0;
  for (const t of state.transactions) {
    if (t.type === "income") income += t.amount; else expenses += t.amount;
  }
  return { income, expenses, balance: income - expenses, rate: income > 0 ? (income - expenses) / income : 0 };
}
function spentByCat() {
  const out = {};
  for (const t of state.transactions) if (t.type === "expense") out[t.cat] = (out[t.cat] || 0) + t.amount;
  return out;
}
function upcomingBills() {
  return state.bills.filter((b) => !b.paid).sort((a, b) => a.due.localeCompare(b.due));
}

/* ---------- charts (inline SVG, no libraries) ---------- */
function trendChart() {
  const W = 640, H = 240, pad = 34;
  const max = Math.max(...state.history.map((h) => Math.max(h.income, h.expenses))) * 1.08;
  const bw = (W - pad * 2) / state.history.length;
  let bars = "", labels = "";
  state.history.forEach((h, i) => {
    const x = pad + i * bw;
    const ih = (h.income / max) * (H - pad - 30);
    const eh = (h.expenses / max) * (H - pad - 30);
    bars += `<rect x="${x + bw * 0.18}" y="${H - 30 - ih}" width="${bw * 0.28}" height="${ih}" rx="3" fill="#1f4d3a"><title>${h.month} income ${money(h.income)}</title></rect>`;
    bars += `<rect x="${x + bw * 0.52}" y="${H - 30 - eh}" width="${bw * 0.28}" height="${eh}" rx="3" fill="#c96f4a"><title>${h.month} expenses ${money(h.expenses)}</title></rect>`;
    labels += `<text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" font-size="12" fill="#6f7a72">${h.month}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly income and expenses, June to November 2026">
    <line x1="${pad}" y1="${H - 30}" x2="${W - pad}" y2="${H - 30}" stroke="#e8e0d3" stroke-width="2"/>${bars}${labels}
    <text x="${pad}" y="18" font-size="12" fill="#1f4d3a" font-weight="700">■ Income</text>
    <text x="${pad + 80}" y="18" font-size="12" fill="#c96f4a" font-weight="700">■ Expenses</text></svg>`;
}
function donutChart() {
  const spent = spentByCat();
  const entries = Object.entries(spent).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const R = 80, r = 48, cx = 100, cy = 100;
  let angle = -Math.PI / 2, paths = "";
  for (const [cid, v] of entries) {
    const frac = v / total, a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2);
    const x4 = cx + r * Math.cos(angle), y4 = cy + r * Math.sin(angle);
    paths += `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z" fill="${cat(cid).color}"><title>${cat(cid).name} ${money(v)}</title></path>`;
    angle = a2;
  }
  const legend = entries.map(([cid, v]) =>
    `<div><span class="legend-swatch" style="background:${cat(cid).color}"></span>${esc(cat(cid).name)} — <strong>${money(v)}</strong> (${Math.round(v / total * 100)}%)</div>`).join("");
  return `<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">
    <svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="November spending by category">${paths}
    <text x="100" y="96" text-anchor="middle" font-size="13" fill="#6f7a72">Total spent</text>
    <text x="100" y="116" text-anchor="middle" font-size="16" font-weight="800" fill="#22302a">${money(total)}</text></svg>
    <div class="donut-legend" style="flex:1;min-width:220px">${legend}</div></div>`;
}

/* ---------- shared bits ---------- */
function txRow(t) {
  const c = cat(t.cat);
  return `<tr><td>${fmtDate(t.date)}</td>
    <td><strong>${esc(t.desc)}</strong>${t.note ? `<br><span class="muted small">${esc(t.note)}</span>` : ""}</td>
    <td><span class="cat-dot" style="background:${c.color}"></span>${esc(c.name)}</td>
    <td class="num ${t.type === "income" ? "pos" : "neg"}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</td>
    <td class="num"><button class="btn small secondary" data-edit="${t.id}">Edit</button>
    <button class="btn small secondary" data-del="${t.id}">Delete</button></td></tr>`;
}
function setActive(route) {
  document.querySelectorAll(".navlink").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  const due = upcomingBills().length;
  document.getElementById("bills-pill").textContent = due ? due + " due" : "";
}

/* ---------- views ---------- */
function vDashboard() {
  const s = monthStats(), spent = spentByCat();
  const topCats = state.categories.filter((c) => c.budget > 0)
    .map((c) => ({ c, spent: spent[c.id] || 0 }))
    .sort((a, b) => b.spent - a.spent).slice(0, 6);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const bills = upcomingBills().slice(0, 3);
  const goals = [...state.goals].sort((a, b) => b.saved / b.target - a.saved / a.target).slice(0, 2);
  return `<div class="topbar"><h1>Good morning, Alvarez family</h1><span class="date">November 2026 · ${state.transactions.length} transactions this month</span></div>
  <div class="grid g4">
    <div class="card stat income"><div class="label">Income</div><div class="value">${money(s.income)}</div><div class="sub">2 paychecks + freelance + interest</div></div>
    <div class="card stat expense"><div class="label">Expenses</div><div class="value">${money(s.expenses)}</div><div class="sub">${state.transactions.filter((t) => t.type === "expense").length} purchases &amp; bills</div></div>
    <div class="card stat"><div class="label">Left over</div><div class="value ${s.balance >= 0 ? "good" : "warn"}">${signed(s.balance)}</div><div class="sub">Savings rate <strong>${Math.round(s.rate * 100)}%</strong> of income</div></div>
    <div class="card stat"><div class="label">Bills due soon</div><div class="value">${upcomingBills().length}</div><div class="sub">${money(upcomingBills().reduce((a, b) => a + b.amount, 0))} unpaid in December</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>Income vs expenses <span class="muted small">Jun – Nov 2026</span></h2>${trendChart()}
      <p class="muted small">November is the strongest month yet: spending is down from October while income held steady.</p></div>
    <div class="card"><h2>Budget vs actual <a class="small" href="#/budget">Plan →</a></h2>
      ${topCats.map(({ c, spent: sp }) => {
        const pct = c.budget ? Math.min(100, sp / c.budget * 100) : 0;
        const over = sp > c.budget;
        return `<div class="bar-row"><span>${esc(c.name)}</span><div class="bar-track"><div class="bar-fill ${over ? "over" : pct > 85 ? "warn" : ""}" style="width:${pct}%"></div></div><span class="amt">${money(sp)} / ${money(c.budget)}</span></div>`;
      }).join("")}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>Recent transactions <a class="small" href="#/transactions">All →</a></h2>
      <div class="table-wrap"><table><tbody>${recent.map(txRow).join("")}</tbody></table></div></div>
    <div>
      <div class="card"><h2>Upcoming bills <a class="small" href="#/bills">All bills →</a></h2>
        ${bills.map((b) => `<div class="bill"><div class="grow"><div class="name">${esc(b.name)}</div><div class="meta">Due ${fmtDate(b.due)} · ${esc(b.recurring)}</div></div><strong>${money(b.amount)}</strong></div>`).join("")}</div>
      <div class="card" style="margin-top:16px"><h2>Savings goals <a class="small" href="#/goals">All goals →</a></h2>
        ${goals.map((g) => { const p = Math.min(100, g.saved / g.target * 100);
          return `<div class="goal"><div class="goal-head"><strong>${esc(g.name)}</strong><span>${money(g.saved)} of ${money(g.target)}</span></div><div class="progress" style="margin-top:8px"><div style="width:${p}%"></div></div></div>`; }).join("")}</div>
    </div>
  </div>`;
}

function vTransactions(q = "", fcat = "", ftype = "") {
  let list = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (q) list = list.filter((t) => (t.desc + " " + (t.note || "")).toLowerCase().includes(q.toLowerCase()));
  if (fcat) list = list.filter((t) => t.cat === fcat);
  if (ftype) list = list.filter((t) => t.type === ftype);
  const total = list.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  return `<div class="topbar"><h1>Transactions</h1><button class="btn" id="add-tx">+ Add transaction</button></div>
  <div class="card"><div class="toolbar">
    <input class="search" id="q" type="search" placeholder="Search description or note…" value="${esc(q)}" aria-label="Search transactions">
    <select id="fcat" style="max-width:190px" aria-label="Filter by category"><option value="">All categories</option>
      ${state.categories.map((c) => `<option value="${c.id}" ${fcat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <select id="ftype" style="max-width:190px" aria-label="Filter by type"><option value="">Income &amp; expenses</option>
      <option value="income" ${ftype === "income" ? "selected" : ""}>Income only</option>
      <option value="expense" ${ftype === "expense" ? "selected" : ""}>Expenses only</option></select>
    <span class="muted small">${list.length} shown · net ${signed(total)}</span></div>
  <div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
  <tbody>${list.length ? list.map(txRow).join("") : `<tr><td colspan="5" class="muted">No transactions match. Try clearing the search or filter.</td></tr>`}</tbody></table></div></div>`;
}

function vBudget() {
  const spent = spentByCat();
  const totalBudget = state.categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = Object.values(spent).reduce((s, v) => s + v, 0);
  return `<div class="topbar"><h1>Budget planner — November 2026</h1><span class="muted small">Planned ${money(totalBudget)} · spent ${money(totalSpent)}</span></div>
  ${totalSpent > totalBudget ? `<div class="callout" style="margin-bottom:16px"><strong>Over budget overall.</strong> Spending is ${money(totalSpent - totalBudget)} above the plan. Check the categories marked over below.</div>`
    : `<div class="callout green" style="margin-bottom:16px"><strong>On track.</strong> ${money(totalBudget - totalSpent)} of the plan is still unspent, with 4 days left in November.</div>`}
  <div class="card"><p class="muted">Set a monthly limit for each category. Change a number and press <strong>Save budget</strong> — the dashboard and reports update right away.</p>
  ${state.categories.filter((c) => c.id !== "income").map((c) => {
    const sp = spent[c.id] || 0, pct = c.budget ? sp / c.budget * 100 : 0, over = sp > c.budget;
    return `<div class="bar-row" style="grid-template-columns:150px 1fr 110px 150px">
      <span><span class="cat-dot" style="background:${c.color}"></span>${esc(c.name)}</span>
      <div><div class="progress"><div class="${over ? "over" : pct > 85 ? "warn" : ""}" style="width:${Math.min(100, pct)}%"></div></div>
      <div class="small muted" style="margin-top:4px">${money(sp)} spent · ${over ? `<span class="badge red">Over by ${money(sp - c.budget)}</span>` : pct > 85 ? `<span class="badge gold">Almost there</span>` : `${money(c.budget - sp)} left`}</div></div>
      <span class="amt">${Math.round(pct)}%</span>
      <span><label class="small" for="b-${c.id}">Monthly budget ($)</label><input id="b-${c.id}" data-budget="${c.id}" type="number" min="0" step="5" value="${c.budget}"></span></div>`;
  }).join("")}
  <div style="margin-top:16px;display:flex;gap:10px;align-items:center"><button class="btn" id="save-budget">Save budget</button><span class="muted small" id="budget-msg"></span></div></div>`;
}

function vBills() {
  const unpaid = upcomingBills();
  const paid = state.bills.filter((b) => b.paid);
  const unpaidTotal = unpaid.reduce((s, b) => s + b.amount, 0);
  const billRow = (b) => `<div class="bill"><span class="cat-dot" style="background:${cat(b.cat).color}"></span>
    <div class="grow"><div class="name">${esc(b.name)} ${b.paid ? `<span class="badge">Paid</span>` : ""}</div>
    <div class="meta">Due ${fmtDate(b.due)} · ${esc(b.recurring)} · ${esc(b.note)}</div></div>
    <strong>${money(b.amount)}</strong>
    <button class="btn small ${b.paid ? "secondary" : ""}" data-bill="${b.id}">${b.paid ? "Mark unpaid" : "Mark paid"}</button></div>`;
  return `<div class="topbar"><h1>Bills</h1><span class="muted small">${unpaid.length} unpaid · ${money(unpaidTotal)} still to pay</span></div>
  <div class="card"><h2>Upcoming</h2>${unpaid.length ? unpaid.map(billRow).join("") : `<p class="muted">All caught up — no unpaid bills.</p>`}</div>
  <div class="card" style="margin-top:16px"><h2>Paid</h2>${paid.length ? paid.map(billRow).join("") : `<p class="muted">Nothing marked paid yet.</p>`}</div>`;
}

function vGoals() {
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  return `<div class="topbar"><h1>Savings goals</h1><button class="btn" id="add-goal">+ New goal</button></div>
  <div class="card" style="margin-bottom:16px"><div class="stat"><div class="label">Total saved toward goals</div>
  <div class="value good">${money(totalSaved)} <span class="muted small" style="font-size:15px">of ${money(totalTarget)} (${Math.round(totalSaved / totalTarget * 100)}%)</span></div>
  <div class="sub">At the current pace of ${money(685)} a month, the emergency fund is fully funded in about 6 months.</div></div></div>
  <div class="grid g2">${state.goals.map((g) => { const p = Math.min(100, g.saved / g.target * 100);
    return `<div class="card"><div class="goal-head"><h2>${esc(g.name)}</h2><span class="badge ${p >= 100 ? "" : "grey"}">${Math.round(p)}%</span></div>
    <p class="muted">${esc(g.note)}</p>
    <div class="progress"><div style="width:${p}%"></div></div>
    <p style="margin-top:8px"><strong>${money(g.saved)}</strong> saved of ${money(g.target)} · <span class="muted">${money(g.target - g.saved)} to go</span></p>
    <button class="btn small" data-contribute="${g.id}">Add money</button></div>`; }).join("")}</div>`;
}

function vReports() {
  const s = monthStats(), spent = spentByCat();
  const top = Object.entries(spent).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="topbar"><h1>Reports — November 2026</h1><button class="btn" id="export-csv">Export transactions (CSV)</button></div>
  <div class="grid g2">
    <div class="card"><h2>Where the money went</h2>${donutChart()}</div>
    <div class="card"><h2>Income vs expenses</h2>${trendChart()}
      <div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Expenses</th><th class="num">Saved</th></tr></thead><tbody>
      ${state.history.map((h) => `<tr><td>${h.month} 2026</td><td class="num pos">${money(h.income)}</td><td class="num neg">${money(h.expenses)}</td><td class="num">${money(h.income - h.expenses)}</td></tr>`).join("")}
      </tbody></table></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h2>Top spending categories</h2>
    <div class="table-wrap"><table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th></tr></thead><tbody>
    ${top.map(([cid, v]) => `<tr><td><span class="cat-dot" style="background:${cat(cid).color}"></span>${esc(cat(cid).name)}</td><td class="num">${money(v)}</td><td class="num">${Math.round(v / s.expenses * 100)}%</td><td class="num">${money(cat(cid).budget)}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="muted small" style="margin-top:12px">CSV export downloads every transaction in the file, with date, description, category, type, amount and note — ready to open in a spreadsheet.</p>
    <p class="muted small" id="csv-msg"></p></div>`;
}

/* ---------- modal forms ---------- */
function openModal(html) {
  modalRoot.innerHTML = `<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  document.getElementById("modal-back").addEventListener("click", (e) => { if (e.target.id === "modal-back") closeModal(); });
}
function closeModal() { modalRoot.innerHTML = ""; }

function txForm(t) {
  const isNew = !t;
  const d = t || { date: "2026-11-26", desc: "", cat: "groceries", type: "expense", amount: "", note: "" };
  openModal(`<h2>${isNew ? "Add transaction" : "Edit transaction"}</h2>
  <form id="tx-form">
    <div class="field"><label for="f-desc">Description</label><input id="f-desc" required maxlength="80" value="${esc(d.desc)}" placeholder="e.g. Whole Foods Market"></div>
    <div class="form-grid">
      <div class="field"><label for="f-date">Date</label><input id="f-date" type="date" required value="${esc(d.date)}"></div>
      <div class="field"><label for="f-amount">Amount ($)</label><input id="f-amount" type="number" min="0.01" step="0.01" required value="${d.amount}"></div>
      <div class="field"><label for="f-cat">Category</label><select id="f-cat">${state.categories.map((c) => `<option value="${c.id}" ${d.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-type">Type</label><select id="f-type"><option value="expense" ${d.type === "expense" ? "selected" : ""}>Expense</option><option value="income" ${d.type === "income" ? "selected" : ""}>Income</option></select></div>
    </div>
    <div class="field"><label for="f-note">Note (optional)</label><input id="f-note" maxlength="120" value="${esc(d.note || "")}" placeholder="What was this for?"></div>
    <div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancel</button><button class="btn" type="submit">${isNew ? "Add" : "Save changes"}</button></div>
  </form>`);
  document.getElementById("cancel").onclick = closeModal;
  document.getElementById("tx-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const rec = {
      id: t ? t.id : "t" + Date.now().toString(36),
      date: document.getElementById("f-date").value,
      desc: document.getElementById("f-desc").value.trim(),
      cat: document.getElementById("f-cat").value,
      type: document.getElementById("f-type").value,
      amount: Math.round(parseFloat(document.getElementById("f-amount").value) * 100) / 100,
      note: document.getElementById("f-note").value.trim(),
    };
    if (!rec.desc || !(rec.amount > 0) || !rec.date) return;
    if (t) { const i = state.transactions.findIndex((x) => x.id === t.id); state.transactions[i] = rec; }
    else state.transactions.push(rec);
    save(); closeModal(); render();
  });
}

function goalForm(g) {
  openModal(`<h2>${g ? "Add money to " + esc(g.name) : "New savings goal"}</h2>
  <form id="goal-form">
    ${g ? `<div class="field"><label for="g-amount">Amount to add ($)</label><input id="g-amount" type="number" min="1" step="1" required value="100"></div>
    <p class="muted small">Currently saved: ${money(g.saved)} of ${money(g.target)}.</p>`
    : `<div class="field"><label for="g-name">Goal name</label><input id="g-name" required maxlength="60" placeholder="e.g. New bikes for the kids"></div>
    <div class="form-grid"><div class="field"><label for="g-target">Target amount ($)</label><input id="g-target" type="number" min="1" step="10" required value="1000"></div>
    <div class="field"><label for="g-saved">Already saved ($)</label><input id="g-saved" type="number" min="0" step="10" value="0"></div></div>
    <div class="field"><label for="g-note">Note</label><input id="g-note" maxlength="120" placeholder="Why are you saving for this?"></div>`}
    <div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancel</button><button class="btn" type="submit">Save</button></div>
  </form>`);
  document.getElementById("cancel").onclick = closeModal;
  document.getElementById("goal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (g) {
      g.saved = Math.round((g.saved + parseFloat(document.getElementById("g-amount").value)) * 100) / 100;
    } else {
      state.goals.push({ id: "g" + Date.now().toString(36), name: document.getElementById("g-name").value.trim(),
        target: parseFloat(document.getElementById("g-target").value),
        saved: parseFloat(document.getElementById("g-saved").value) || 0,
        note: document.getElementById("g-note").value.trim() || "A new goal for the household." });
    }
    save(); closeModal(); render();
  });
}

function exportCSV() {
  const rows = [["Date", "Description", "Category", "Type", "Amount (USD)", "Note"]];
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  for (const t of [...state.transactions].sort((a, b) => a.date.localeCompare(b.date)))
    rows.push([t.date, q(t.desc), cat(t.cat).name, t.type, t.amount.toFixed(2), q(t.note || "")]);
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "alvarez-household-transactions-nov-2026.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const msg = document.getElementById("csv-msg");
  if (msg) msg.textContent = `Exported ${state.transactions.length} transactions to alvarez-household-transactions-nov-2026.csv.`;
}

/* ---------- router ---------- */
let filters = { q: "", fcat: "", ftype: "" };
function render() {
  const hash = location.hash.replace(/^#\/?/, "");
  const route = hash.split("/")[0] || "";
  setActive(route);
  if (route === "transactions") view.innerHTML = vTransactions(filters.q, filters.fcat, filters.ftype);
  else if (route === "budget") view.innerHTML = vBudget();
  else if (route === "bills") view.innerHTML = vBills();
  else if (route === "goals") view.innerHTML = vGoals();
  else if (route === "reports") view.innerHTML = vReports();
  else view.innerHTML = vDashboard();
  bind();
}
function bind() {
  const addTx = document.getElementById("add-tx");
  if (addTx) addTx.onclick = () => txForm(null);
  const q = document.getElementById("q");
  if (q) q.addEventListener("input", (e) => { filters.q = e.target.value; const pos = e.target.selectionStart; render(); const nq = document.getElementById("q"); if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); } });
  const fc = document.getElementById("fcat");
  if (fc) fc.onchange = (e) => { filters.fcat = e.target.value; render(); };
  const ft = document.getElementById("ftype");
  if (ft) ft.onchange = (e) => { filters.ftype = e.target.value; render(); };
  view.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => txForm(state.transactions.find((t) => t.id === b.dataset.edit)));
  view.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    const t = state.transactions.find((x) => x.id === b.dataset.del);
    openModal(`<h2>Delete this transaction?</h2><p><strong>${esc(t.desc)}</strong> — ${money(t.amount)} on ${fmtDate(t.date)}. This cannot be undone.</p>
      <div class="modal-actions"><button class="btn secondary" id="cancel">Keep it</button><button class="btn terra" id="confirm-del">Delete</button></div>`);
    document.getElementById("cancel").onclick = closeModal;
    document.getElementById("confirm-del").onclick = () => { state.transactions = state.transactions.filter((x) => x.id !== t.id); save(); closeModal(); render(); };
  });
  const saveB = document.getElementById("save-budget");
  if (saveB) saveB.onclick = () => {
    document.querySelectorAll("[data-budget]").forEach((inp) => {
      const c = state.categories.find((x) => x.id === inp.dataset.budget);
      if (c) c.budget = Math.max(0, parseFloat(inp.value) || 0);
    });
    save(); render();
    const m = document.getElementById("budget-msg");
    if (m) m.textContent = "Budget saved.";
  };
  view.querySelectorAll("[data-bill]").forEach((b) => b.onclick = () => {
    const bill = state.bills.find((x) => x.id === b.dataset.bill);
    bill.paid = !bill.paid; save(); render();
  });
  view.querySelectorAll("[data-contribute]").forEach((b) => b.onclick = () => goalForm(state.goals.find((g) => g.id === b.dataset.contribute)));
  const addGoal = document.getElementById("add-goal");
  if (addGoal) addGoal.onclick = () => goalForm(null);
  const exp = document.getElementById("export-csv");
  if (exp) exp.onclick = exportCSV;
}
window.addEventListener("hashchange", render);
render();
