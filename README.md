# DevT — Frontend + Backend

Aplikasi manajemen project & task (P0 MVP) all-in-one: **Next.js 16** (App
Router, Turbopack) + TypeScript + Tailwind CSS v4 untuk UI **dan** API REST
(Route Handlers di `app/api/backend/**` + Prisma + PostgreSQL). Autentikasi JWT.

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
- **Notifikasi:** lonceng di topbar dengan jumlah belum dibaca (polling tiap 30
  detik), dropdown pratinjau, dan halaman daftar (tandai dibaca / semua dibaca /
  hapus, paginasi). Dikirim backend saat Anda ditugaskan ke sebuah task
  (in-app + email).
- Profil: informasi akun + statistik.
- Responsif (mobile drawer + desktop sidebar).

## Prasyarat

- Node.js 20+ dan npm.
- PostgreSQL yang bisa diakses (mis. container `backend_devt-db` di
  `127.0.0.1:5433`, atau instalasi lokal di port 5432).

## Konfigurasi

Salin `.env.example` menjadi `.env` lalu sesuaikan:

```
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/davt_next
JWT_SECRET=change-me-to-a-long-random-string-32+
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DevT
```

API dijalankan sebagai Route Handlers Next.js di `app/api/backend/**`; frontend
memanggil path relatif same-origin `/api/backend/*` (tanpa proxy, tanpa CORS).

## Menjalankan

```bash
npm install
npx prisma migrate dev     # buat tabel (sekali saja)
npm run db:seed            # data contoh (opsional)
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
npm test           # Vitest (unit test)
npm run db:reset   # reset database + migrate + seed
npm run db:studio  # Prisma Studio
```

## Docker

`next.config.ts` memakai `output: "standalone"`. Build & jalankan:

```bash
docker compose up --build            # http://localhost:3000
```

atau manual:

```bash
docker build -t frontend_davt .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://... -e JWT_SECRET=... frontend_davt
```

`DATABASE_URL` dan `JWT_SECRET` wajib diset saat runtime (bukan build).
Detail lengkap ada di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Dokumentasi

- [`docs/API.md`](docs/API.md) — kontrak REST API `/api/v1` (endpoint, filter, response, error).
- [`docs/ERD.md`](docs/ERD.md) — ERD & aturan relasi backend.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — konfigurasi, Docker, deploy, checklist rilis.
- [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md) — daftar tangkapan layar.

## Arsitektur singkat

- **API Route Handlers** (`app/api/backend/**`): implementasi REST API menggantikan
  backend Laravel `backend_devt`, dengan kontrak response identik (lihat
  [`docs/API.md`](docs/API.md)). Logika server ada di `lib/server/*`
  (validasi, JWT, kebijakan aksi workspace, serializer).
- **ORM** (Prisma + PostgreSQL): skema di `prisma/schema.prisma`; migration
  dijalankan lewat `npx prisma migrate dev`.
- **Route protection** (`proxy.ts`, pengganti `middleware` di Next 16):
  membaca cookie `davt_token`; redirect ke `/login` bila belum masuk dan ke
  `/dashboard` bila sudah masuk tetapi membuka `/login` `/register`. Rute baru
  `workspaces/*` dan `invitations/*` ikut dilindungi.
- **Auth** (`lib/auth.ts`, `components/providers/auth-provider.tsx`): token
  disimpan di cookie `davt_token` (dibaca oleh proxy) dan user di
  `localStorage`. API client otomatis menyegarkan token lewat
  `POST /auth/refresh` saat menerima 401.
- **API client** (`lib/api.ts`): `request<T>()` terpusat, error divalidasi
  menjadi `ApiError` (pesan + `errors` per field dari respons 422).
  Client menyisipkan header `X-Workspace-Id` dari workspace aktif.
- **Workspace context** (`components/providers/workspace-provider.tsx`,
  `lib/workspace.ts`): memuat daftar workspace dari `/me`, menyimpan workspace
  aktif di `localStorage` (`davt_workspace`), memuat anggota workspace aktif, dan
  menyediakan helper peran (`managesWorkspace`, `contributesToWorkspace`) dan
  izin task (`canEditTaskDetails`, `canChangeTaskStatus`,
  `canManageTaskAttachments`): `Owner`/`Admin` bebas; `Member` hanya boleh
  mengubah status (dan lampiran) pada task yang di-*assign* ke dirinya.
  Berganti workspace me-*remount* konten (`<main key={activeWorkspaceId}>`)
  agar halaman memuat ulang data.
- **Halaman data** adalah Client Component (`"use client"`) yang mengambil data
  dari API; validasi form memakai Zod (`lib/validation.ts`) dan selaras dengan
  aturan backend (mis. `Blocked` wajib `blocked_reason`).

## Struktur direktori

```
app/
  (auth)/         # login, register (layout tanpa shell)
  (app)/          # area terproteksi: dashboard, projects, tasks, notifications,
                  #   profile, workspaces/[id], invitations/[token]
  api/backend/    # Route Handlers REST (auth, workspaces, projects, tasks, ...)
lib/              # api, auth, validation, types, enums, workspace, notifications, utils
lib/server/       # logika API: db (Prisma), jwt, validation, auth/policy, resources
prisma/           # schema.prisma, migration, seed.ts
components/
  layout/         # app shell (sidebar + topbar), workspace switcher, notification bell
  providers/      # AuthProvider, WorkspaceProvider, NotificationProvider
  ui/             # primitif UI (Button, Input, Modal, dll.)
  tasks/          # badge, list item, kanban, form, assignee chip
  projects/       # card, form
  workspaces/     # workspace form, invite form
  dashboard/      # stat card
tests/            # unit test Vitest
docs/             # API, ERD, deployment, screenshots
proxy.ts          # proteksi rute
Dockerfile        # image standalone
docker-compose.yml
```

## Catatan backend

- Endpoint: `/api/backend/*` (Route Handlers Next.js; kontrak sama dengan
  `docs/API.md` yang semula dilayani Laravel `/api/v1/*`).
- Project & task berada di dalam **workspace**; permintaan menyertakan header
  `X-Workspace-Id` (bila kosong, backend memakai personal workspace user yang
  dibuat otomatis). Non-anggota → `403`, workspace tidak dikenal → `404`.
- Nilai enum menerima alias (`in_progress`, `InProgress`, `In Progress`); peran
  workspace harus persis `Owner | Admin | Member | Viewer`.
- Pencarian teks dilakukan di sisi klien terhadap halaman yang sedang tampil,
  karena endpoint list belum mendukung parameter `search`. Gunakan filter
  server-side (status/prioritas/tipe/project/assignee/tanggal) untuk
  mempersempit data lintas halaman.
- Pagination memakai `meta.current_page` / `meta.last_page`; `links.first/last/
  prev/next` memakai host request sendiri (bukan host backend terpisah).
- Filter deadline memakai parameter `due_before`/`due_after`; hasilnya dirapikan
  di klien agar task berstatus `Done` tidak ikut terhitung terlambat.
- **Lampiran task:** `POST /tasks/{id}/attachments` (multipart `file`, gambar
  JPG/PNG/WEBP/GIF maks 2 MB) dan `DELETE /attachments/{id}`. File disimpan di
  `storage/app/private/task-attachments/{taskId}/` dan diakses lewat URL bertanda
  tangan (`/storage/{path}?expires=&signature=`, berlaku 24 jam). Policy sama
  dengan ubah status (pengelola workspace atau assignee).
- **Notifikasi:** `GET /notifications` (paginated; `per_page` di-clamp 1–100,
  default 15), `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`,
  `POST /notifications/read-all`, `DELETE /notifications/{id}`. Notifikasi dibuat
  saat task diberikan ke assignee lain (bukan self-assign) pada create/ubah
  assignee, disertai email (mailer `log` saat pengembangan).

## Keamanan dependensi

`npm audit --omit=dev` bersih (0 kerentanan pada dependensi produksi). Sisa
advisory hanya pada dependensi pengembangan (`eslint-config-next` → `braces`, dan
`vitest` → `tinypool`); perbaikannya memerlukan upgrade mayor yang breaking,
sehingga sengaja tidak dipaksakan (`npm audit fix --force` akan menurunkan
`eslint-config-next` ke v14).
