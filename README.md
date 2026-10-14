# DevT — Frontend

Frontend untuk aplikasi manajemen project & task (P0 MVP). Dibangun dengan
**Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4, dan
mengonsumsi REST API Laravel (`backend_devt`) dengan autentikasi JWT.

## Fitur

- Autentikasi: register, login, logout, proteksi rute.
- Dashboard: ringkasan project/task, deadline terdekat, laporan mingguan.
- Projects: CRUD, filter status, pencarian, halaman detail.
- Tasks: CRUD, Kanban (drag & drop) + list, filter status/prioritas/tipe/project,
  sortir, pencarian, ubah status/prioritas cepat.
- Detail task: riwayat aktivitas (activity log), estimasi vs realisasi jam.
- Profil: informasi akun + statistik.
- Responsif (mobile drawer + desktop sidebar).

## Prasyarat

- Node.js 20+ dan npm.
- Backend Laravel (`backend_devt`) berjalan, mis. di `http://localhost:8000`,
  dengan PostgreSQL aktif dan endpoint `/api/v1/*` siap.

## Konfigurasi

Salin `.env.example` menjadi `.env.local` lalu sesuaikan:

```
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=DevT
```

Semua permintaan dari browser memakai path relatif same-origin `/api/backend/*`
yang di-proxy oleh Next.js (`next.config.ts` → `rewrites`) ke
`${BACKEND_API_URL}/api/v1/*`. Ini menghindari CORS dan menyembunyikan URL
backend dari kode klien.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

### Perintah lain

```bash
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (unit test schema & util)
```

## Arsitektur singkat

- **Proxy rewrite** (`next.config.ts`): `/api/backend/:path*` →
  `${BACKEND_API_URL}/api/v1/:path*`.
- **Route protection** (`proxy.ts`, pengganti `middleware` di Next 16):
  membaca cookie `davt_token`; redirect ke `/login` bila belum masuk dan ke
  `/dashboard` bila sudah masuk tetapi membuka `/login` `/register`.
- **Auth** (`lib/auth.ts`, `components/providers/auth-provider.tsx`): token
  disimpan di cookie `davt_token` (dibaca oleh proxy) dan user di
  `localStorage`. API client otomatis menyegarkan token lewat
  `POST /auth/refresh` saat menerima 401.
- **API client** (`lib/api.ts`): `request<T>()` terpusat, error divalidasi
  menjadi `ApiError` (pesan + `errors` per field dari respons 422 Laravel).
- **Halaman data** adalah Client Component (`"use client"`) yang mengambil data
  dari API; validasi form memakai Zod (`lib/validation.ts`) dan selaras dengan
  aturan backend (mis. `Blocked` wajib `blocked_reason`).

## Struktur direktori

```
app/
  (auth)/         # login, register (layout tanpa shell)
  (app)/          # area terproteksi: dashboard, projects, tasks, profile
lib/              # api, auth, validation, types, enums, utils
components/
  layout/         # app shell (sidebar + topbar)
  providers/      # AuthProvider
  ui/             # primitif UI (Button, Input, Modal, dll.)
  tasks/          # badge, list item, kanban, form
  projects/       # card, form
  dashboard/      # stat card
tests/            # unit test Vitest
proxy.ts          # proteksi rute
```

## Catatan backend

- Endpoint: `/api/v1` (lihat `backend_devt/routes/api.php`).
- Nilai enum harus persis, mis. status task `Backlog | To Do | In Progress |
  In Review | Blocked | Done`.
- Pencarian teks dilakukan di sisi klien karena endpoint list belum mendukung
  parameter `search`.
- Pagination memakai `meta.current_page` / `meta.last_page` (link dari backend
  menunjuk ke `localhost:8000`, jadi tidak dipakai).
