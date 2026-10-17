const DB_NAME = "PaymentCalculatorDB";
const DB_VERSION = 1;
let db;
let currentCalculation = null;
let currentReceipt = null;

const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
const qty = (n) => Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:3, maximumFractionDigits:3});
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains("transactions")) {
        const store = database.createObjectStore("transactions", {keyPath:"receiptNo"});
        store.createIndex("dateTime", "timestamp");
        store.createIndex("company", "company");
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
function allTransactions() {
  return new Promise((resolve, reject) => {
    const req = db.transaction("transactions", "readonly").objectStore("transactions").getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.timestamp-a.timestamp));
    req.onerror = () => reject(req.error);
  });
}
function saveTransaction(tx) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("transactions", "readwrite").objectStore("transactions").add(tx);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function importTransaction(tx) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("transactions", "readwrite").objectStore("transactions").put(tx);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function removeTransaction(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("transactions", "readwrite").objectStore("transactions").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function calculate() {
  const company = $("company").value;
  const customer = $("customer").value.trim();
  const weight = Number($("weight").value);
  const price = Number($("price").value);
  if (!customer) { alert("Please enter the customer name."); $("customer").focus(); return; }
  if (!Number.isFinite(weight) || !Number.isFinite(price) || weight <= 0 || price <= 0) {
    alert("Weight and price must both be greater than zero."); return;
  }
  const weightDeduction = weight * 3.5 / 100;
  const netWeight = weight - weightDeduction;
  const amount = netWeight * price;
  const labour = weight * 25;
  const amountAfterLabour = amount - labour;
  if (amountAfterLabour < 0) { alert("Amount after labour cannot be negative."); return; }
  const deduction1Percent = amountAfterLabour * 0.01;
  const finalPayment = amountAfterLabour - deduction1Percent;
  currentCalculation = {company, customer, weight, price, weightDeduction, netWeight, amount, labour, amountAfterLabour, deduction1Percent, finalPayment};
  $("calculation").innerHTML = `
    <div class="result-row"><span>Company</span><strong>${esc(company)}</strong></div>
    <div class="result-row"><span>Actual weight</span><strong>${qty(weight)} qtl</strong></div>
    <div class="result-row"><span>Weight deduction</span><strong>${qty(weightDeduction)} qtl</strong></div>
    <div class="result-row"><span>Net weight</span><strong>${qty(netWeight)} qtl</strong></div>
    <div class="result-row"><span>Amount after weight deduction</span><strong>${money(amount)}</strong></div>
    <div class="result-row"><span>Labour charges</span><strong>${money(labour)}</strong></div>
    <div class="result-row"><span>Amount after labour</span><strong>${money(amountAfterLabour)}</strong></div>
    <div class="result-row"><span>1% deduction</span><strong>${money(deduction1Percent)}</strong></div>
    <hr style="border:0;border-top:1px solid #cce2d6">
    <div class="small">FINAL PAYMENT</div><div class="big">${money(finalPayment)}</div>`;
  $("calculation").classList.remove("hidden");
  $("saveBtn").classList.remove("hidden");
}

function makeReceipt(tx) {
  const date = tx.dateTime;
  return `<div class="center">================================</div>
    <h3>${esc(tx.company)}</h3><h3>PAYMENT RECEIPT</h3>
    <div class="center">================================</div>
    <div>Receipt No: ${esc(tx.receiptNo)}</div><div>Date: ${esc(date)}</div>
    <div class="line"></div><strong>CUSTOMER DETAILS</strong><div>Name: ${esc(tx.customer)}</div>
    <div class="line"></div><strong>WEIGHT DETAILS</strong>
    <div class="p-row"><span>Actual weight</span><span>${qty(tx.weight)} qtl</span></div>
    <div class="p-row"><span>Price per qtl</span><span>${money(tx.price)}</span></div>
    <div class="p-row"><span>Weight deduction</span><span>${qty(tx.weightDeduction)} qtl</span></div>
    <div class="p-row"><span>Net weight</span><span>${qty(tx.netWeight)} qtl</span></div>
    <div class="line"></div>
    <div class="p-row"><span>Amount after weight deduction</span><span>${money(tx.amount)}</span></div>
    <div class="p-row"><span>Labour charges</span><span>${money(tx.labour)}</span></div>
    <div class="p-row"><span>Amount after labour</span><span>${money(tx.amountAfterLabour)}</span></div>
    <div class="p-row"><span>1% deduction</span><span>${money(tx.deduction1Percent)}</span></div>
    <div class="line"></div><h3>FINAL PAYMENT</h3><h3>${money(tx.finalPayment)}</h3>
    <div class="line"></div><div>Customer signature:</div><br><div>________________________</div>
    <div class="center">Thank you!</div><div class="center">================================</div>`;
}
function showReceipt(tx) {
  $("printArea").innerHTML = makeReceipt(tx);
  $("printArea").classList.remove("hidden");
  currentReceipt = tx;
  window.print();
  setTimeout(() => $("printArea").classList.add("hidden"), 1000);
}

async function saveCurrent() {
  if (!currentCalculation) return;
  const now = new Date();
  const receiptNo = now.getFullYear().toString() +
    String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0") +
    String(now.getHours()).padStart(2,"0") + String(now.getMinutes()).padStart(2,"0") +
    String(now.getSeconds()).padStart(2,"0") + String(now.getMilliseconds()).padStart(3,"0") +
    "-" + Math.random().toString(36).slice(2,6).toUpperCase();
  const tx = {...currentCalculation, receiptNo, timestamp:now.getTime(), dateTime:now.toLocaleString("en-IN")};
  try {
    await saveTransaction(tx);
    currentCalculation = null;
    $("calculation").classList.add("hidden");
    $("saveBtn").classList.add("hidden");
    $("customer").value = ""; $("weight").value = ""; $("price").value = "";
    $("company").selectedIndex = 0;
    alert("Transaction saved on this phone.");
    showReceipt(tx);
    await refreshAll();
  } catch (e) { alert("Could not save transaction: " + e.message); }
}

async function renderHistory() {
  const transactions = await allTransactions();
  const company = $("filterCompany").value;
  const search = $("searchText").value.trim().toLowerCase();
  const filtered = transactions.filter(t => (company==="All" || t.company===company) &&
    (!search || t.customer.toLowerCase().includes(search) || t.receiptNo.toLowerCase().includes(search)));
  if (!filtered.length) { $("historyList").innerHTML = '<div class="empty">No matching transactions yet.</div>'; return; }
  $("historyList").innerHTML = filtered.map(t => `<article class="entry">
    <div class="entry-top"><div><strong>${esc(t.customer)}</strong><span class="pill">${esc(t.company)}</span><div class="small">${esc(t.dateTime)}</div></div><strong>${money(t.finalPayment)}</strong></div>
    <div class="small">${qty(t.weight)} qtl × ${money(t.price)} per qtl</div>
    <div class="small">Receipt: ${esc(t.receiptNo)}</div>
    <div class="entry-actions"><button class="secondary" data-receipt="${esc(t.receiptNo)}">Print receipt</button><button class="danger" data-delete="${esc(t.receiptNo)}">Delete</button></div>
    </article>`).join("");
  document.querySelectorAll("[data-receipt]").forEach(b => b.addEventListener("click", async () => {
    const tx = (await allTransactions()).find(t => t.receiptNo===b.dataset.receipt); if(tx) showReceipt(tx);
  }));
  document.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", async () => {
    if(confirm("Delete this transaction from this phone? Export a backup first if needed.")) { await removeTransaction(b.dataset.delete); await refreshAll(); }
  }));
}
async function renderReports() {
  const txs = await allTransactions();
  const companies = ["OP Foods","Patra Foods"];
  $("reportTotals").innerHTML = companies.map(c => {
    const group = txs.filter(t => t.company===c);
    const total = group.reduce((s,t) => s + Number(t.finalPayment),0);
    return `<div class="totalbox"><div class="small">${esc(c)}</div><div class="num">${money(total)}</div><div class="small">${group.length} transaction(s)</div></div>`;
  }).join("") + `<div class="totalbox"><div class="small">All companies</div><div class="num">${money(txs.reduce((s,t)=>s+Number(t.finalPayment),0))}</div><div class="small">${txs.length} transaction(s)</div></div>`;
}
async function refreshAll() { await renderHistory(); await renderReports(); }
function csvCell(v) { const s=String(v ?? ""); return '"' + s.replace(/"/g,'""') + '"'; }
async function exportCSV() {
  const txs = await allTransactions();
  const headers = ["Company Name","Date and Time","Customer Name","Actual Weight (Quintals)","Price per Quintal","Weight Deduction (Quintals)","Net Weight (Quintals)","Amount After Weight Deduction","Labour Charges","Amount After Labour","1% Deduction","Final Payment","Receipt Number"];
  const rows = txs.map(t => [t.company,t.dateTime,t.customer,t.weight,t.price,t.weightDeduction,t.netWeight,t.amount,t.labour,t.amountAfterLabour,t.deduction1Percent,t.finalPayment,t.receiptNo]);
  const csv = "\uFEFF" + [headers,...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
  downloadBlob(csv, "payment_records.csv", "text/csv;charset=utf-8;");
}
function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
function parseCSV(text) {
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(quoted){ if(c==='"' && n==='"'){cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; }
    else if(c==='"') quoted=true;
    else if(c===','){row.push(cell);cell="";}
    else if(c==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(cell.length || row.length){row.push(cell.replace(/\r$/,""));rows.push(row);}
  return rows;
}
async function importCSV(file) {
  const text = (await file.text()).replace(/^\uFEFF/,"");
  const rows=parseCSV(text); if(rows.length<2) throw new Error("CSV has no transaction rows.");
  const headers=rows[0];
  const idx=(name)=>headers.indexOf(name);
  const required=["Company Name","Date and Time","Customer Name","Actual Weight (Quintals)","Price per Quintal","Weight Deduction (Quintals)","Net Weight (Quintals)","Amount After Weight Deduction","Labour Charges","Amount After Labour","1% Deduction","Final Payment"];
  if(required.some(h=>idx(h)<0)) throw new Error("CSV headings do not match the exported payment records format.");
  let added=0;
  for(const r of rows.slice(1)){
    if(!r.length || !r[idx("Customer Name")]) continue;
    const receiptIdx=idx("Receipt Number");
    const receiptNo=receiptIdx>=0 && r[receiptIdx] ? r[receiptIdx] : "IMPORT-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const t = {
      receiptNo, company:r[idx("Company Name")], dateTime:r[idx("Date and Time")], customer:r[idx("Customer Name")],
      weight:Number(r[idx("Actual Weight (Quintals)")]), price:Number(r[idx("Price per Quintal")]),
      weightDeduction:Number(r[idx("Weight Deduction (Quintals)")]), netWeight:Number(r[idx("Net Weight (Quintals)")]),
      amount:Number(r[idx("Amount After Weight Deduction")]), labour:Number(r[idx("Labour Charges")]),
      amountAfterLabour:Number(r[idx("Amount After Labour")]), deduction1Percent:Number(r[idx("1% Deduction")]), finalPayment:Number(r[idx("Final Payment")]),
      timestamp:Date.parse(r[idx("Date and Time")]) || Date.now()
    };
    if(!["OP Foods","Patra Foods"].includes(t.company) || !Number.isFinite(t.finalPayment)) continue;
    const existing=(await allTransactions()).some(x=>x.receiptNo===receiptNo);
    if(!existing){ await importTransaction(t); added++; }
  }
  alert(`Import finished. Added ${added} transaction(s).`);
  await refreshAll();
}
function activateTab(name) {
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  ["new","history","reports"].forEach(v=>$(v+"View").classList.toggle("hidden",v!==name));
  if(name==="history") renderHistory(); if(name==="reports") renderReports();
}
function updateNetwork() { $("networkStatus").textContent = navigator.onLine ? "● Online · Transactions save on this phone" : "● Offline · Transactions still save on this phone"; }

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));
$("calculateBtn").addEventListener("click",calculate);
$("saveBtn").addEventListener("click",saveCurrent);
$("filterCompany").addEventListener("change",renderHistory);
$("searchText").addEventListener("input",renderHistory);
$("exportBtn").addEventListener("click",exportCSV);
$("importFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{await importCSV(f);}catch(err){alert("Import failed: "+err.message);}e.target.value="";});
window.addEventListener("online",updateNetwork); window.addEventListener("offline",updateNetwork);

(async function init(){
  updateNetwork();
  try { await openDB(); await refreshAll(); }
  catch(e) { alert("Local database could not be opened. Please use an updated version of Chrome."); }
  if("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("./sw.js"); } catch(e) { console.warn("Offline caching setup failed",e); }
  }
})();
