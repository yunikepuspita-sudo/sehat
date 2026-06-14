// ============================================================================
// SEHAT — AI Layer (client-side, $0)
// A transparent, rule-based clinical reasoning engine that emulates the
// behaviour of an LLM + RAG symptom checker without any paid API:
//   • symptom extraction  • weighted differential diagnosis (retrieval)
//   • dynamic follow-up questioning  • ICD-11 mapping
//   • red-flag / emergency detection  • risk scoring  • triage routing
//
// The architecture doc (docs/ARCHITECTURE.md) describes how this is swapped
// for a real OpenAI + LangChain + vector-DB RAG pipeline in the full build.
// ============================================================================
import { KB, SYMPTOM_INDEX, symptomLabel, WELLNESS_TIPS } from "./data.js";

export const RISK = { low: "low", medium: "medium", high: "high", emergency: "emergency" };

export const RISK_META = {
  low: { label: "Risiko Rendah", color: "#16a34a", advice: "Pemantauan mandiri" },
  medium: { label: "Risiko Sedang", color: "#d97706", advice: "Pertimbangkan telekonsultasi" },
  high: { label: "Risiko Tinggi", color: "#dc2626", advice: "Disarankan konsultasi dokter" },
  emergency: { label: "DARURAT", color: "#b91c1c", advice: "Cari pertolongan darurat segera" },
};

// Lightweight keyword extraction from free text -> known symptom ids.
const KEYWORDS = {
  fever: ["demam", "panas", "meriang"],
  cough: ["batuk"],
  sore_throat: ["tenggorokan", "radang tenggorok"],
  runny_nose: ["pilek", "hidung", "meler", "tersumbat"],
  shortness_breath: ["sesak", "napas pendek", "susah napas"],
  headache: ["sakit kepala", "pusing kepala", "kepala nyeri", "kepala sakit"],
  dizziness: ["pusing", "berputar", "vertigo"],
  nausea: ["mual", "eneg"],
  vomiting: ["muntah"],
  diarrhea: ["diare", "mencret", "bab cair"],
  abdominal_pain: ["perut", "nyeri perut", "sakit perut", "mulas"],
  chest_pain: ["nyeri dada", "dada sakit", "dada nyeri", "dada sesak"],
  palpitations: ["berdebar", "jantung cepat", "deg-degan"],
  fatigue: ["lelah", "lemas", "capek", "letih", "tidak bertenaga"],
  muscle_ache: ["nyeri otot", "pegal", "ngilu", "nyeri sendi"],
  back_pain: ["punggung", "pinggang", "boyok"],
  eye_strain: ["mata lelah", "mata perih", "mata kering"],
  insomnia: ["susah tidur", "sulit tidur", "insomnia", "begadang"],
  anxiety: ["cemas", "khawatir", "gelisah", "panik"],
  low_mood: ["sedih", "murung", "putus asa", "hampa", "tidak semangat"],
  rash: ["ruam", "gatal", "bintik", "kemerahan kulit"],
  loss_smell: ["hilang penciuman", "tidak bisa mencium", "anosmia", "hilang rasa"],
};

const EMERGENCY_KEYWORDS = {
  chest_pain_radiating: ["dada menjalar", "menjalar ke lengan", "menjalar ke rahang", "keringat dingin"],
  severe_breathing: ["sangat sesak", "tidak bisa bernapas", "sulit bicara karena sesak"],
  stroke_signs: ["wajah perot", "lengan lemah", "bicara pelo", "mulut mencong"],
  suicidal: ["bunuh diri", "mengakhiri hidup", "menyakiti diri", "lebih baik mati"],
  severe_bleeding: ["perdarahan hebat", "darah tidak berhenti"],
  loss_consciousness: ["pingsan", "tidak sadar", "kejang"],
};

export function extractSymptoms(text) {
  const t = (text || "").toLowerCase();
  const found = new Set();
  for (const [id, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) found.add(id);
  }
  return [...found];
}

export function detectEmergency(text) {
  const t = (text || "").toLowerCase();
  for (const [id, words] of Object.entries(EMERGENCY_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) {
      return KB.redFlags.find((r) => r.id === id);
    }
  }
  return null;
}

// Weighted differential diagnosis via symptom retrieval + scoring.
export function differential(symptomIds) {
  if (!symptomIds.length) return [];
  const candidates = new Set();
  symptomIds.forEach((s) => (SYMPTOM_INDEX[s] || []).forEach((c) => candidates.add(c)));

  const scored = [];
  for (const cid of candidates) {
    const cond = KB.conditions.find((c) => c.id === cid);
    let score = 0, maxScore = 0;
    for (const [s, w] of Object.entries(cond.symptoms)) {
      maxScore += w;
      if (symptomIds.includes(s)) score += w;
    }
    // Confidence = match weight normalised, lightly penalised for unmatched breadth.
    const matched = Object.keys(cond.symptoms).filter((s) => symptomIds.includes(s)).length;
    const confidence = Math.round((score / maxScore) * 100);
    if (matched > 0) {
      scored.push({
        id: cond.id, name: cond.name, icd11: cond.icd11, icd11Title: cond.icd11Title,
        baseRisk: cond.baseRisk, advice: cond.advice, kb: cond.kb,
        followups: cond.followups, matched, confidence, score,
      });
    }
  }
  return scored.sort((a, b) => b.score - a.score || b.confidence - a.confidence).slice(0, 4);
}

// Overall risk = highest baseRisk among top differentials, escalated by count.
export function classifyRisk(diffs, answers = {}) {
  if (!diffs.length) return RISK.low;
  const order = { low: 1, medium: 2, high: 3 };
  let level = diffs[0].baseRisk;
  for (const d of diffs.slice(0, 2)) if (order[d.baseRisk] > order[level]) level = d.baseRisk;
  // "Yes" to a high-risk follow-up escalates further.
  if (answers.highRiskYes) level = "high";
  return level;
}

// Pick the next most-informative follow-up question (dynamic questioning).
export function nextQuestion(diffs, askedCount) {
  const top = diffs[0];
  if (!top || askedCount >= 2) return null;
  return top.followups[askedCount] || diffs[1]?.followups?.[0] || null;
}

export function triageRoute(risk) {
  switch (risk) {
    case "emergency": return { action: "Hubungi 119 / IGD sekarang", cta: "emergency" };
    case "high": return { action: "Buat rujukan telemedicine prioritas", cta: "telemed" };
    case "medium": return { action: "Jadwalkan telekonsultasi", cta: "telemed" };
    default: return { action: "Pemantauan mandiri + saran wellness", cta: "wellness" };
  }
}

// ---------------------------------------------------------------------------
// Health risk scoring + personalised recommendation engine.
// ---------------------------------------------------------------------------
export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}
export function bmiCategory(v) {
  if (v == null) return { label: "—", risk: "low" };
  if (v < 18.5) return { label: "Berat badan kurang", risk: "medium" };
  if (v < 23) return { label: "Normal", risk: "low" };
  if (v < 25) return { label: "Berisiko (Asia)", risk: "medium" };
  if (v < 30) return { label: "Obesitas I", risk: "high" };
  return { label: "Obesitas II", risk: "high" };
}

// Composite Health Score 0-100 from fitness, mental, and lifestyle signals.
export function healthScore({ steps = 0, sleepHrs = 0, waterMl = 0, bmiVal = null, who5 = null, gad7 = null, phq9 = null, burnout = null } = {}) {
  let score = 0;
  // Physical activity (max 25)
  score += Math.min(25, (steps / 10000) * 25);
  // Sleep (max 20) — ideal 7-8h
  score += sleepHrs >= 7 && sleepHrs <= 9 ? 20 : Math.max(0, 20 - Math.abs(7.5 - sleepHrs) * 5);
  // Hydration (max 10) — ideal 2000ml
  score += Math.min(10, (waterMl / 2000) * 10);
  // BMI (max 15)
  if (bmiVal != null) {
    const cat = bmiCategory(bmiVal).risk;
    score += cat === "low" ? 15 : cat === "medium" ? 9 : 4;
  } else score += 9;
  // Mental wellbeing (max 30)
  if (who5 != null) score += (who5 / 100) * 12; else score += 7;
  if (gad7 != null) score += (1 - gad7 / 21) * 6; else score += 4;
  if (phq9 != null) score += (1 - phq9 / 27) * 6; else score += 4;
  if (burnout != null) score += (1 - burnout / 28) * 6; else score += 4;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function scoreBand(score) {
  if (score >= 80) return { label: "Sangat Baik", color: "#16a34a" };
  if (score >= 65) return { label: "Baik", color: "#65a30d" };
  if (score >= 50) return { label: "Cukup", color: "#d97706" };
  return { label: "Perlu Perhatian", color: "#dc2626" };
}

// Personalised recommendations based on the user's latest signals.
export function recommend(state) {
  const recs = [];
  const f = state.fitness || {};
  const m = state.mental || {};
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if ((f.steps || 0) < 6000) recs.push({ cat: "Aktivitas", tip: pick(WELLNESS_TIPS.movement), icon: "🚶" });
  if ((f.sleepHrs || 0) < 7) recs.push({ cat: "Tidur", tip: pick(WELLNESS_TIPS.sleep), icon: "😴" });
  if ((f.waterMl || 0) < 1500) recs.push({ cat: "Hidrasi", tip: pick(WELLNESS_TIPS.nutrition), icon: "💧" });
  if ((m.gad7 ?? 0) >= 8 || (m.phq9 ?? 0) >= 10 || (m.burnout ?? 0) >= 14) {
    recs.push({ cat: "Pikiran", tip: pick(WELLNESS_TIPS.mind), icon: "🧘" });
  }
  // Always include at least 3 balanced tips.
  const pools = [WELLNESS_TIPS.movement, WELLNESS_TIPS.nutrition, WELLNESS_TIPS.mind, WELLNESS_TIPS.sleep];
  while (recs.length < 3) {
    const tip = pick(pools[recs.length % pools.length]);
    if (!recs.some((r) => r.tip === tip)) recs.push({ cat: "Wellness", tip, icon: "✨" });
  }
  return recs.slice(0, 4);
}

// Simple predictive analytics: linear trend projection for executive view.
export function projectTrend(series, periods = 3) {
  const n = series.length;
  const xs = series.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (series[i] - meanY); den += (xs[i] - meanX) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const projection = [];
  for (let i = 0; i < periods; i++) projection.push(Math.round(intercept + slope * (n + i)));
  return { slope: +slope.toFixed(2), projection };
}

export { symptomLabel };
