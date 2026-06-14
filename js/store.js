// ============================================================================
// SEHAT — State Store + Persistence + Auth (mock SSO / RBAC)
// Per-user state persisted in localStorage. In the full architecture this is
// replaced by PostgreSQL + Redis behind the FastAPI service; the client store
// stays identical so the UI doesn't change. A tiny pub/sub drives re-renders.
// ============================================================================
import { DEMO_USERS, ROLES } from "./data.js";

const SESSION_KEY = "sehat.session";
const stateKey = (uid) => `sehat.state.${uid}`;

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn()); }

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultState(user) {
  return {
    profile: { weightKg: user.sex === "male" ? 74 : 60, heightCm: user.heightCm },
    fitness: { steps: 0, waterMl: 0, sleepHrs: 0, weightKg: user.sex === "male" ? 74 : 60, history: {} },
    mental: { phq9: null, gad7: null, who5: null, burnout: null, history: [] },
    checkins: [], // {date, mood, energy, stress, symptomsNote}
    medications: [], // {id,name,dose,times:[],taken:{date:[bool]}}
    symptomChecks: [], // saved AI sessions
    appointments: [], // telemedicine
    consults: [], // history
    settings: { sittingAlerts: true, medReminders: true, lastSeen: null },
  };
}

let session = null; // {user}
let state = null;

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) return null;
    session = { user };
    state = loadState(user);
    return session;
  } catch { return null; }
}

function loadState(user) {
  try {
    const raw = localStorage.getItem(stateKey(user.id));
    if (raw) return migrate(JSON.parse(raw), user);
  } catch {}
  return defaultState(user);
}

function migrate(s, user) {
  const base = defaultState(user);
  return { ...base, ...s,
    fitness: { ...base.fitness, ...(s.fitness || {}) },
    mental: { ...base.mental, ...(s.mental || {}) },
    settings: { ...base.settings, ...(s.settings || {}) },
    profile: { ...base.profile, ...(s.profile || {}) },
  };
}

export function login(userId) {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) throw new Error("Pengguna tidak ditemukan");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: Date.now() }));
  session = { user };
  state = loadState(user);
  emit();
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  session = null; state = null;
  emit();
}

export function currentUser() { return session?.user || null; }
export function getState() { return state; }
export function hasRole(...roles) { return session && roles.includes(session.user.role); }
export { ROLES };

function persist() {
  if (session && state) localStorage.setItem(stateKey(session.user.id), JSON.stringify(state));
}

// Generic updater: mutate(draft => { ... }) then persist + notify.
export function update(mutator) {
  if (!state) return;
  mutator(state);
  persist();
  emit();
}

// ---- Domain actions --------------------------------------------------------
export function logFitness(patch) {
  update((s) => {
    Object.assign(s.fitness, patch);
    s.fitness.history[todayKey()] = {
      steps: s.fitness.steps, waterMl: s.fitness.waterMl,
      sleepHrs: s.fitness.sleepHrs, weightKg: s.fitness.weightKg,
    };
  });
}

export function addWater(ml) {
  update((s) => {
    s.fitness.waterMl = Math.max(0, (s.fitness.waterMl || 0) + ml);
    s.fitness.history[todayKey()] = { ...(s.fitness.history[todayKey()] || {}), waterMl: s.fitness.waterMl, steps: s.fitness.steps, sleepHrs: s.fitness.sleepHrs, weightKg: s.fitness.weightKg };
  });
}

export function saveScreening(id, score, level, risk) {
  update((s) => {
    s.mental[id] = score;
    s.mental.history.unshift({ date: todayKey(), id, score, level, risk });
    s.mental.history = s.mental.history.slice(0, 50);
  });
}

export function addCheckin(entry) {
  update((s) => { s.checkins.unshift({ date: new Date().toISOString(), ...entry }); s.checkins = s.checkins.slice(0, 60); });
}

export function addMedication(med) {
  update((s) => s.medications.push({ id: crypto.randomUUID(), taken: {}, ...med }));
}
export function removeMedication(id) {
  update((s) => { s.medications = s.medications.filter((m) => m.id !== id); });
}
export function toggleMedTaken(id, index) {
  update((s) => {
    const m = s.medications.find((x) => x.id === id); if (!m) return;
    const day = (m.taken[todayKey()] ||= m.times.map(() => false));
    day[index] = !day[index];
  });
}

export function saveSymptomCheck(rec) {
  update((s) => { s.symptomChecks.unshift({ date: new Date().toISOString(), ...rec }); s.symptomChecks = s.symptomChecks.slice(0, 30); });
}

export function addAppointment(appt) {
  update((s) => s.appointments.unshift({ id: crypto.randomUUID(), status: "Terjadwal", createdAt: new Date().toISOString(), ...appt }));
}
export function updateAppointment(id, patch) {
  update((s) => { const a = s.appointments.find((x) => x.id === id); if (a) Object.assign(a, patch); });
}

export function toggleSetting(key) {
  update((s) => { s.settings[key] = !s.settings[key]; });
}

export { todayKey };
