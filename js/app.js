// ============================================================================
// SEHAT — Application bootstrap, hash router, shell & views.
// Vanilla ES modules, no framework. Role-aware navigation + RBAC.
// ============================================================================
import * as store from "./store.js";
import { ROLES, DEMO_USERS, ROLE_LABELS } from "./data.js";
import * as data from "./data.js";
import * as ai from "./ai.js";
import * as chart from "./charts.js";

const app = document.getElementById("app");
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- small helpers ---------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => n.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
const fmtDate = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---- install prompt --------------------------------------------------------
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });

// ============================================================================
// Router
// ============================================================================
const routes = {
  "/": { title: "Beranda", view: dashboardView, roles: "*" },
  "/symptom": { title: "AI Symptom Checker", view: symptomView, roles: [ROLES.EMPLOYEE] },
  "/checkin": { title: "Check-in Harian", view: checkinView, roles: [ROLES.EMPLOYEE] },
  "/fitness": { title: "Fitness Tracker", view: fitnessView, roles: [ROLES.EMPLOYEE] },
  "/mental": { title: "Kesehatan Mental", view: mentalView, roles: [ROLES.EMPLOYEE] },
  "/quiz": { title: "Skrining", view: quizView, roles: [ROLES.EMPLOYEE] },
  "/wellness": { title: "Wellness Coach", view: wellnessView, roles: [ROLES.EMPLOYEE] },
  "/meds": { title: "Pengingat Obat", view: medsView, roles: [ROLES.EMPLOYEE] },
  "/telemed": { title: "Telemedicine", view: telemedView, roles: [ROLES.EMPLOYEE] },
  "/hr": { title: "HR Analytics", view: hrView, roles: [ROLES.HR] },
  "/exec": { title: "Executive", view: execView, roles: [ROLES.EXECUTIVE] },
  "/more": { title: "Lainnya", view: moreView, roles: "*" },
};

function parseHash() {
  const raw = (location.hash || "#/").slice(1);
  const [path, query] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(query || "") };
}
function navigate(path) { location.hash = path; }

let cleanup = null;
function render() {
  const user = store.currentUser();
  if (!user) { app.innerHTML = loginView(); mountLogin(); return; }

  const { path, params } = parseHash();
  let route = routes[path] || routes["/"];
  if (route.roles !== "*" && !route.roles.includes(user.role)) { route = routes["/"]; }

  if (typeof cleanup === "function") { cleanup(); cleanup = null; }

  app.innerHTML = shell(route, user, route.view(user, params));
  highlightNav(path);
  // mount interactive handlers for the rendered view
  const mountFn = route.view.mount;
  if (mountFn) cleanup = mountFn(user, params) || null;
  bindShell();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
store.subscribe(() => { /* re-render light: only when on a data-driven view */ render(); });

// ============================================================================
// Shell (topbar + bottom nav)
// ============================================================================
function navItems(role) {
  if (role === ROLES.HR) return [
    ["/", "🏠", "Beranda"], ["/hr", "📊", "Analytics"], ["/more", "⚙️", "Lainnya"],
  ];
  if (role === ROLES.EXECUTIVE) return [
    ["/", "🏠", "Beranda"], ["/exec", "📈", "Strategis"], ["/more", "⚙️", "Lainnya"],
  ];
  return [
    ["/", "🏠", "Beranda"], ["/symptom", "🩺", "Cek Gejala"], ["/fitness", "🏃", "Fitness"],
    ["/mental", "🧠", "Mental"], ["/more", "⚙️", "Lainnya"],
  ];
}

function shell(route, user, body) {
  return `
  <header class="topbar">
    <span class="brand"><img class="logo" src="./icons/icon-192.png" alt="SEHAT"/> SEHAT</span>
    <span class="spacer"></span>
    <span class="role-chip">${esc(ROLE_LABELS[user.role])}</span>
    <button class="iconbtn" data-act="logout" title="Keluar">⏻</button>
  </header>
  ${body}
  <nav class="bottomnav">
    ${navItems(user.role).map(([p, ic, l]) =>
      `<a href="#${p}" data-nav="${p}"><span class="ic">${ic}</span><span>${l}</span></a>`).join("")}
  </nav>`;
}

function highlightNav(path) {
  $$(".bottomnav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === path));
}

function bindShell() {
  const lo = $('[data-act="logout"]');
  if (lo) lo.onclick = () => { if (confirm("Keluar dari SEHAT?")) store.logout(); };
}

// ============================================================================
// Login (mock SSO)
// ============================================================================
function loginView() {
  return `
  <div class="login"><div class="panel">
    <img class="logo-big" src="./icons/icon-512.png" alt="SEHAT"/>
    <h1>SEHAT</h1>
    <p class="tag">Sistem Ekosistem <b>Health, Analytics &amp; Telemedicine</b><br/>Employee Health Intelligence Platform — KPU Indonesia</p>
    <div class="card" style="text-align:left">
      <h3>🔐 Masuk dengan SSO</h3>
      <p class="hint" style="margin-bottom:14px">Pilih akun demo (simulasi Single Sign-On KPU). Tidak ada kredensial yang disimpan.</p>
      ${DEMO_USERS.map((u) => `
        <button class="sso-user" data-login="${u.id}">
          <span class="av">${initials(u.name)}</span>
          <span><div style="font-weight:700">${esc(u.name)}</div>
          <div class="muted" style="font-size:12.5px">${esc(ROLE_LABELS[u.role])} · ${esc(u.unit)}</div></span>
        </button>`).join("")}
    </div>
    <p class="install-hint" style="margin-top:16px">📱 Tambahkan ke layar utama untuk pengalaman aplikasi penuh (PWA, dapat dipakai offline).</p>
  </div></div>`;
}
function mountLogin() {
  $$("[data-login]").forEach((b) => b.onclick = () => {
    store.login(b.dataset.login);
    toast("Selamat datang di SEHAT 👋");
    navigate("/");
  });
}

// ============================================================================
// Helpers for derived metrics
// ============================================================================
function userHealthScore(user) {
  const s = store.getState();
  const bmiVal = ai.bmi(s.fitness.weightKg, s.profile.heightCm);
  return ai.healthScore({
    steps: s.fitness.steps, sleepHrs: s.fitness.sleepHrs, waterMl: s.fitness.waterMl,
    bmiVal, who5: s.mental.who5, gad7: s.mental.gad7, phq9: s.mental.phq9, burnout: s.mental.burnout,
  });
}

// ============================================================================
// VIEW: Dashboard (role-aware)
// ============================================================================
function dashboardView(user, params) {
  if (user.role === ROLES.HR) return hrView(user, params);
  if (user.role === ROLES.EXECUTIVE) return execView(user, params);
  return employeeDashboard(user);
}

function employeeDashboard(user) {
  const s = store.getState();
  const score = userHealthScore(user);
  const band = ai.scoreBand(score);
  const bmiVal = ai.bmi(s.fitness.weightKg, s.profile.heightCm);
  const recs = ai.recommend(s);
  const pendingMeds = s.medications.reduce((n, m) => {
    const taken = (m.taken[store.todayKey()] || []);
    return n + m.times.filter((_, i) => !taken[i]).length;
  }, 0);
  const lastCheck = s.checkins[0];
  return `
  <main class="view">
    <div class="page-title"><h1>Halo, ${esc(user.name.split(" ")[0])} 👋</h1></div>
    <p class="page-sub">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>

    <div class="card">
      <div class="row between">
        <div>
          <h3 style="margin-bottom:2px">Skor Kesehatan Anda</h3>
          <span class="pill" style="background:${band.color}22;color:${band.color}">${band.label}</span>
          <p class="hint" style="margin-top:10px;max-width:260px">Komposit dari aktivitas, tidur, hidrasi, BMI &amp; kesehatan mental.</p>
        </div>
        <div class="gauge-wrap">${chart.gauge(score, { label: "dari 100", color: band.color })}</div>
      </div>
    </div>

    <div class="grid cols-4" style="margin-top:14px">
      ${stat("🚶", s.fitness.steps.toLocaleString("id-ID"), "Langkah", `target 10.000`)}
      ${stat("💧", (s.fitness.waterMl || 0) + " ml", "Air", `target 2.000 ml`)}
      ${stat("😴", (s.fitness.sleepHrs || 0) + " j", "Tidur", `target 7-8 j`)}
      ${stat("⚖️", bmiVal ?? "—", "BMI", ai.bmiCategory(bmiVal).label)}
    </div>

    <div class="card" style="margin-top:14px">
      <h3>⚡ Aksi Cepat</h3>
      <div class="grid cols-2" style="margin-top:6px">
        <button class="btn primary" onclick="location.hash='/symptom'">🩺 Cek Gejala (AI)</button>
        <button class="btn brand2" onclick="location.hash='/checkin'">📝 Check-in Harian</button>
        <button class="btn" onclick="location.hash='/mental'">🧠 Skrining Mental</button>
        <button class="btn" onclick="location.hash='/telemed'">👨‍⚕️ Telemedicine</button>
      </div>
    </div>

    ${pendingMeds > 0 ? `<div class="card"><div class="row between"><div><h3>💊 Pengingat Obat</h3>
      <p class="hint">${pendingMeds} dosis belum ditandai hari ini.</p></div>
      <button class="btn sm" onclick="location.hash='/meds'">Buka</button></div></div>` : ""}

    <div class="card">
      <h3>✨ Rekomendasi Wellness untuk Anda</h3>
      <div class="list" style="margin-top:8px">
        ${recs.map((r) => `<div class="item"><div class="lead">${r.icon}</div>
          <div class="body"><div class="t">${esc(r.cat)}</div><div class="s">${esc(r.tip)}</div></div></div>`).join("")}
      </div>
      <button class="btn ghost block" style="margin-top:10px" onclick="location.hash='/wellness'">Lihat program wellness →</button>
    </div>

    ${lastCheck ? `<p class="hint center" style="margin-top:8px">Check-in terakhir: ${fmtTime(lastCheck.date)} · mood ${lastCheck.mood}/5</p>` : ""}
  </main>`;
}

function stat(ico, v, l, sub = "") {
  return `<div class="stat"><div class="ico">${ico}</div><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>`;
}

// ============================================================================
// VIEW: AI Symptom Checker (conversational)
// ============================================================================
let chat = null; // {messages:[], symptoms:Set, stage, diffs, asked, answers}

function symptomView() {
  if (!chat) resetChat();
  return `
  <main class="view">
    <div class="page-title"><h1>🩺 AI Symptom Checker</h1></div>
    <p class="page-sub">Triage medis percakapan dengan pemetaan ICD-11 &amp; deteksi darurat. Bukan pengganti diagnosis dokter.</p>
    <div class="card">
      <div class="chat" id="chatlog">${chat.messages.map(renderBubble).join("")}</div>
      <div id="chatActions">${chatActions()}</div>
    </div>
    <div class="composer">
      <input id="chatInput" placeholder="Tulis keluhan Anda…" autocomplete="off" />
      <button class="btn primary" id="chatSend">Kirim</button>
    </div>
    <p class="hint center" style="margin-top:10px">🔒 Diproses lokal di perangkat Anda. Privasi data kesehatan terjaga.</p>
  </main>`;
}

function resetChat() {
  chat = { messages: [], symptoms: new Set(), stage: "intake", diffs: [], asked: 0, answers: {}, risk: null };
  chat.messages.push({ who: "bot", text: "Halo, saya asisten triage SEHAT. Ceritakan keluhan yang Anda rasakan (mis. \"demam, batuk, dan badan pegal sejak 2 hari\")." });
}

function renderBubble(m) {
  if (m.who === "typing") return `<div class="bubble bot typing"><span></span><span></span><span></span></div>`;
  return `<div class="bubble ${m.who === "bot" ? "bot" : m.who === "sys" ? "sys" : "me"}">${m.html || esc(m.text)}</div>`;
}

function chatActions() {
  if (chat.stage === "followup" && chat.pendingQuestion) {
    return `<div class="row" style="margin-top:6px">
      <button class="btn sm primary" data-ans="yes">Ya</button>
      <button class="btn sm" data-ans="no">Tidak</button>
      <button class="btn sm ghost" data-ans="skip">Lewati</button></div>`;
  }
  if (chat.stage === "result") {
    return `<div class="row" style="margin-top:10px">
      ${chat.route?.cta === "telemed" ? `<button class="btn primary sm" data-act="toTelemed">👨‍⚕️ Buat rujukan telemedicine</button>` : ""}
      ${chat.route?.cta === "emergency" ? `<a class="btn danger sm" href="tel:119">📞 Hubungi 119</a>` : ""}
      <button class="btn sm" data-act="saveCheck">💾 Simpan hasil</button>
      <button class="btn ghost sm" data-act="restart">↻ Mulai ulang</button></div>`;
  }
  if (chat.stage === "intake" && chat.symptoms.size > 0) {
    return `<div class="row" style="margin-top:6px"><button class="btn primary sm" data-act="analyze">🔍 Analisis gejala</button>
      <button class="btn ghost sm" data-act="restart">↻ Ulang</button></div>`;
  }
  return "";
}

symptomView.mount = () => {
  const log = $("#chatlog");
  const scroll = () => { if (log) log.scrollTop = log.scrollHeight; };
  scroll();

  function repaint() { $("#chatlog").innerHTML = chat.messages.map(renderBubble).join(""); $("#chatActions").innerHTML = chatActions(); bindActions(); scroll(); }
  function botSay(text, html) { chat.messages.push({ who: "bot", text, html }); }
  function meSay(text) { chat.messages.push({ who: "me", text }); }
  function sysSay(text) { chat.messages.push({ who: "sys", text }); }

  async function botThink(fn) {
    chat.messages.push({ who: "typing" }); repaint();
    await new Promise((r) => setTimeout(r, 650));
    chat.messages.pop(); fn(); repaint();
  }

  function handleIntake(text) {
    const emer = ai.detectEmergency(text);
    const found = ai.extractSymptoms(text);
    found.forEach((f) => chat.symptoms.add(f));
    meSay(text);
    if (emer) {
      botThink(() => {
        chat.stage = "result"; chat.risk = "emergency"; chat.route = ai.triageRoute("emergency");
        botSay("", `<b style="color:#fca5a5">⚠️ Tanda bahaya terdeteksi.</b><br/>${esc(emer.advice)}`);
        sysSay("Klasifikasi: DARURAT");
      });
      return;
    }
    if (!found.length) {
      botThink(() => botSay("Maaf, saya belum menangkap gejala spesifik. Coba sebutkan gejala seperti: demam, batuk, nyeri dada, pusing, mual, cemas, dll."));
      return;
    }
    botThink(() => {
      botSay(`Saya mencatat: ${[...chat.symptoms].map(ai.symptomLabel).join(", ")}. Ada gejala lain? Jika sudah, tekan "Analisis gejala".`);
    });
  }

  function startAnalysis() {
    chat.diffs = ai.differential([...chat.symptoms]);
    if (!chat.diffs.length) { botThink(() => botSay("Belum cukup data untuk analisis. Tambahkan gejala lain.")); return; }
    chat.stage = "followup"; chat.asked = 0;
    askNext();
  }

  function askNext() {
    const q = ai.nextQuestion(chat.diffs, chat.asked);
    if (!q) { finalize(); return; }
    chat.pendingQuestion = q;
    botThink(() => botSay(q));
  }

  function answer(val) {
    sysSay(val === "yes" ? "Ya" : val === "no" ? "Tidak" : "Dilewati");
    // First follow-up of the top condition is treated as the high-risk discriminator.
    if (val === "yes" && chat.asked === 0 && ["high", "medium"].includes(chat.diffs[0].baseRisk)) chat.answers.highRiskYes = true;
    chat.asked += 1; chat.pendingQuestion = null;
    askNext();
  }

  function finalize() {
    chat.risk = ai.classifyRisk(chat.diffs, chat.answers);
    chat.route = ai.triageRoute(chat.risk);
    chat.stage = "result";
    const meta = ai.RISK_META[chat.risk];
    botThink(() => {
      const top = chat.diffs.slice(0, 3).map((d) =>
        `<div style="margin:6px 0;padding:8px;border:1px solid #1f2c45;border-radius:8px">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <b>${esc(d.name)}</b><span class="pill ${d.baseRisk}">${d.confidence}%</span></div>
          <div class="muted" style="font-size:12px">ICD-11 <b>${esc(d.icd11)}</b> · ${esc(d.icd11Title)}</div>
          <div style="font-size:12.5px;margin-top:4px">${esc(d.advice)}</div></div>`).join("");
      botSay("", `<b>Hasil analisis triage</b>
        <div style="margin:8px 0"><span class="pill ${chat.risk}">${meta.label}</span>
        <span class="muted" style="font-size:12px"> · ${esc(chat.route.action)}</span></div>
        <div class="muted" style="font-size:12px;margin-bottom:4px">Kemungkinan kondisi (differential):</div>${top}
        <div class="muted" style="font-size:11.5px;margin-top:6px">ℹ️ Informasi edukatif berbasis basis pengetahuan medis, bukan diagnosis final.</div>`);
    });
  }

  function bindActions() {
    $$("[data-ans]").forEach((b) => b.onclick = () => answer(b.dataset.ans));
    const map = {
      analyze: startAnalysis,
      restart: () => { resetChat(); repaint(); },
      saveCheck: () => {
        store.saveSymptomCheck({
          symptoms: [...chat.symptoms].map(ai.symptomLabel),
          risk: chat.risk, top: chat.diffs.slice(0, 3).map((d) => ({ name: d.name, icd11: d.icd11, confidence: d.confidence })),
        });
        toast("Hasil tersimpan di riwayat");
      },
      toTelemed: () => {
        const top = chat.diffs[0];
        sessionStorage.setItem("sehat.referral", JSON.stringify({ reason: top ? `${top.name} (${top.icd11})` : "Konsultasi gejala", risk: chat.risk }));
        navigate("/telemed");
      },
    };
    $$("[data-act]").forEach((b) => { const f = map[b.dataset.act]; if (f) b.onclick = f; });
  }

  function send() {
    const inp = $("#chatInput");
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    if (chat.stage === "intake") handleIntake(text);
    else { meSay(text); botThink(() => botSay("Untuk menjawab pertanyaan, gunakan tombol Ya/Tidak di atas, atau mulai ulang sesi.")); }
  }

  $("#chatSend").onclick = send;
  $("#chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  bindActions();
};

// ============================================================================
// VIEW: Daily check-in
// ============================================================================
function checkinView() {
  const s = store.getState();
  return `
  <main class="view">
    <div class="page-title"><h1>📝 Check-in Harian</h1></div>
    <p class="page-sub">Catat kondisi Anda hari ini untuk memantau tren kesejahteraan.</p>
    <div class="card">
      ${slider("mood", "Suasana hati", 3, "😞", "😄")}
      ${slider("energy", "Tingkat energi", 3, "🔋", "⚡")}
      ${slider("stress", "Tingkat stres", 3, "😌", "😰")}
      <label class="field"><span>Catatan / gejala (opsional)</span>
        <textarea id="ci-note" placeholder="Misal: sedikit pusing, kurang tidur…"></textarea></label>
      <button class="btn primary block" id="ci-save">Simpan Check-in</button>
    </div>
    ${s.checkins.length ? `<div class="card"><h3>Riwayat terakhir</h3>
      <div class="list" style="margin-top:8px">${s.checkins.slice(0, 7).map((c) => `
        <div class="item"><div class="lead">${["😣","🙁","😐","🙂","😄"][Math.max(0,Math.min(4,c.mood-1))]}</div>
        <div class="body"><div class="t">Mood ${c.mood}/5 · Energi ${c.energy}/5 · Stres ${c.stress}/5</div>
        <div class="s">${fmtTime(c.date)}${c.note ? " · " + esc(c.note) : ""}</div></div></div>`).join("")}</div></div>` : ""}
  </main>`;
}
function slider(id, label, val, lo, hi) {
  return `<label class="field"><span>${label}: <span class="range-val" id="${id}-v">${val}</span>/5</span>
    <div class="row" style="align-items:center;gap:8px"><span>${lo}</span>
    <input type="range" id="ci-${id}" min="1" max="5" value="${val}" style="flex:1"/><span>${hi}</span></div></label>`;
}
checkinView.mount = () => {
  ["mood", "energy", "stress"].forEach((id) => {
    const el = $(`#ci-${id}`); const v = $(`#${id}-v`);
    el.oninput = () => v.textContent = el.value;
  });
  $("#ci-save").onclick = () => {
    store.addCheckin({
      mood: +$("#ci-mood").value, energy: +$("#ci-energy").value,
      stress: +$("#ci-stress").value, note: $("#ci-note").value.trim(),
    });
    toast("Check-in tersimpan ✓");
    navigate("/");
  };
};

// ============================================================================
// VIEW: Fitness tracker
// ============================================================================
function fitnessView(user) {
  const s = store.getState();
  const bmiVal = ai.bmi(s.fitness.weightKg, s.profile.heightCm);
  const cat = ai.bmiCategory(bmiVal);
  const hist = Object.entries(s.fitness.history).slice(-7);
  const stepSeries = hist.map(([, v]) => v.steps || 0);
  const stepLabels = hist.map(([d]) => d.slice(8));
  return `
  <main class="view">
    <div class="page-title"><h1>🏃 Fitness Tracker</h1></div>
    <p class="page-sub">Pantau aktivitas fisik, hidrasi, tidur, dan berat badan.</p>

    <div class="grid cols-2">
      <div class="card"><h3>🚶 Langkah</h3>
        <div class="stat" style="border:none;padding:0"><div class="v">${s.fitness.steps.toLocaleString("id-ID")}</div><div class="l">dari 10.000</div></div>
        ${chart.progress(s.fitness.steps, 10000, "#38bdf8")}
        <div class="row" style="margin-top:10px">
          <button class="btn sm" data-step="500">+500</button>
          <button class="btn sm" data-step="1000">+1.000</button>
          <button class="btn sm" data-step="2500">+2.500</button></div></div>

      <div class="card"><h3>💧 Hidrasi</h3>
        <div class="stat" style="border:none;padding:0"><div class="v">${s.fitness.waterMl} ml</div><div class="l">dari 2.000 ml</div></div>
        ${chart.progress(s.fitness.waterMl, 2000, "#0ea5e9")}
        <div class="row" style="margin-top:10px">
          <button class="btn sm" data-water="250">+250</button>
          <button class="btn sm" data-water="500">+500</button>
          <button class="btn sm ghost" data-water="-250">−250</button></div></div>
    </div>

    <div class="card"><h3>📊 Langkah 7 hari terakhir</h3>
      ${stepSeries.length > 1 ? chart.line(stepSeries, { labels: stepLabels, color: "#38bdf8", min: 0 }) : `<p class="hint">Belum cukup data. Catat aktivitas beberapa hari untuk melihat tren.</p>`}</div>

    <div class="card"><h3>😴 Tidur & ⚖️ Berat Badan</h3>
      <label class="field"><span>Durasi tidur tadi malam (jam)</span>
        <input type="number" id="f-sleep" step="0.5" min="0" max="14" value="${s.fitness.sleepHrs || ""}" placeholder="7.5"/></label>
      <label class="field"><span>Berat badan (kg)</span>
        <input type="number" id="f-weight" step="0.1" min="20" max="250" value="${s.fitness.weightKg || ""}"/></label>
      <label class="field"><span>Tinggi badan (cm)</span>
        <input type="number" id="f-height" step="1" min="120" max="220" value="${s.profile.heightCm || ""}"/></label>
      <button class="btn primary block" id="f-save">Simpan</button>
    </div>

    <div class="card"><h3>⚖️ BMI</h3>
      <div class="row between"><div><div class="stat" style="border:none;padding:0"><div class="v">${bmiVal ?? "—"}</div>
      <div class="l">Body Mass Index</div></div></div>
      <span class="pill ${cat.risk}">${cat.label}</span></div>
      <p class="hint" style="margin-top:8px">Klasifikasi BMI standar Asia-Pasifik (normal 18,5–22,9).</p></div>
  </main>`;
}
fitnessView.mount = () => {
  $$("[data-step]").forEach((b) => b.onclick = () => { store.logFitness({ steps: store.getState().fitness.steps + (+b.dataset.step) }); toast(`+${b.dataset.step} langkah`); });
  $$("[data-water]").forEach((b) => b.onclick = () => { store.addWater(+b.dataset.water); });
  $("#f-save").onclick = () => {
    const sleep = parseFloat($("#f-sleep").value) || 0;
    const weight = parseFloat($("#f-weight").value) || store.getState().fitness.weightKg;
    const height = parseInt($("#f-height").value) || store.getState().profile.heightCm;
    store.update((s) => { s.profile.heightCm = height; });
    store.logFitness({ sleepHrs: sleep, weightKg: weight });
    toast("Tersimpan ✓");
  };
};

// ============================================================================
// VIEW: Mental health (hub) + questionnaire runner
// ============================================================================
function mentalView() {
  const s = store.getState();
  const cards = Object.values(data.QUESTIONNAIRES);
  const last = (id) => s.mental.history.find((h) => h.id === id);
  return `
  <main class="view">
    <div class="page-title"><h1>🧠 Kesehatan Mental</h1></div>
    <p class="page-sub">Skrining tervalidasi: PHQ-9, GAD-7, WHO-5, dan asesmen burnout. Anonim &amp; rahasia.</p>
    ${s.mental.who5 != null ? `<div class="card"><h3>Ringkasan terakhir</h3>
      <div class="grid cols-2" style="margin-top:6px">
        ${miniScore("WHO-5", s.mental.who5, "%")}
        ${miniScore("PHQ-9", s.mental.phq9, "")}
        ${miniScore("GAD-7", s.mental.gad7, "")}
        ${miniScore("Burnout", s.mental.burnout, "")}
      </div></div>` : ""}
    <div class="list">
      ${cards.map((q) => { const l = last(q.id); return `
        <a class="item" href="#/quiz?id=${q.id}">
          <div class="lead">${({phq9:"💭",gad7:"😟",who5:"🌤️",burnout:"🔥"})[q.id]}</div>
          <div class="body"><div class="t">${esc(q.name)}</div>
          <div class="s">${esc(q.instrument)}${l ? ` · terakhir: ${l.level}` : ""}</div></div>
          ${l ? `<span class="pill ${l.risk}">${l.id === "who5" ? l.score + "%" : l.score}</span>` : `<span class="muted">›</span>`}
        </a>`; }).join("")}
    </div>
    <div class="banner info" style="margin-top:14px">ℹ️ Jika Anda dalam krisis atau memiliki pikiran menyakiti diri, hubungi <b>119 ext 8 (SEJIWA)</b> segera.</div>
  </main>`;
}
function miniScore(label, val, unit) {
  return `<div class="stat"><div class="v">${val == null ? "—" : val + unit}</div><div class="l">${label}</div></div>`;
}

let quiz = null;
function quizView(user, params) {
  const id = params.get("id");
  const q = data.QUESTIONNAIRES[id];
  if (!q) return `<main class="view"><div class="banner danger">Kuesioner tidak ditemukan.</div></main>`;
  if (!quiz || quiz.id !== id) quiz = { id, answers: [], idx: 0, result: null };

  if (quiz.result) return quizResult(q);

  const pct = (quiz.idx / q.questions.length) * 100;
  return `
  <main class="view">
    <div class="page-title"><h1>${esc(q.name)}</h1></div>
    <p class="page-sub">${esc(q.intro)}</p>
    <div class="q-progress"><span style="width:${pct}%"></span></div>
    <p class="muted" style="font-size:12px">Pertanyaan ${quiz.idx + 1} dari ${q.questions.length}</p>
    <div class="card">
      <h3 style="font-size:16px;line-height:1.4">${esc(q.questions[quiz.idx])}</h3>
      <div style="margin-top:12px">
        ${q.options.map((o) => `<button class="opt" data-val="${o.value}">${esc(o.label)}</button>`).join("")}
      </div>
      ${quiz.idx > 0 ? `<button class="btn ghost sm" data-back style="margin-top:6px">← Sebelumnya</button>` : ""}
    </div>
  </main>`;
}
// Finalise once (on the last answer), persist, then let the store re-render.
function finalizeQuiz(q) {
  const raw = quiz.answers.reduce((a, b) => a + (b || 0), 0);
  const score = q.id === "who5" ? raw * 4 : raw; // WHO-5 -> percentage
  const band = q.bands.find((b) => score <= b.max) || q.bands[q.bands.length - 1];
  const critical = q.criticalItem != null && (quiz.answers[q.criticalItem] || 0) >= 1;
  quiz.result = { score, band, critical };
  store.saveScreening(q.id, score, band.level, critical ? "high" : band.risk); // triggers re-render
}

quizView.mount = (user, params) => {
  const id = params.get("id");
  const q = data.QUESTIONNAIRES[id];
  if (!q) return;
  if (quiz.result) {
    const rt = $("[data-retake]");
    if (rt) rt.onclick = () => { quiz = { id, answers: [], idx: 0, result: null }; render(); };
    return;
  }
  $$("[data-val]").forEach((b) => b.onclick = () => {
    quiz.answers[quiz.idx] = +b.dataset.val;
    quiz.idx += 1;
    if (quiz.idx >= q.questions.length) finalizeQuiz(q); // re-renders via store
    else render();
  });
  const back = $("[data-back]");
  if (back) back.onclick = () => { quiz.idx = Math.max(0, quiz.idx - 1); render(); };
};

function quizResult(q) {
  const { score, band, critical } = quiz.result;
  const meta = ai.RISK_META[critical ? "high" : band.risk];
  return `
  <main class="view">
    <div class="page-title"><h1>Hasil ${esc(q.name)}</h1></div>
    <div class="card center">
      <div class="gauge-wrap">${chart.gauge(q.id === "who5" ? score : (score / q.max) * 100, { label: q.id === "who5" ? "Kesejahteraan" : "Tingkat", color: meta.color, max: 100 })}</div>
      <h2 style="margin-top:6px">${q.id === "who5" ? score + "%" : score + " / " + q.max}</h2>
      <span class="pill ${critical ? "high" : band.risk}">${esc(band.level)}</span>
    </div>
    ${critical ? `<div class="banner danger" style="margin-top:14px">⚠️ Anda mengindikasikan pikiran menyakiti diri. Mohon segera hubungi <b>119 ext 8 (SEJIWA)</b> atau orang yang Anda percaya. Anda berharga dan tidak sendirian.</div>` : ""}
    <div class="card"><h3>Interpretasi & saran</h3>
      <p style="font-size:14px">${interpret(q, band)}</p>
      ${["medium", "high"].includes(band.risk) || critical ? `<button class="btn primary block" style="margin-top:10px" onclick="location.hash='/telemed'">👨‍⚕️ Konsultasi profesional</button>` : ""}
      <button class="btn ghost block" style="margin-top:8px" onclick="location.hash='/wellness'">Lihat saran wellness</button>
    </div>
    <button class="btn ghost block" data-retake style="margin-top:12px">↻ Ulangi skrining</button>
    <p class="hint center" style="margin-top:10px">Skrining bersifat indikatif, bukan diagnosis. Konsultasikan dengan profesional untuk evaluasi menyeluruh.</p>
  </main>`;
}
function interpret(q, band) {
  const map = {
    low: "Hasil Anda berada dalam rentang sehat. Pertahankan kebiasaan baik, aktivitas fisik, dan koneksi sosial.",
    medium: "Terdapat indikasi gejala ringan-sedang. Terapkan teknik manajemen stres, jaga tidur, dan pantau perkembangan. Pertimbangkan konseling bila menetap.",
    high: "Hasil menunjukkan gejala signifikan. Sangat disarankan berkonsultasi dengan psikolog/dokter melalui layanan telemedicine SEHAT.",
  };
  return esc(map[band.risk] || map.low);
}

// ============================================================================
// VIEW: Wellness coach
// ============================================================================
function wellnessView() {
  const s = store.getState();
  const recs = ai.recommend(s);
  const T = data.WELLNESS_TIPS;
  return `
  <main class="view">
    <div class="page-title"><h1>✨ Wellness Coach</h1></div>
    <p class="page-sub">Program gaya hidup sehat personal berbasis data Anda.</p>

    <div class="card"><h3>🎯 Rekomendasi prioritas hari ini</h3>
      <div class="list" style="margin-top:8px">${recs.map((r) => `<div class="item"><div class="lead">${r.icon}</div>
        <div class="body"><div class="t">${esc(r.cat)}</div><div class="s">${esc(r.tip)}</div></div></div>`).join("")}</div></div>

    <div class="card"><h3>⏰ Pengingat kerja sehat</h3>
      ${toggleRow("sittingAlerts", "Peringatan duduk terlalu lama", "Notifikasi peregangan tiap 60 menit", s.settings.sittingAlerts)}
      <div class="divider"></div>
      <h3 style="font-size:14px">🧘 Latihan peregangan cepat (5 menit)</h3>
      <ol style="margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.9">
        <li>Putar leher perlahan 4x tiap arah</li>
        <li>Angkat &amp; putar bahu 10x</li>
        <li>Peregangan punggung (cat-cow) 8x</li>
        <li>Peregangan hamstring berdiri 20 detik/kaki</li>
        <li>Tarik napas dalam 4-4-4-4 selama 1 menit</li>
      </ol></div>

    ${wellnessGroup("🏃 Aktivitas Fisik", T.movement)}
    ${wellnessGroup("🥗 Nutrisi & Hidrasi", T.nutrition)}
    ${wellnessGroup("😴 Tidur Berkualitas", T.sleep)}
    ${wellnessGroup("🧠 Ketenangan Pikiran", T.mind)}
  </main>`;
}
function wellnessGroup(title, tips) {
  return `<div class="card"><h3>${title}</h3><div class="list" style="margin-top:6px">
    ${tips.map((t) => `<div class="item"><div class="lead">✓</div><div class="body"><div class="s" style="color:var(--text)">${esc(t)}</div></div></div>`).join("")}</div></div>`;
}
function toggleRow(key, title, sub, on) {
  return `<div class="row between"><div><div style="font-weight:600">${esc(title)}</div><div class="hint">${esc(sub)}</div></div>
    <button class="chip ${on ? "on" : ""}" data-toggle="${key}">${on ? "Aktif" : "Nonaktif"}</button></div>`;
}
wellnessView.mount = () => {
  $$("[data-toggle]").forEach((b) => b.onclick = () => { store.toggleSetting(b.dataset.toggle); });
};

// ============================================================================
// VIEW: Medication reminders
// ============================================================================
function medsView() {
  const s = store.getState();
  return `
  <main class="view">
    <div class="page-title"><h1>💊 Pengingat Obat</h1></div>
    <p class="page-sub">Kelola jadwal obat dan tandai kepatuhan harian.</p>
    <div class="card"><h3>➕ Tambah obat</h3>
      <label class="field"><span>Nama obat</span><input id="m-name" placeholder="mis. Amlodipine 5mg"/></label>
      <label class="field"><span>Dosis / aturan</span><input id="m-dose" placeholder="1 tablet"/></label>
      <label class="field"><span>Waktu (pisahkan dengan koma)</span><input id="m-times" placeholder="08:00, 20:00"/></label>
      <button class="btn primary block" id="m-add">Tambah</button>
    </div>
    ${s.medications.length ? `<div class="list">${s.medications.map((m) => {
      const taken = m.taken[store.todayKey()] || [];
      return `<div class="card"><div class="row between"><div><h3 style="margin:0">${esc(m.name)}</h3>
        <div class="hint">${esc(m.dose || "")}</div></div>
        <button class="btn danger sm" data-del="${m.id}">Hapus</button></div>
        <div class="chip-row" style="margin-top:10px">${m.times.map((t, i) =>
          `<button class="chip ${taken[i] ? "on" : ""}" data-take="${m.id}" data-i="${i}">${taken[i] ? "✓ " : "⏰ "}${esc(t)}</button>`).join("")}</div></div>`;
    }).join("")}</div>` : `<p class="hint center">Belum ada obat terdaftar.</p>`}
    <div class="banner info" style="margin-top:14px">🔔 Pada aplikasi terpasang (PWA), pengingat dapat dikirim via notifikasi. Aktifkan izin notifikasi di pengaturan perangkat.</div>
  </main>`;
}
medsView.mount = () => {
  $("#m-add").onclick = () => {
    const name = $("#m-name").value.trim();
    const times = $("#m-times").value.split(",").map((t) => t.trim()).filter(Boolean);
    if (!name || !times.length) { toast("Isi nama & minimal satu waktu"); return; }
    store.addMedication({ name, dose: $("#m-dose").value.trim(), times });
    toast("Obat ditambahkan ✓");
  };
  $$("[data-del]").forEach((b) => b.onclick = () => store.removeMedication(b.dataset.del));
  $$("[data-take]").forEach((b) => b.onclick = () => store.toggleMedTaken(b.dataset.take, +b.dataset.i));
};

// ============================================================================
// VIEW: Telemedicine
// ============================================================================
const DOCTORS = [
  { name: "dr. Maya Anggraini", spec: "Dokter Umum", slot: "Hari ini 14:00" },
  { name: "dr. Rendra, Sp.PD", spec: "Penyakit Dalam", slot: "Besok 09:30" },
  { name: "Psikolog Klinis Dewi, M.Psi", spec: "Psikologi Klinis", slot: "Besok 13:00" },
  { name: "dr. Hadi, Sp.JP", spec: "Jantung", slot: "Lusa 10:00" },
];
function telemedView() {
  const s = store.getState();
  let referral = null;
  try { referral = JSON.parse(sessionStorage.getItem("sehat.referral") || "null"); } catch {}
  return `
  <main class="view">
    <div class="page-title"><h1>👨‍⚕️ Telemedicine</h1></div>
    <p class="page-sub">Rujukan dokter, penjadwalan konsultasi, dan riwayat medis.</p>
    ${referral ? `<div class="banner ${referral.risk === "high" ? "danger" : "warn"}">🩺 Rujukan dari AI Symptom Checker: <b>${esc(referral.reason)}</b> (${esc(ai.RISK_META[referral.risk]?.label || referral.risk)}). Pilih dokter di bawah.</div>` : ""}
    <h3 style="margin:16px 0 8px">Dokter tersedia</h3>
    <div class="list">
      ${DOCTORS.map((d, i) => `<div class="item"><div class="lead">${d.spec.includes("Psiko") ? "🧠" : d.spec.includes("Jantung") ? "❤️" : "🩺"}</div>
        <div class="body"><div class="t">${esc(d.name)}</div><div class="s">${esc(d.spec)} · ${esc(d.slot)}</div></div>
        <button class="btn primary sm" data-book="${i}">Jadwalkan</button></div>`).join("")}
    </div>
    ${s.appointments.length ? `<div class="card"><h3>📅 Janji konsultasi</h3><div class="list" style="margin-top:8px">
      ${s.appointments.map((a) => `<div class="item"><div class="lead">📅</div>
        <div class="body"><div class="t">${esc(a.doctor)}</div><div class="s">${esc(a.spec)} · ${esc(a.slot)} · ${esc(a.reason || "Konsultasi umum")}</div></div>
        <span class="pill ${a.status === "Selesai" ? "low" : "medium"}">${esc(a.status)}</span></div>`).join("")}</div>
      <button class="btn ghost block" style="margin-top:10px" data-complete>Tandai konsultasi teratas selesai</button></div>` : ""}
    ${s.consults?.length ? `<div class="card"><h3>📋 Riwayat & rekomendasi medis</h3>
      <div class="list" style="margin-top:8px">${s.consults.map((c) => `<div class="item"><div class="lead">📄</div>
      <div class="body"><div class="t">${esc(c.doctor)}</div><div class="s">${esc(c.note)}</div></div></div>`).join("")}</div></div>` : ""}
  </main>`;
}
telemedView.mount = () => {
  let referral = null;
  try { referral = JSON.parse(sessionStorage.getItem("sehat.referral") || "null"); } catch {}
  $$("[data-book]").forEach((b) => b.onclick = () => {
    const d = DOCTORS[+b.dataset.book];
    store.addAppointment({ doctor: d.name, spec: d.spec, slot: d.slot, reason: referral?.reason });
    sessionStorage.removeItem("sehat.referral");
    toast("Konsultasi terjadwal ✓");
  });
  const cb = $("[data-complete]");
  if (cb) cb.onclick = () => {
    const s = store.getState();
    const a = s.appointments.find((x) => x.status !== "Selesai");
    if (!a) return;
    store.updateAppointment(a.id, { status: "Selesai" });
    store.update((st) => { (st.consults ||= []).unshift({ doctor: a.doctor, note: `Rekomendasi: istirahat cukup, kontrol bila keluhan menetap. (${a.reason || "konsultasi umum"})` }); });
    toast("Konsultasi selesai, rekomendasi tersimpan");
  };
};

// ============================================================================
// VIEW: HR analytics dashboard
// ============================================================================
function hrView() {
  const W = data.WORKFORCE;
  const avgHealth = Math.round(W.units.reduce((a, u) => a + u.healthScore * u.staff, 0) / W.headcount);
  const avgBurnout = Math.round(W.units.reduce((a, u) => a + u.burnout * u.staff, 0) / W.headcount);
  const atRisk = W.units.filter((u) => u.burnout >= 33);
  return `
  <main class="view">
    <div class="page-title"><h1>📊 HR Analytics</h1></div>
    <p class="page-sub">Wawasan kesehatan tenaga kerja — <b>100% anonim &amp; teragregasi</b>. Tidak ada data individu.</p>

    <div class="grid cols-2">
      ${kpi("Workforce Health Score", avgHealth, "/100", "up", ai.scoreBand(avgHealth).color)}
      ${kpi("Indeks Burnout", avgBurnout + "%", "", avgBurnout > 30 ? "up" : "down", avgBurnout > 30 ? "#f87171" : "#4ade80")}
      ${kpi("Partisipasi Skrining", W.screeningParticipation + "%", "", "up", "#38bdf8")}
      ${kpi("Pegawai (n)", W.headcount.toLocaleString("id-ID"), "", "", "#cbd5e1")}
    </div>

    <div class="card"><h3>📈 Tren Indeks Kesehatan vs Burnout (12 bln)</h3>
      ${chart.line(W.healthIndexTrend, { labels: W.months, color: "#0e9f6e", min: 50, max: 100 })}
      ${chart.line(W.burnoutTrend, { labels: [], color: "#f87171", min: 0, max: 60, fill: false, height: 90 })}
      ${chart.legend([{ label: "Health Index", value: avgHealth, color: "#0e9f6e" }, { label: "Burnout", value: avgBurnout, color: "#f87171" }])}</div>

    <div class="card"><h3>🏢 Skor kesehatan per unit kerja</h3>
      ${chart.bars(W.units.map((u) => ({ label: u.name.slice(0, 6), value: u.healthScore, color: u.healthScore >= 75 ? "#16a34a" : u.healthScore >= 70 ? "#d97706" : "#dc2626" })), { max: 100 })}</div>

    <div class="card"><h3>🦠 Tren keluhan/penyakit (agregat)</h3>
      <div class="row between" style="flex-wrap:nowrap;gap:12px"><div class="gauge-wrap">${chart.donut(W.diseaseTrends)}</div>
      <div style="flex:1">${chart.legend(W.diseaseTrends)}</div></div></div>

    ${atRisk.length ? `<div class="card"><h3>⚠️ Unit berisiko burnout tinggi</h3>
      <div class="list" style="margin-top:8px">${atRisk.map((u) => `<div class="item"><div class="lead">🔥</div>
        <div class="body"><div class="t">${esc(u.name)}</div><div class="s">${u.staff} pegawai · partisipasi ${u.participation}%</div></div>
        <span class="pill high">${u.burnout}%</span></div>`).join("")}</div>
      <p class="hint" style="margin-top:10px">Rekomendasi: tinjau beban kerja, rotasi tugas, dan program konseling untuk unit di atas.</p></div>` : ""}

    <div class="tablewrap card"><h3>Tabel ringkas unit</h3>
      <table><thead><tr><th>Unit</th><th>Pegawai</th><th>Health</th><th>Burnout</th><th>Partisipasi</th></tr></thead>
      <tbody>${W.units.map((u) => `<tr><td>${esc(u.name)}</td><td>${u.staff}</td><td>${u.healthScore}</td><td>${u.burnout}%</td><td>${u.participation}%</td></tr>`).join("")}</tbody></table></div>
  </main>`;
}
function kpi(label, val, unit, trend, color) {
  const tIco = trend === "up" ? "▲" : trend === "down" ? "▼" : "";
  return `<div class="stat"><div class="l">${esc(label)}</div>
    <div class="v" style="color:${color}">${esc(val)}<span style="font-size:13px;color:var(--muted)">${esc(unit)}</span></div>
    ${trend ? `<div class="kpi-trend ${trend}">${tIco}</div>` : ""}</div>`;
}

// ============================================================================
// VIEW: Executive dashboard
// ============================================================================
function execView() {
  const W = data.WORKFORCE;
  const ohi = Math.round(W.units.reduce((a, u) => a + u.healthScore * u.staff, 0) / W.headcount);
  const pred = ai.projectTrend(W.healthIndexTrend, 3);
  const burnPred = ai.projectTrend(W.burnoutTrend, 3);
  const projected = [...W.healthIndexTrend, ...pred.projection];
  const projLabels = [...W.months, "Jul*", "Agu*", "Sep*"];
  return `
  <main class="view">
    <div class="page-title"><h1>📈 Executive Dashboard</h1></div>
    <p class="page-sub">Indikator strategis kesejahteraan organisasi &amp; analitik prediktif.</p>

    <div class="card center"><h3>🏛️ Organizational Health Index (OHI)</h3>
      <div class="gauge-wrap">${chart.gauge(ohi, { label: "indeks organisasi", color: ai.scoreBand(ohi).color, size: 190 })}</div>
      <span class="pill" style="background:${ai.scoreBand(ohi).color}22;color:${ai.scoreBand(ohi).color}">${ai.scoreBand(ohi).label}</span></div>

    <div class="grid cols-3" style="margin-top:14px">
      ${kpi("Produktivitas Sehat", "86%", "", "up", "#16a34a")}
      ${kpi("Absensi Sakit", "3,2%", "", "down", "#4ade80")}
      ${kpi("Beban Lembur", W.overtimeHoursAvg + " j/mg", "", "up", "#f59e0b")}
    </div>

    <div class="card"><h3>🔮 Proyeksi Indeks Kesehatan (prediktif, 3 bln)</h3>
      ${chart.line(projected, { labels: projLabels, color: "#0e9f6e", min: 50, max: 100 })}
      <p class="hint">Tren ${pred.slope >= 0 ? "naik" : "turun"} (${pred.slope}/bln). Proyeksi 3 bulan: ${pred.projection.join(", ")}. <span style="color:var(--muted-2)">*estimasi regresi linear</span></p></div>

    <div class="card"><h3>🔥 Proyeksi risiko burnout</h3>
      ${chart.line([...W.burnoutTrend, ...burnPred.projection], { labels: projLabels, color: "#f87171", min: 0, max: 60 })}
      <div class="banner ${burnPred.slope > 0 ? "warn" : "ok"}" style="margin-top:10px">
        ${burnPred.slope > 0 ? "⚠️ Risiko burnout diproyeksikan meningkat — pertimbangkan intervensi beban kerja." : "✓ Risiko burnout stabil/menurun. Pertahankan program wellbeing."}</div></div>

    <div class="card"><h3>🧭 Indikator Wellbeing Organisasi</h3>
      ${indicator("Engagement & Wellbeing", 78, "#0e9f6e")}
      ${indicator("Keseimbangan Kerja-Hidup", 64, "#38bdf8")}
      ${indicator("Manajemen Stres", 59, "#f59e0b")}
      ${indicator("Partisipasi Program Sehat", W.screeningParticipation, "#a855f7")}
      ${indicator("Indeks Kelelahan Perjalanan Dinas", 100 - W.travelFatigueIndex, "#14b8a6")}</div>

    <div class="card"><h3>🏢 Peringkat kesehatan unit</h3>
      ${chart.bars([...W.units].sort((a, b) => b.healthScore - a.healthScore).slice(0, 6).map((u) => ({ label: u.name.slice(0, 6), value: u.healthScore })), { max: 100, color: "#0e9f6e" })}</div>

    <div class="banner info">📊 Endpoint analitik kompatibel Power BI tersedia di arsitektur lengkap (lihat docs/API-SPEC.md) untuk integrasi dashboard eksekutif perusahaan.</div>
  </main>`;
}
function indicator(label, val, color) {
  return `<div style="margin:10px 0"><div class="row between" style="margin-bottom:5px"><span style="font-size:13.5px">${esc(label)}</span>
    <b style="color:${color}">${val}%</b></div>${chart.progress(val, 100, color)}</div>`;
}

// ============================================================================
// VIEW: More / profile / settings
// ============================================================================
function moreView(user) {
  const s = store.getState();
  return `
  <main class="view">
    <div class="page-title"><h1>⚙️ Lainnya</h1></div>
    <div class="card"><div class="item" style="border:none;padding:0">
      <div class="lead" style="width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#04222e;font-weight:800">${initials(user.name)}</div>
      <div class="body"><div class="t" style="font-size:16px">${esc(user.name)}</div>
      <div class="s">${esc(user.title)} · ${esc(user.unit)}</div>
      <div class="s">${esc(user.sso)}</div></div></div></div>

    ${user.role === ROLES.EMPLOYEE ? `<div class="card"><h3>Riwayat AI Symptom Checker</h3>
      ${s.symptomChecks.length ? `<div class="list" style="margin-top:8px">${s.symptomChecks.slice(0, 5).map((c) => `
        <div class="item"><div class="lead">🩺</div><div class="body">
          <div class="t">${esc(c.top?.[0]?.name || "Hasil triage")} <span class="pill ${c.risk}">${esc(ai.RISK_META[c.risk]?.label || c.risk)}</span></div>
          <div class="s">${fmtTime(c.date)} · ${esc((c.symptoms || []).join(", "))}</div></div></div>`).join("")}</div>`
        : `<p class="hint">Belum ada riwayat.</p>`}</div>` : ""}

    <div class="card"><h3>🔔 Preferensi</h3>
      ${toggleRow("medReminders", "Pengingat obat", "Aktifkan notifikasi jadwal obat", s.settings.medReminders)}
      <div class="divider"></div>
      ${toggleRow("sittingAlerts", "Peringatan duduk lama", "Ingatkan untuk bergerak tiap jam", s.settings.sittingAlerts)}
      <div class="divider"></div>
      <button class="btn block" id="enableNotif">Aktifkan izin notifikasi</button>
    </div>

    <div class="card"><h3>📱 Aplikasi</h3>
      <button class="btn primary block" id="installBtn" ${deferredPrompt ? "" : "disabled"}>Pasang SEHAT ke perangkat</button>
      <p class="hint" style="margin-top:8px">${deferredPrompt ? "Pasang sebagai aplikasi untuk akses offline & cepat." : "Buka menu browser → \"Tambahkan ke layar utama\" untuk memasang."}</p>
      <div class="divider"></div>
      <button class="btn block" id="exportData">⬇️ Ekspor data saya (JSON)</button>
      <button class="btn danger block" id="resetData" style="margin-top:8px">Hapus semua data lokal</button>
    </div>

    <div class="card"><h3>🔐 Keamanan & Privasi</h3>
      <p class="hint">Data kesehatan diproses lokal di perangkat (zero-trust client). Pada penerapan penuh: enkripsi AES-256, audit trail, RBAC, dan kepatuhan perlindungan data kesehatan pribadi. Lihat <b>docs/SECURITY.md</b>.</p></div>

    <div class="card"><h3>🆘 Kontak Darurat</h3><div class="list" style="margin-top:8px">
      ${data.EMERGENCY_CONTACTS.map((c) => `<a class="item" href="tel:${c.value.replace(/[^0-9]/g, "")}"><div class="lead">📞</div>
        <div class="body"><div class="t">${esc(c.value)}</div><div class="s">${esc(c.label)}</div></div></a>`).join("")}</div></div>

    <p class="hint center" style="margin:18px 0">SEHAT v1.0.0 · PWA · KPU Indonesia<br/>Prototipe edukatif — bukan alat diagnosis medis.</p>
    <button class="btn ghost block" data-act="logout2">Keluar</button>
  </main>`;
}
moreView.mount = () => {
  $$("[data-toggle]").forEach((b) => b.onclick = () => store.toggleSetting(b.dataset.toggle));
  $("[data-act='logout2']").onclick = () => { if (confirm("Keluar dari SEHAT?")) store.logout(); };
  const ib = $("#installBtn");
  if (ib) ib.onclick = async () => {
    if (!deferredPrompt) { toast("Gunakan menu browser untuk memasang"); return; }
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; ib.disabled = true;
  };
  $("#enableNotif").onclick = async () => {
    if (!("Notification" in window)) { toast("Notifikasi tidak didukung"); return; }
    const p = await Notification.requestPermission();
    toast(p === "granted" ? "Notifikasi diaktifkan ✓" : "Izin notifikasi ditolak");
  };
  $("#exportData").onclick = () => {
    const blob = new Blob([JSON.stringify(store.getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "sehat-data.json"; a.click();
    URL.revokeObjectURL(a.href);
  };
  $("#resetData").onclick = () => {
    if (confirm("Hapus semua data lokal? Tindakan ini tidak dapat dibatalkan.")) {
      store.update((s) => { Object.keys(s).forEach((k) => delete s[k]); });
      localStorage.removeItem(`sehat.state.${store.currentUser().id}`);
      store.logout();
    }
  };
};

// ============================================================================
// Boot
// ============================================================================
store.loadSession();
if (!location.hash) location.hash = "/";
render();

// Register service worker (offline support).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
