# DevT — Frontend

Frontend untuk aplikasi manajemen project & task (P0 MVP). Dibangun dengan
**Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4, dan
mengonsumsi REST API Laravel (`backend_devt`) dengan autentikasi JWT.

## Fitur

- Autentikasi: register, login, logout, proteksi rute.
- **Workspace tim:** pemilih workspace di topbar, buat workspace, kelola anggota
  (ubah peran/keluarkan), undang via email, terima undangan lewat link, kelola
  (ubah nama / hapus) workspace.
- Dashboard: ringkasan project/task, prioritas hari ini, deadline terdekat, laporan mingguan.
- Projects: CRUD, filter status, pencarian, pagination server-side, halaman detail.
- Tasks: CRUD, Kanban (drag & drop) + list, filter status/prioritas/tipe/project,
  filter deadline (terlambat / 7 hari ke depan), sortir, pencarian, pagination
  server-side, ubah status/prioritas cepat, **penanggung jawab (assignee)**.
- Detail task: riwayat aktivitas (activity log), estimasi vs realisasi jam,
  lampiran foto (unggah/hapus, JPG/PNG/WEBP/GIF maks. 2 MB).
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

Akun demo (sudah berisi data contoh: 2 project, 10 task yang mencakup semua
status/prioritas, sebagian terlambat dan mendekati tenggat; data berada di
**personal workspace** akun demo):

- Email: `demo@davt.test`
- Password: `Password123!`

### Perintah lain

```bash
npm run build      # build produksi (output standalone)
npm run start      # jalankan hasil build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (unit test schema & util)
```

## Docker

`next.config.ts` memakai `output: "standalone"`. Build & jalankan:

```bash
docker compose up --build            # http://localhost:3000
```

atau manual:

```bash
docker build --build-arg BACKEND_API_URL=http://host.docker.internal:8000 -t frontend_davt .
docker run --rm -p 3000:3000 frontend_davt
```

`BACKEND_API_URL` di-bake saat build (rewrite di-resolve ketika `next build`),
jadi berikan sebagai `--build-arg`/env build. Detail lengkap ada di
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Dokumentasi

- [`docs/API.md`](docs/API.md) — kontrak REST API `/api/v1` (endpoint, filter, response, error).
- [`docs/ERD.md`](docs/ERD.md) — ERD & aturan relasi backend.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — konfigurasi, Docker, deploy, checklist rilis.
- [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md) — daftar tangkapan layar.

## Arsitektur singkat

- **Proxy rewrite** (`next.config.ts`): `/api/backend/:path*` →
  `${BACKEND_API_URL}/api/v1/:path*`; `/storage/:path*` →
  `${BACKEND_API_URL}/storage/:path*` (signed URL lampiran task).
- **Route protection** (`proxy.ts`, pengganti `middleware` di Next 16):
  membaca cookie `davt_token`; redirect ke `/login` bila belum masuk dan ke
  `/dashboard` bila sudah masuk tetapi membuka `/login` `/register`. Rute baru
  `workspaces/*` dan `invitations/*` ikut dilindungi.
- **Auth** (`lib/auth.ts`, `components/providers/auth-provider.tsx`): token
  disimpan di cookie `davt_token` (dibaca oleh proxy) dan user di
  `localStorage`. API client otomatis menyegarkan token lewat
  `POST /auth/refresh` saat menerima 401.
- **API client** (`lib/api.ts`): `request<T>()` terpusat, error divalidasi
  menjadi `ApiError` (pesan + `errors` per field dari respons 422 Laravel).
  Client menyisipkan header `X-Workspace-Id` dari workspace aktif.
- **Workspace context** (`components/providers/workspace-provider.tsx`,
  `lib/workspace.ts`): memuat daftar workspace dari `/me`, menyimpan workspace
  aktif di `localStorage` (`davt_workspace`), memuat anggota workspace aktif, dan
  menyediakan helper peran (`managesWorkspace`, `contributesToWorkspace`).
  Berganti workspace me-*remount* konten (`<main key={activeWorkspaceId}>`)
  agar halaman memuat ulang data.
- **Halaman data** adalah Client Component (`"use client"`) yang mengambil data
  dari API; validasi form memakai Zod (`lib/validation.ts`) dan selaras dengan
  aturan backend (mis. `Blocked` wajib `blocked_reason`).

## Struktur direktori

```
app/
  (auth)/         # login, register (layout tanpa shell)
  (app)/          # area terproteksi: dashboard, projects, tasks, profile,
                  #   workspaces/[id], invitations/[token]
lib/              # api, auth, validation, types, enums, workspace, utils
components/
  layout/         # app shell (sidebar + topbar), workspace switcher
  providers/      # AuthProvider, WorkspaceProvider
  ui/             # primitif UI (Button, Input, Modal, dll.)
  tasks/          # badge, list item, kanban, form, assignee chip
  projects/       # card, form
  workspaces/     # workspace form, invite form
  dashboard/      # stat card
tests/            # unit test Vitest
docs/             # ERD, deployment, screenshots
proxy.ts          # proteksi rute
Dockerfile        # image standalone
docker-compose.yml
```

## Catatan backend

- Endpoint: `/api/v1` (lihat `backend_devt/routes/api.php`).
- Project & task berada di dalam **workspace**; permintaan menyertakan header
  `X-Workspace-Id` (bila kosong, backend memakai personal workspace user).
  Non-anggota → `403`, workspace tidak dikenal → `404`.
- Nilai enum harus persis, mis. status task `Backlog | To Do | In Progress |
  In Review | Blocked | Done`; peran workspace `Owner | Admin | Member | Viewer`.
- Pencarian teks dilakukan di sisi klien terhadap halaman yang sedang tampil,
  karena endpoint list belum mendukung parameter `search`. Gunakan filter
  server-side (status/prioritas/tipe/project/assignee/tanggal) untuk
  mempersempit data lintas halaman.
- Pagination memakai `meta.current_page` / `meta.last_page` (link dari backend
  menunjuk ke `localhost:8000`, jadi tidak dipakai).
- Filter deadline memakai parameter `due_before`/`due_after`; hasilnya dirapikan
  di klien agar task berstatus `Done` tidak ikut terhitung terlambat.
- Lampiran task (`POST /tasks/{id}/attachments`, `DELETE /attachments/{id}`)
  memakai `multipart/form-data`; `GET /tasks/{id}` mengembalikan `attachments[]`
  berisi **signed URL** yang di-proxy lewat rewrite `/storage/*`.

## Keamanan dependensi

`npm audit --omit=dev` bersih (0 kerentanan pada dependensi produksi). Sisa
advisory hanya pada dependensi pengembangan (`eslint-config-next` → `braces`, dan
`vitest` → `tinypool`); perbaikannya memerlukan upgrade mayor yang breaking,
sehingga sengaja tidak dipaksakan (`npm audit fix --force` akan menurunkan
`eslint-config-next` ke v14).
