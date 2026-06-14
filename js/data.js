// ============================================================================
// SEHAT — Data Layer
// Seed data, medical knowledge base, ICD-11 mapping, and clinical
// questionnaires. Pure data + small lookup helpers, no DOM access.
// Everything runs client-side so the PWA can be hosted for free (static).
// ============================================================================

export const ROLES = {
  EMPLOYEE: "employee",
  HR: "hr",
  EXECUTIVE: "executive",
};

export const ROLE_LABELS = {
  employee: "Pegawai",
  hr: "HR Administrator",
  executive: "Executive",
};

// Demo accounts for the mock SSO flow (no real credentials are stored).
export const DEMO_USERS = [
  { id: "emp-001", name: "Andi Wijaya", role: ROLES.EMPLOYEE, unit: "Teknologi Informasi", title: "Pranata Komputer", sso: "andi.wijaya@kpu.go.id", age: 34, sex: "male", heightCm: 172 },
  { id: "hr-001", name: "Siti Rahmawati", role: ROLES.HR, unit: "Biro SDM", title: "Analis SDM", sso: "siti.rahmawati@kpu.go.id", age: 41, sex: "female", heightCm: 160 },
  { id: "exec-001", name: "Dr. Bambang Sutopo", role: ROLES.EXECUTIVE, unit: "Sekretariat Jenderal", title: "Sekretaris Jenderal", sso: "sekjen@kpu.go.id", age: 53, sex: "male", heightCm: 168 },
];

// ---------------------------------------------------------------------------
// Medical Knowledge Base (for the AI symptom checker + RAG-style retrieval).
// Each condition: ICD-11 code, matching symptoms, follow-up questions,
// baseline risk, triage advice, and a self-care knowledge snippet.
// ---------------------------------------------------------------------------
export const KB = {
  redFlags: [
    { id: "chest_pain_radiating", label: "Nyeri dada menjalar ke lengan/rahang", emergency: true, advice: "Kemungkinan sindrom koroner akut. Hubungi 119 / IGD segera." },
    { id: "severe_breathing", label: "Sesak napas berat / sulit bicara", emergency: true, advice: "Gangguan pernapasan akut. Cari pertolongan darurat sekarang." },
    { id: "stroke_signs", label: "Wajah perot, lengan lemah, bicara pelo", emergency: true, advice: "Tanda stroke (FAST). Setiap menit berharga — ke IGD segera." },
    { id: "suicidal", label: "Pikiran menyakiti diri sendiri", emergency: true, advice: "Anda tidak sendiri. Hubungi 119 ext 8 (SEJIWA) atau orang terdekat sekarang." },
    { id: "severe_bleeding", label: "Perdarahan hebat tak terkontrol", emergency: true, advice: "Tekan luka, hubungi layanan darurat 119." },
    { id: "loss_consciousness", label: "Penurunan kesadaran / pingsan", emergency: true, advice: "Kondisi darurat. Hubungi 119 segera." },
  ],

  symptoms: [
    { id: "fever", label: "Demam", body: "umum" },
    { id: "cough", label: "Batuk", body: "pernapasan" },
    { id: "sore_throat", label: "Nyeri tenggorokan", body: "pernapasan" },
    { id: "runny_nose", label: "Pilek / hidung tersumbat", body: "pernapasan" },
    { id: "shortness_breath", label: "Sesak napas", body: "pernapasan" },
    { id: "headache", label: "Sakit kepala", body: "kepala" },
    { id: "dizziness", label: "Pusing berputar", body: "kepala" },
    { id: "nausea", label: "Mual", body: "pencernaan" },
    { id: "vomiting", label: "Muntah", body: "pencernaan" },
    { id: "diarrhea", label: "Diare", body: "pencernaan" },
    { id: "abdominal_pain", label: "Nyeri perut", body: "pencernaan" },
    { id: "chest_pain", label: "Nyeri dada", body: "kardiovaskular" },
    { id: "palpitations", label: "Jantung berdebar", body: "kardiovaskular" },
    { id: "fatigue", label: "Lelah berlebihan", body: "umum" },
    { id: "muscle_ache", label: "Nyeri otot/sendi", body: "muskuloskeletal" },
    { id: "back_pain", label: "Nyeri punggung/pinggang", body: "muskuloskeletal" },
    { id: "eye_strain", label: "Mata lelah/perih", body: "kepala" },
    { id: "insomnia", label: "Sulit tidur", body: "umum" },
    { id: "anxiety", label: "Cemas berlebihan", body: "psikis" },
    { id: "low_mood", label: "Suasana hati menurun", body: "psikis" },
    { id: "rash", label: "Ruam kulit", body: "kulit" },
    { id: "loss_smell", label: "Hilang penciuman/perasa", body: "pernapasan" },
  ],

  conditions: [
    {
      id: "common_cold", name: "Infeksi Saluran Napas Atas (Common Cold)", icd11: "CA00", icd11Title: "Acute upper respiratory infection",
      symptoms: { runny_nose: 3, sore_throat: 2, cough: 2, fever: 1, headache: 1, fatigue: 1 },
      baseRisk: "low",
      followups: ["Apakah demam Anda di atas 38.5°C?", "Sudah berapa hari keluhan berlangsung?"],
      advice: "Istirahat cukup, perbanyak cairan, paracetamol bila perlu. Konsultasi bila >7 hari atau demam tinggi.",
      kb: "Common cold disebabkan virus (rhinovirus). Umumnya sembuh 7–10 hari. Antibiotik tidak diperlukan.",
    },
    {
      id: "influenza", name: "Influenza", icd11: "1E32", icd11Title: "Influenza, virus not identified",
      symptoms: { fever: 3, muscle_ache: 3, fatigue: 3, cough: 2, headache: 2, sore_throat: 1 },
      baseRisk: "medium",
      followups: ["Apakah demam muncul mendadak dengan nyeri otot hebat?", "Apakah Anda kontak dengan penderita flu?"],
      advice: "Isolasi mandiri, istirahat, cairan, antipiretik. Antiviral bila berisiko tinggi. Pantau sesak napas.",
      kb: "Influenza ditandai onset mendadak demam tinggi + mialgia. Vaksinasi tahunan dianjurkan untuk pegawai.",
    },
    {
      id: "covid", name: "Dugaan COVID-19", icd11: "RA01", icd11Title: "COVID-19",
      symptoms: { fever: 2, cough: 2, loss_smell: 3, fatigue: 2, sore_throat: 1, shortness_breath: 2 },
      baseRisk: "medium",
      followups: ["Apakah Anda kehilangan penciuman/perasa?", "Apakah ada kontak erat 14 hari terakhir?"],
      advice: "Lakukan tes antigen/PCR, isolasi, pantau saturasi oksigen. Ke faskes bila sesak/saturasi <94%.",
      kb: "Anosmia adalah penanda khas COVID-19. Pantau tanda perburukan: sesak, nyeri dada, kebingungan.",
    },
    {
      id: "gastroenteritis", name: "Gastroenteritis Akut", icd11: "1A40", icd11Title: "Gastroenteritis of presumed infectious origin",
      symptoms: { diarrhea: 3, nausea: 2, vomiting: 2, abdominal_pain: 2, fever: 1 },
      baseRisk: "medium",
      followups: ["Apakah BAB cair >5x/hari?", "Apakah ada tanda dehidrasi (lemas, jarang BAK)?"],
      advice: "Rehidrasi oral (oralit), makan porsi kecil. Ke faskes bila dehidrasi, BAB berdarah, atau demam tinggi.",
      kb: "Tatalaksana utama gastroenteritis adalah rehidrasi. Hindari antidiare bila ada darah/demam.",
    },
    {
      id: "tension_headache", name: "Sakit Kepala Tipe Tegang", icd11: "8A81", icd11Title: "Tension-type headache",
      symptoms: { headache: 3, eye_strain: 2, fatigue: 2, insomnia: 1, anxiety: 1 },
      baseRisk: "low",
      followups: ["Apakah nyeri seperti diikat/menekan kedua sisi kepala?", "Apakah Anda lama menatap layar?"],
      advice: "Istirahatkan mata (aturan 20-20-20), kelola stres, hidrasi, analgesik ringan bila perlu.",
      kb: "Tension headache sering terkait postur kerja & screen-time. Terapi non-farmakologis sangat efektif.",
    },
    {
      id: "migraine", name: "Migrain", icd11: "8A80", icd11Title: "Migraine",
      symptoms: { headache: 3, nausea: 2, dizziness: 2, eye_strain: 1 },
      baseRisk: "low",
      followups: ["Apakah nyeri berdenyut di satu sisi?", "Apakah memburuk dengan cahaya/suara?"],
      advice: "Istirahat di ruang gelap & tenang, analgesik dini. Catat pemicu. Konsultasi bila sering kambuh.",
      kb: "Migrain bersifat unilateral, berdenyut, fotofobia. Identifikasi pemicu membantu pencegahan.",
    },
    {
      id: "acs", name: "Dugaan Sindrom Koroner Akut", icd11: "BA41", icd11Title: "Acute ischaemic heart disease",
      symptoms: { chest_pain: 3, shortness_breath: 2, palpitations: 2, dizziness: 1 },
      baseRisk: "high",
      followups: ["Apakah nyeri dada menjalar ke lengan kiri/rahang?", "Apakah disertai keringat dingin?"],
      advice: "DARURAT. Hubungi 119 / IGD segera. Jangan menyetir sendiri.",
      kb: "Nyeri dada + penjalaran + keringat dingin = curiga ACS. Penanganan dini menyelamatkan otot jantung.",
    },
    {
      id: "anxiety_disorder", name: "Gangguan Kecemasan", icd11: "6B00", icd11Title: "Generalised anxiety disorder",
      symptoms: { anxiety: 3, palpitations: 2, insomnia: 2, fatigue: 1, headache: 1 },
      baseRisk: "medium",
      followups: ["Apakah kecemasan mengganggu pekerjaan/tidur?", "Sudah berlangsung >2 minggu?"],
      advice: "Latihan pernapasan, batasi kafein, dukungan sosial. Skrining GAD-7 & rujukan psikolog bila berat.",
      kb: "GAD ditandai kecemasan berlebih sulit dikendalikan >6 bulan. Terapi CBT & relaksasi efektif.",
    },
    {
      id: "depression", name: "Dugaan Episode Depresi", icd11: "6A70", icd11Title: "Depressive disorder",
      symptoms: { low_mood: 3, fatigue: 2, insomnia: 2, anxiety: 1 },
      baseRisk: "medium",
      followups: ["Apakah kehilangan minat pada aktivitas yang biasa disukai?", "Apakah berlangsung hampir setiap hari >2 minggu?"],
      advice: "Skrining PHQ-9, jaga rutinitas & aktivitas fisik, dukungan sosial. Rujukan profesional bila sedang/berat.",
      kb: "Anhedonia + mood menurun >2 minggu adalah inti depresi. Deteksi dini meningkatkan pemulihan.",
    },
    {
      id: "low_back_pain", name: "Nyeri Punggung Bawah (Mekanik)", icd11: "ME84.2", icd11Title: "Low back pain",
      symptoms: { back_pain: 3, muscle_ache: 2, fatigue: 1 },
      baseRisk: "low",
      followups: ["Apakah nyeri muncul setelah duduk/angkat beban lama?", "Apakah ada kelemahan tungkai/gangguan BAK?"],
      advice: "Tetap aktif ringan, koreksi ergonomi, peregangan. Waspada red flag neurologis → segera periksa.",
      kb: "Nyeri punggung mekanik terkait postur duduk lama. Ergonomi & peregangan berkala mencegah kekambuhan.",
    },
    {
      id: "burnout", name: "Kelelahan Kerja (Burnout)", icd11: "QD85", icd11Title: "Burn-out (occupational phenomenon)",
      symptoms: { fatigue: 3, insomnia: 2, low_mood: 2, headache: 1, anxiety: 1 },
      baseRisk: "medium",
      followups: ["Apakah Anda merasa terkuras secara emosional oleh pekerjaan?", "Apakah motivasi & performa menurun?"],
      advice: "Atur beban kerja, ambil cuti pemulihan, batas digital. Diskusi dengan atasan/HR & konseling.",
      kb: "Burnout (ICD-11 QD85) = fenomena okupasional: kelelahan, sinisme, penurunan efikasi. Bukan diagnosis medis.",
    },
  ],
};

// Build a quick symptom -> conditions index for retrieval.
export const SYMPTOM_INDEX = (() => {
  const idx = {};
  for (const c of KB.conditions) {
    for (const s of Object.keys(c.symptoms)) {
      (idx[s] ||= []).push(c.id);
    }
  }
  return idx;
})();

export function symptomLabel(id) {
  return KB.symptoms.find((s) => s.id === id)?.label || id;
}

// ---------------------------------------------------------------------------
// Clinical screening questionnaires (validated instruments).
// ---------------------------------------------------------------------------
const FREQ4 = [
  { label: "Tidak sama sekali", value: 0 },
  { label: "Beberapa hari", value: 1 },
  { label: "Lebih dari separuh hari", value: 2 },
  { label: "Hampir setiap hari", value: 3 },
];

export const QUESTIONNAIRES = {
  phq9: {
    id: "phq9", name: "PHQ-9 (Depresi)", instrument: "Patient Health Questionnaire-9",
    intro: "Selama 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?",
    options: FREQ4, max: 27, criticalItem: 8, // item 9 (index 8) = self-harm
    questions: [
      "Kurang minat atau kesenangan dalam melakukan sesuatu",
      "Merasa murung, sedih, atau putus asa",
      "Sulit tidur, mudah terbangun, atau tidur berlebihan",
      "Merasa lelah atau kurang berenergi",
      "Nafsu makan menurun atau berlebihan",
      "Merasa buruk tentang diri sendiri / merasa gagal",
      "Sulit berkonsentrasi (mis. membaca, menonton)",
      "Bergerak/berbicara sangat lambat, atau sebaliknya gelisah",
      "Berpikir lebih baik mati atau ingin menyakiti diri",
    ],
    bands: [
      { max: 4, level: "Minimal", risk: "low" },
      { max: 9, level: "Ringan", risk: "low" },
      { max: 14, level: "Sedang", risk: "medium" },
      { max: 19, level: "Sedang–Berat", risk: "high" },
      { max: 27, level: "Berat", risk: "high" },
    ],
  },
  gad7: {
    id: "gad7", name: "GAD-7 (Kecemasan)", instrument: "Generalised Anxiety Disorder-7",
    intro: "Selama 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?",
    options: FREQ4, max: 21,
    questions: [
      "Merasa gugup, cemas, atau tegang",
      "Tidak mampu menghentikan atau mengendalikan rasa khawatir",
      "Terlalu khawatir tentang berbagai hal",
      "Sulit untuk rileks",
      "Sangat gelisah sehingga sulit diam",
      "Mudah jengkel atau tersinggung",
      "Merasa takut seakan sesuatu yang buruk akan terjadi",
    ],
    bands: [
      { max: 4, level: "Minimal", risk: "low" },
      { max: 9, level: "Ringan", risk: "low" },
      { max: 14, level: "Sedang", risk: "medium" },
      { max: 21, level: "Berat", risk: "high" },
    ],
  },
  who5: {
    id: "who5", name: "WHO-5 (Kesejahteraan)", instrument: "WHO-5 Well-Being Index",
    intro: "Selama 2 minggu terakhir...",
    options: [
      { label: "Sepanjang waktu", value: 5 },
      { label: "Sebagian besar waktu", value: 4 },
      { label: "Lebih dari separuh waktu", value: 3 },
      { label: "Kurang dari separuh waktu", value: 2 },
      { label: "Kadang-kadang", value: 1 },
      { label: "Tidak pernah", value: 0 },
    ],
    max: 25, higherIsBetter: true,
    questions: [
      "Saya merasa ceria dan bersemangat",
      "Saya merasa tenang dan rileks",
      "Saya merasa aktif dan bertenaga",
      "Saya bangun tidur dengan segar dan cukup istirahat",
      "Hidup saya dipenuhi hal-hal yang menarik bagi saya",
    ],
    // Score is x4 to get 0-100 percentage.
    bands: [
      { max: 28, level: "Kesejahteraan rendah (skrining depresi)", risk: "high" },
      { max: 50, level: "Di bawah rata-rata", risk: "medium" },
      { max: 100, level: "Baik", risk: "low" },
    ],
  },
  burnout: {
    id: "burnout", name: "Burnout (MBI-ringkas)", instrument: "Adaptasi Maslach Burnout Inventory",
    intro: "Seberapa sering perasaan berikut Anda alami terkait pekerjaan?",
    options: [
      { label: "Tidak pernah", value: 0 },
      { label: "Jarang", value: 1 },
      { label: "Kadang", value: 2 },
      { label: "Sering", value: 3 },
      { label: "Selalu", value: 4 },
    ],
    max: 28,
    questions: [
      "Saya merasa terkuras secara emosional oleh pekerjaan",
      "Saya merasa lelah saat bangun dan harus menghadapi hari kerja",
      "Saya menjadi lebih sinis/acuh terhadap pekerjaan",
      "Saya meragukan makna pekerjaan saya",
      "Saya kesulitan berkonsentrasi pada tugas",
      "Saya merasa kurang berprestasi di tempat kerja",
      "Saya merasa beban kerja melebihi kapasitas saya",
    ],
    bands: [
      { max: 9, level: "Risiko rendah", risk: "low" },
      { max: 17, level: "Risiko sedang", risk: "medium" },
      { max: 28, level: "Risiko tinggi", risk: "high" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Wellness coaching content (personalised recommendation pool).
// ---------------------------------------------------------------------------
export const WELLNESS_TIPS = {
  movement: [
    "Lakukan peregangan leher & bahu 2 menit setiap 1 jam duduk.",
    "Target 7.000–10.000 langkah/hari — coba meeting sambil berjalan.",
    "Aturan 20-20-20: tiap 20 menit, lihat objek 20 kaki selama 20 detik.",
    "Naik tangga alih-alih lift untuk 1–2 lantai.",
  ],
  nutrition: [
    "Minum air 8 gelas/hari; taruh botol di meja kerja sebagai pengingat.",
    "Isi separuh piring dengan sayur & buah (pedoman Isi Piringku).",
    "Batasi kafein setelah pukul 15.00 agar tidur lebih nyenyak.",
  ],
  sleep: [
    "Jaga jadwal tidur konsisten, target 7–8 jam.",
    "Hindari layar 30 menit sebelum tidur.",
    "Buat kamar gelap, sejuk, dan tenang.",
  ],
  mind: [
    "Latihan pernapasan kotak 4-4-4-4 selama 5 menit saat tegang.",
    "Tulis 3 hal yang disyukuri tiap malam.",
    "Ambil jeda mikro 5 menit di antara sesi kerja intens.",
  ],
};

// ---------------------------------------------------------------------------
// Synthetic, fully-anonymous aggregate workforce data for HR/Executive
// dashboards. Deterministic so charts are stable across reloads.
// ---------------------------------------------------------------------------
export const WORKFORCE = {
  headcount: 1860,
  units: [
    { name: "Sekretariat Jenderal", staff: 240, healthScore: 78, burnout: 22, participation: 81 },
    { name: "Teknis Penyelenggaraan", staff: 410, healthScore: 71, burnout: 34, participation: 76 },
    { name: "Teknologi Informasi", staff: 180, healthScore: 69, burnout: 41, participation: 88 },
    { name: "Hukum", staff: 150, healthScore: 74, burnout: 28, participation: 70 },
    { name: "Pengawasan", staff: 220, healthScore: 73, burnout: 30, participation: 72 },
    { name: "Keuangan & Logistik", staff: 260, healthScore: 76, burnout: 25, participation: 79 },
    { name: "SDM & Umum", staff: 200, healthScore: 80, burnout: 19, participation: 85 },
    { name: "Daerah (Perwakilan)", staff: 200, healthScore: 70, burnout: 33, participation: 64 },
  ],
  // 12-month trend
  months: ["Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  healthIndexTrend: [70, 71, 70, 69, 68, 67, 69, 71, 72, 73, 74, 74],
  burnoutTrend: [26, 27, 29, 31, 34, 36, 33, 31, 30, 29, 28, 28],
  // Disease / complaint distribution (anonymous, aggregated)
  diseaseTrends: [
    { name: "ISPA / Flu", value: 31 },
    { name: "Sakit Kepala/Migrain", value: 18 },
    { name: "Nyeri Punggung", value: 16 },
    { name: "Gangguan Cemas", value: 12 },
    { name: "Gastrointestinal", value: 10 },
    { name: "Hipertensi", value: 8 },
    { name: "Lainnya", value: 5 },
  ],
  // Occupational health signals
  overtimeHoursAvg: 11.4, // per week, peak season
  travelFatigueIndex: 58, // 0-100
  screeningParticipation: 77, // %
};

export const EMERGENCY_CONTACTS = [
  { label: "Ambulans / Gawat Darurat Nasional", value: "119" },
  { label: "SEJIWA (Kesehatan Jiwa)", value: "119 ext 8" },
  { label: "Klinik Pratama KPU", value: "(021) 31937223" },
];
