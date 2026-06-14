# SEHAT — User Journeys & Wireframes

## Personas
- **Andi (Pegawai/Employee)** — wants quick symptom guidance, fitness & mental
  check-ins, medication reminders.
- **Siti (HR Administrator)** — needs anonymous workforce health insight to plan
  interventions.
- **Dr. Bambang (Executive)** — needs a strategic, predictive view of
  organisational wellbeing.

---

## Journey 1 — Employee: "I feel unwell"
```
Open PWA ─▶ SSO login ─▶ Dashboard (health score)
        └▶ tap "Cek Gejala (AI)"
              ▶ describe symptoms (free text)
              ▶ red-flag scan ──(emergency?)──▶ CALL 119 banner
              ▶ dynamic follow-up questions (Ya/Tidak)
              ▶ triage result: differential + ICD-11 + risk
              ▶ if medium/high ─▶ "Buat rujukan telemedicine"
                                    ▶ pick doctor ▶ appointment booked
              ▶ save result ─▶ appears in profile history
```
**Success:** user gets safe, explainable guidance and a next action in < 2 min.

## Journey 2 — Employee: daily wellbeing loop
```
Dashboard ─▶ Check-in (mood/energy/stress) ─▶ Fitness (steps/water/sleep)
          ─▶ Mental screening (PHQ-9/GAD-7/WHO-5/burnout)
          ─▶ Health score recomputes ─▶ Wellness Coach shows personalised tips
          ─▶ Medication reminders tracked
```

## Journey 3 — HR: workforce intervention
```
SSO (HR) ─▶ HR Analytics ─▶ workforce score + burnout trend
        ─▶ identify at-risk units (burnout ≥ 33%)
        ─▶ disease-trend distribution ─▶ plan targeted program
        (only anonymous, aggregated data — never individuals)
```

## Journey 4 — Executive: strategic oversight
```
SSO (Exec) ─▶ Executive Dashboard ─▶ Organizational Health Index (gauge)
          ─▶ predictive projection (health & burnout, 3 months)
          ─▶ wellbeing indicators ─▶ decide policy / resourcing
```

---

## Wireframes (low-fidelity)

### Employee Dashboard (mobile)
```
┌───────────────────────────────┐
│ ◑ SEHAT            [Pegawai] ⏻ │
├───────────────────────────────┤
│ Halo, Andi 👋                  │
│ ┌───────────────────────────┐ │
│ │  Skor Kesehatan      ╭──╮  │ │
│ │  [Baik]              ( 74 )│ │
│ │  komposit aktivitas… ╰──╯  │ │
│ └───────────────────────────┘ │
│ [🚶8.000][💧1.2L][😴7j][⚖️25] │
│ ┌── Aksi Cepat ─────────────┐ │
│ │ 🩺 Cek Gejala  📝 Check-in │ │
│ │ 🧠 Mental      👨‍⚕️ Telemed │ │
│ └───────────────────────────┘ │
│ ✨ Rekomendasi Wellness …     │
├───────────────────────────────┤
│ 🏠   🩺   🏃   🧠   ⚙️         │
└───────────────────────────────┘
```

### AI Symptom Checker (chat)
```
┌───────────────────────────────┐
│ 🩺 AI Symptom Checker          │
│ ┌───────────────────────────┐ │
│ │ 🤖 Ceritakan keluhan Anda… │ │
│ │            demam, batuk 🙋 │ │
│ │ 🤖 Saya mencatat: Demam,   │ │
│ │    Batuk. Ada lagi?        │ │
│ │ [🔍 Analisis gejala]       │ │
│ └───────────────────────────┘ │
│ [ tulis keluhan… ] [ Kirim ]  │
└───────────────────────────────┘
        ▼ after analysis
┌───────────────────────────────┐
│ Hasil triage   [Risiko Sedang]│
│ • Influenza  ICD-11 1E32  57% │
│ • Common Cold ICD-11 CA00 60% │
│ [👨‍⚕️ Rujukan telemedicine]    │
└───────────────────────────────┘
```

### HR Analytics (responsive)
```
┌───────────────────────────────┐
│ 📊 HR Analytics  (anonim)      │
│ [Health 74] [Burnout 29%]      │
│ [Partisipasi 77%] [n 1.860]    │
│ 📈 line: health vs burnout     │
│ 🏢 bars: skor per unit         │
│ 🦠 donut: tren penyakit        │
│ ⚠️ unit risiko tinggi (list)   │
└───────────────────────────────┘
```

### Executive Dashboard
```
┌───────────────────────────────┐
│ 📈 Executive                   │
│        ╭─────╮  OHI            │
│       (  73  ) [Baik]          │
│        ╰─────╯                 │
│ [Produktivitas][Absensi][Lembur]│
│ 🔮 proyeksi health (3 bln)     │
│ 🔥 proyeksi burnout + alert    │
│ 🧭 indikator wellbeing (bars)  │
└───────────────────────────────┘
```

These wireframes are realised 1:1 by the shipped views in `js/app.js`.
