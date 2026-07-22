# ⚡ VoltTrack — EV Charging Tracker

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

> Track your electric vehicle charging sessions, energy usage, and costs — all in one place.

---

## 📖 Deskripsi

**VoltTrack** adalah aplikasi web berbasis **Progressive Web App (PWA)** yang membantu pemilik kendaraan listrik (EV) untuk mencatat, memantau, dan menganalisis sesi pengisian daya kendaraan mereka. Dengan VoltTrack, pengguna dapat melacak konsumsi energi (kWh), biaya pengisian, durasi sesi, serta mendapatkan insight melalui visualisasi data yang interaktif.

---

## ✨ Fitur Utama

- 🔐 **Autentikasi Aman** — Register & login dengan JWT-based authentication dan proteksi CSRF token
- ⚡ **Pencatatan Sesi Pengisian** — Catat sesi charging dengan detail: energi (kWh), biaya, lokasi, tipe charger, durasi, dan level baterai
- 📊 **Dashboard Interaktif** — Ringkasan statistik penggunaan bulan ini, tren mingguan, dan aktivitas terbaru
- 📈 **Analytics Mendalam** — Grafik dan visualisasi data konsumsi energi & biaya per periode
- 🗺️ **Peta Stasiun** — Peta interaktif berbasis Leaflet untuk melihat lokasi stasiun pengisian
- 📜 **Riwayat Sesi** — Halaman history lengkap dengan filter dan pagination
- 👤 **Manajemen Profil** — Pengaturan preferensi pengguna: nama kendaraan EV, lokasi default, harga per kWh, mata uang, dan lokasi favorit
- 📱 **PWA Support** — Dapat diinstall sebagai aplikasi di smartphone (Android & iOS)
- 🌗 **Dark / Light Mode** — Toggle tema tanpa flash, disimpan di localStorage
- 🐳 **Docker Ready** — Siap di-deploy menggunakan Docker dan Docker Compose
- 📄 **Export PDF** — Ekspor data sesi ke format PDF menggunakan jsPDF

---

## 🛠️ Tech Stack

| Kategori         | Teknologi                                               |
|------------------|---------------------------------------------------------|
| **Framework**    | [Next.js 16](https://nextjs.org/) (App Router)          |
| **Language**     | [TypeScript 5](https://www.typescriptlang.org/)         |
| **UI**           | React 19, Tailwind CSS v4, Framer Motion, Lucide Icons  |
| **Forms**        | React Hook Form + Zod                                   |
| **Data Fetching**| TanStack React Query v5                                 |
| **ORM**          | [Prisma 7](https://www.prisma.io/) + `@prisma/adapter-pg` |
| **Database**     | PostgreSQL 16                                           |
| **Auth**         | JWT (via `jose`), bcryptjs, CSRF protection             |
| **Maps**         | Leaflet + React Leaflet + react-leaflet-cluster         |
| **Charts**       | Chart.js + react-chartjs-2                              |
| **PDF Export**   | jsPDF + jsPDF-AutoTable                                 |
| **Font**         | Plus Jakarta Sans, JetBrains Mono (Google Fonts)        |
| **Container**    | Docker + Docker Compose                                 |

---

## 📋 Prerequisites

Pastikan tools berikut sudah terinstall sebelum menjalankan project:

| Tool          | Versi Minimum | Link                                                    |
|---------------|---------------|---------------------------------------------------------|
| Node.js       | 20.x          | [nodejs.org](https://nodejs.org/)                       |
| npm           | 10.x          | (bundled dengan Node.js)                                |
| PostgreSQL    | 16.x          | [postgresql.org](https://www.postgresql.org/)           |
| Docker        | 24.x+         | [docker.com](https://www.docker.com/) *(opsional)*      |
| Docker Compose| v2+           | [docs.docker.com](https://docs.docker.com/compose/)     |

---

## 🚀 Instalasi

### Opsi A — Manual (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/aryasatyaaaas/VoltTrack.git
cd VoltTrack

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env .env.local
# Lalu edit .env.local sesuai konfigurasi lokal Anda

# 4. Jalankan migrasi database
npx prisma migrate deploy

# 5. (Opsional) Seed database dengan data awal
npx prisma db seed

# 6. Generate Prisma Client
npx prisma generate

# 7. Jalankan development server
npm run dev
```

Aplikasi akan berjalan di: **http://localhost:3000**

---

### Opsi B — Docker Compose (Recommended untuk Production)

```bash
# 1. Clone repository
git clone https://github.com/aryasatyaaaas/VoltTrack.git
cd VoltTrack

# 2. Set JWT_SECRET sebagai environment variable
export JWT_SECRET="your-super-secret-jwt-key-here"

# 3. Jalankan semua service (app + database)
docker compose up -d

# 4. Jalankan migrasi database (sekali saja)
docker compose exec volttrack-app npx prisma migrate deploy
```

Aplikasi akan berjalan di: **http://localhost:3000**

---

## 🖥️ Cara Pakai

| Halaman      | Route          | Deskripsi                                        |
|--------------|----------------|--------------------------------------------------|
| Landing Page | `/`            | Halaman publik pengenalan VoltTrack              |
| Login        | `/login`       | Login ke akun VoltTrack                          |
| Register     | `/register`    | Buat akun baru                                   |
| Dashboard    | `/dashboard`   | Ringkasan statistik & sesi terbaru               |
| Add Session  | `/charging`    | Form tambah sesi pengisian baru                  |
| History      | `/history`     | Riwayat semua sesi charging                      |
| Analytics    | `/analytics`   | Grafik & insight konsumsi energi dan biaya       |
| Profile      | `/profile`     | Pengaturan profil & preferensi pengguna          |

---

## ⚙️ Konfigurasi

Buat file `.env.local` di root project dengan variabel berikut:

```env
# URL koneksi ke database PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/volttrack"

# Secret key untuk signing JWT token (gunakan string panjang yang aman)
JWT_SECRET="your-super-secret-jwt-key-here"
```

> **⚠️ Penting:** Jangan pernah commit file `.env.local` ke repository. Pastikan sudah terdaftar di `.gitignore`.

---

## 🔌 API Endpoints

| Method   | Endpoint                    | Deskripsi                          | Auth |
|----------|-----------------------------|------------------------------------|------|
| `POST`   | `/api/auth/register`        | Registrasi pengguna baru           | ❌   |
| `POST`   | `/api/auth/login`           | Login dan mendapatkan JWT cookie   | ❌   |
| `POST`   | `/api/auth/logout`          | Logout dan hapus cookie sesi       | ✅   |
| `GET`    | `/api/csrf`                 | Mendapatkan CSRF token             | ❌   |
| `GET`    | `/api/sessions`             | Ambil semua sesi charging          | ✅   |
| `POST`   | `/api/sessions`             | Tambah sesi charging baru          | ✅   |
| `GET`    | `/api/history`              | Ambil riwayat sesi dengan filter   | ✅   |
| `GET`    | `/api/profile`              | Ambil data profil pengguna         | ✅   |
| `PATCH`  | `/api/profile`              | Update profil & preferensi         | ✅   |
| `GET`    | `/api/stations`             | Ambil data lokasi stasiun          | ✅   |
| `GET`    | `/api/health`               | Health check endpoint              | ❌   |

> Semua endpoint yang membutuhkan auth (`✅`) memerlukan JWT cookie yang valid dan header `X-CSRF-Token`.

---

## 📁 Struktur Folder

```
ev_track/
├── prisma/
│   ├── schema.prisma          # Definisi skema database
│   ├── seed.ts                # Script seed data
│   └── migrations/            # File migrasi database
├── public/
│   ├── icons/                 # Icon PWA
│   └── sw.js                  # Service Worker
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Route group halaman utama (protected)
│   │   │   ├── analytics/     # Halaman analytics
│   │   │   ├── charging/      # Halaman tambah sesi
│   │   │   ├── dashboard/     # Halaman dashboard
│   │   │   ├── history/       # Halaman riwayat sesi
│   │   │   └── profile/       # Halaman profil
│   │   ├── api/               # API route handlers
│   │   │   ├── auth/          # Auth endpoints (login, register, logout)
│   │   │   ├── sessions/      # Charging session CRUD
│   │   │   ├── history/       # History dengan filter & pagination
│   │   │   ├── profile/       # Profile management
│   │   │   ├── stations/      # Station data
│   │   │   └── health/        # Health check
│   │   ├── login/             # Halaman login (public)
│   │   ├── register/          # Halaman register (public)
│   │   ├── layout.tsx         # Root layout + font + PWA
│   │   ├── manifest.ts        # PWA manifest
│   │   └── globals.css        # Global styles & design tokens
│   ├── components/
│   │   ├── analytics/         # Komponen halaman analytics
│   │   ├── auth/              # CsrfProvider, form auth
│   │   ├── charging/          # ChargingForm
│   │   ├── dashboard/         # PersonalHero, HighlightCards, Timeline
│   │   ├── history/           # Tabel & filter riwayat
│   │   ├── landing/           # Komponen landing page
│   │   ├── layout/            # Sidebar, Navbar, ThemeToggle
│   │   ├── map/               # Leaflet map components
│   │   ├── profile/           # ProfileForm, DangerZone
│   │   ├── pwa/               # PWARegister
│   │   └── ui/                # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Prisma client, session, errors, utils
│   ├── services/              # Server-side data fetching services
│   └── types/                 # TypeScript type definitions
├── .env                       # Environment variables template
├── .gitignore
├── docker-compose.yml         # Docker Compose config
├── Dockerfile                 # Multi-stage Docker build
├── next.config.ts             # Next.js configuration
├── prisma.config.ts           # Prisma CLI configuration
├── package.json
└── tsconfig.json
```

---

## 🐳 Deployment dengan Docker

```bash
# Build dan jalankan semua container
docker compose up -d --build

# Lihat log aplikasi
docker compose logs -f volttrack-app

# Hentikan semua container
docker compose down

# Hentikan dan hapus volume (data database)
docker compose down -v
```

---

## 🤝 Contributing

Kontribusi sangat disambut! Berikut cara berkontribusi:

1. **Fork** repository ini
2. Buat branch fitur baru: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambahkan fitur X'`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buka **Pull Request** ke branch `main`

Gunakan [Conventional Commits](https://www.conventionalcommits.org/) untuk pesan commit (`feat:`, `fix:`, `docs:`, `chore:`, dll).

---

## 🗺️ Roadmap

- [ ] Notifikasi pengingat pengisian (push notification)
- [ ] Integrasi dengan OCPP / API stasiun publik
- [ ] Perbandingan antar kendaraan EV
- [ ] Export data ke format CSV
- [ ] Dashboard admin multi-pengguna
- [ ] Integrasi OAuth (Google, Apple)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

---

## 👤 Author

**Aryasatya**

- GitHub: [@aryasatyaaaas](https://github.com/aryasatyaaaas)

---

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/) — Framework React produksi yang luar biasa
- [Prisma](https://www.prisma.io/) — ORM modern untuk TypeScript
- [Leaflet](https://leafletjs.com/) — Library peta open-source
- [Chart.js](https://www.chartjs.org/) — Visualisasi data yang fleksibel
- [Framer Motion](https://www.framer.com/motion/) — Animasi React yang halus
- [Lucide Icons](https://lucide.dev/) — Icon pack yang konsisten dan indah
- [TanStack Query](https://tanstack.com/query) — Manajemen state server yang powerful
