# 🩺 SEHAT — Sistem Ekosistem Health, Analytics & Telemedicine

**Employee Health Intelligence Platform** untuk **KPU Indonesia** — sebuah
**Progressive Web App (PWA)** yang menggabungkan AI Symptom Checker,
telemedicine triage, occupational health, fitness tracking, skrining kesehatan
mental, deteksi burnout, wellness coaching, dan dashboard analitik untuk HR &
eksekutif.

> ⚠️ **Prototipe edukatif. Bukan alat diagnosis medis.** Selalu konsultasikan
> dengan tenaga kesehatan profesional.

Dibangun sebagai **PWA paling murah**: 100% statis, **tanpa backend**, **tanpa
build step**, **tanpa dependensi runtime** — bisa di-hosting **gratis ($0/bulan)**
di GitHub Pages / Cloudflare Pages / Netlify, dan tetap berjalan **offline**.

---

## ✨ Fitur

### 👤 Pegawai (Employee)
- **AI Symptom Checker** — triage percakapan, ekstraksi gejala, pertanyaan
  dinamis, pemetaan **ICD-11**, klasifikasi risiko, **deteksi darurat**.
- **Check-in Harian** — mood, energi, stres.
- **Fitness Tracker** — langkah, hidrasi, tidur, berat badan, **kalkulator BMI**,
  grafik tren.
- **Kesehatan Mental** — **PHQ-9, GAD-7, WHO-5,** dan **asesmen burnout** dengan
  skoring tervalidasi + safeguard self-harm.
- **Pengingat Obat** — jadwal & pelacakan kepatuhan.
- **Wellness Coach** — rekomendasi personal, pengingat peregangan & duduk lama.
- **Telemedicine** — rujukan dokter, penjadwalan, riwayat & rekomendasi.

### 👤 HR Administrator
- Workforce health score, **analitik burnout**, tren penyakit (agregat),
  wawasan **100% anonim** (k-anonymity).

### 👤 Executive
- **Organizational Health Index**, indikator wellbeing, **analitik prediktif**
  (proyeksi kesehatan & burnout).

Semua peran masuk via **mock SSO** dengan **RBAC** (navigasi & rute menyesuaikan
peran). Skor kesehatan komposit dihitung dari sinyal fitness + mental + gaya
hidup secara real-time.

---

## 🚀 Menjalankan secara lokal

Tidak ada build. Cukup sajikan folder sebagai file statis:

```bash
cd sehat
python3 -m http.server 8080
# buka http://localhost:8080/
```

Login memakai salah satu akun demo (Pegawai / HR / Executive) — tidak ada
kredensial yang disimpan.

> Catatan: service worker & `import` modul ES butuh disajikan via HTTP (bukan
> `file://`). Gunakan perintah di atas.

---

## ☁️ Deploy gratis (PWA termurah)

Semua path bersifat **relatif**, jadi aplikasi bekerja dari sub-path mana pun.

### Opsi 1 — GitHub Pages (disarankan, $0)
Repo ini diatur untuk meletakkan SEHAT di **repo terpisah**. Untuk
mempublikasikan:

```bash
# dari dalam folder sehat/ — jadikan ini repo sendiri:
git init -b main
git add .
git commit -m "SEHAT PWA"
git remote add origin https://github.com/<user>/sehat.git
git push -u origin main
```
Lalu aktifkan **Settings → Pages → Source: GitHub Actions**. Workflow
`.github/workflows/deploy-pages.yml` akan mem-publish situs.
Hidup di `https://<user>.github.io/sehat/`.

### Opsi 2 — Cloudflare Pages / Netlify / Vercel
Tarik-letakkan folder `sehat/` (atau hubungkan repo). **Build command:** kosong.
**Output dir:** root.

---

## 🧱 Arsitektur & Deliverables

Dokumentasi enterprise lengkap ada di [`docs/`](./docs):

| Dokumen | Isi |
|---|---|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Diagram arsitektur sistem, microservices, RAG pipeline, folder structure |
| [ERD.md](./docs/ERD.md) | Database ERD + skema PostgreSQL + anonimisasi |
| [API-SPEC.md](./docs/API-SPEC.md) | Spesifikasi REST API (target FastAPI) + feed Power BI |
| [SECURITY.md](./docs/SECURITY.md) | Zero Trust, AES-256, audit trail, RBAC, kepatuhan |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Docker, docker-compose, Kubernetes, CI/CD, biaya |
| [USER-JOURNEYS.md](./docs/USER-JOURNEYS.md) | Peta perjalanan pengguna + wireframe |

**Mode pengiriman:** aplikasi yang dikirim adalah *slice termurah* (PWA statis,
logika klinis di sisi klien). Arsitektur target (Next.js 15 + FastAPI +
PostgreSQL + Redis + OpenAI/LangChain + RAG di Kubernetes) didokumentasikan agar
bisa dinaikkan tanpa menulis ulang UI — lihat `docs/ARCHITECTURE.md`.

---

## 🗂️ Struktur

```
sehat/
├── index.html · manifest.webmanifest · sw.js   # PWA shell + offline
├── css/styles.css                              # UI mobile-first
├── js/  app.js · store.js · data.js · ai.js · charts.js
├── icons/                                       # ikon (di-generate)
├── scripts/generate-icons.mjs                   # generator ikon tanpa dependensi
├── docs/                                        # deliverables arsitektur
└── .github/workflows/deploy-pages.yml           # CI/CD (untuk repo mandiri)
```

## 🛠️ Teknologi (shipped)
Vanilla **ES Modules**, **Web Components-free**, **SVG charts** buatan sendiri,
**Service Worker** (offline-first), **Web App Manifest**, `localStorage`.
**Nol dependensi runtime.** Logika inti (AI engine, scoring) murni & teruji di
Node.

## 🔐 Privasi
Pada build statis ini, **seluruh data kesehatan tersimpan lokal** di perangkat
pengguna (`localStorage`) — tidak ada server, tidak ada pengiriman PHI. Pengguna
bisa **mengekspor** atau **menghapus** seluruh datanya dari menu *Lainnya*.

---

© KPU Indonesia — SEHAT v1.0.0. Prototipe non-komersial untuk demonstrasi.
