# API Reference — DevTask

Kontrak REST API yang dikonsumsi frontend. Dokumen ini semula merefleksikan
backend Laravel `backend_devt` (`/api/v1`); kini kontrak yang sama diimplementasikan
oleh Route Handlers Next.js di `app/api/backend/**` (prefix `/api/backend`).

- **Base URL (lokal):** `http://localhost:3000/api/backend`
- **Autentikasi:** JWT bearer (`Authorization: Bearer <access_token>`)
- **Workspace aktif:** header `X-Workspace-Id` (lihat §4)
- **Format:** JSON (`Content-Type: application/json`, `Accept: application/json`)

> Frontend memanggil path same-origin `/api/backend/*` yang dilayani langsung
> oleh Route Handlers Next.js (tanpa proxy, tanpa CORS). Catatan pada dokumen
> ini yang menyebut `/api/v1` atau backend Laravel merujuk ke kontrak historis;
> path yang dipanggil frontend selalu berprefix `/api/backend`.

> Seluruh endpoint pada dokumen ini (§1–§15, termasuk lampiran dan notifikasi)
> sudah diimplementasikan di `app/api/backend/**`; hanya `/storage/{path}` yang
> berada di luar prefix tersebut (route tanda tangan file, lihat §14).

## 1. Konvensi response

Resource tunggal dibungkus `data`:

```json
{ "data": { "id": 1, "name": "Demo Project" } }
```

Resource koleksi ber-paginasi menyertakan `data`, `links`, dan `meta`:

```json
{
  "data": [ { "id": 12, "title": "Implement RBAC middleware" } ],
  "links": { "first": "...", "last": "...", "prev": null, "next": null },
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 20,
    "total": 1,
    "from": 1,
    "to": 1
  }
}
```

Koleksi tanpa paginasi (mis. activity log, upcoming) hanya berisi `data`:

```json
{ "data": [ { "id": 3, "action": "status_changed" } ] }
```

Paginasi frontend memakai `meta.current_page` / `meta.last_page` / `meta.total`
(link `links.*` menunjuk ke `localhost:8000`, jadi tidak dipakai).

### Error

```json
{ "message": "The given data was invalid.", "errors": { "title": ["The title field is required."] } }
```

`errors` hanya muncul pada `422`. Frontend memetakannya lewat
`ApiError.flattenErrors()` (`lib/api.ts`).

## 2. Enum

Output API memakai **Title Case**. Input menerima Title Case, `snake_case`, atau
nama case tanpa pemisah (mis. `in_progress`, `In Progress`, `InProgress`).

| Enum | Nilai |
| --- | --- |
| `TaskStatus` | `Backlog`, `To Do`, `In Progress`, `In Review`, `Blocked`, `Done` |
| `TaskPriority` | `Low`, `Medium`, `High`, `Critical` |
| `TaskType` | `Feature`, `Bug`, `Maintenance`, `Support`, `Research` |
| `ProjectStatus` | `Active`, `On Hold`, `Completed`, `Archived` |
| `UserRole` | `Admin`, `User` (peran platform; default `User`) |
| `WorkspaceRole` | `Owner`, `Admin`, `Member`, `Viewer` (peran per-workspace) |

`UserRole` mengatur hak platform (super-admin). Peran kolaborasi tim disimpan
per-workspace pada `workspace_members.role` (`WorkspaceRole`) dan dikirim sebagai
`role` pada resource workspace/member.

Timestamp dikirim format ISO 8601 (UTC); tanggal (`due_date`, `start_date`)
format `YYYY-MM-DD`.

## 3. Authentication

| Method | Endpoint | Auth | Fungsi |
| --- | --- | --- | --- |
| POST | `/register` | – | Membuat akun (status `201`) |
| POST | `/login` | – | Login, mengembalikan JWT |
| POST | `/auth/login` | – | Alias `/login` |
| GET | `/me` | ✔ | Profil pengguna aktif |
| POST | `/logout` | ✔ | Membatalkan token |
| POST | `/auth/refresh` | ✔ | Menyegarkan token |

**`POST /register`** — body: `name` (required, ≤255), `email` (required, unik,
≤255), `password` (required, `confirmed`). Contoh response (`201`):

```json
{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600 }
```

**`POST /login`** — body: `email`, `password`. Response sama seperti di atas.
Kredensial salah → `401 {"message":"Invalid credentials."}`.

**`GET /me`** mengembalikan profil, peran platform (`role`), dan daftar
workspace yang diikuti (`workspaces[]`):

```json
{
  "data": {
    "id": 1,
    "name": "Demo User",
    "email": "demo@davt.test",
    "email_verified_at": null,
    "role": "User",
    "workspaces": [
      { "id": 1, "name": "Demo User", "slug": "demo-user", "is_personal": true, "role": "Owner" },
      { "id": 4, "name": "Tim Produk", "slug": "tim-produk", "is_personal": false, "role": "Admin" }
    ],
    "created_at": "2026-10-14T01:56:44+00:00"
  }
}
```

## 4. Workspace aktif (`X-Workspace-Id`)

Semua project dan task berada di dalam sebuah **workspace**. Selain token,
endpoint yang menyentuh project/task/dashboard/report memerlukan header:

```
X-Workspace-Id: 4
```

Aturan resolusi workspace aktif (middleware `active.workspace`):

- Bila header dikirim: workspace harus ada (`404` bila tidak) dan user harus
  menjadi anggotanya (`403` bila bukan anggota).
- Bila header **tidak** dikirim: backend memakai **personal workspace** user.
- Peran per-workspace (`Owner`/`Admin`/`Member`/`Viewer`) menentukan izin:
  - Lihat data: semua anggota.
  - Buat project & task: `contributes` (bukan `Viewer`).
  - Ubah **detail** project & task (judul, deskripsi, prioritas, penanggung
    jawab, tenggat, jam, tipe): `managesWorkspace` (`Owner` atau `Admin`).
  - Ubah **status** task: `managesWorkspace`, **atau** `Member` yang merupakan
    `assignee_id` task tersebut. Kelola lampiran task mengikuti aturan ini.
  - Hapus project/kelola anggota/undang: `managesWorkspace` (`Owner` atau `Admin`).

Frontend menyimpan workspace aktif di `localStorage` (`davt_workspace`) dan
mengirimnya otomatis lewat header ini (`lib/api.ts`).

## 5. Workspaces

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/workspaces` | Daftar workspace user (tanpa paginasi) |
| POST | `/workspaces` | Buat workspace tim (`201`) |
| GET | `/workspaces/{id}` | Detail workspace |
| PUT / PATCH | `/workspaces/{id}` | Ubah nama workspace |
| DELETE | `/workspaces/{id}` | Hapus workspace (`204`; `409` bila masih punya project) |
| GET | `/workspaces/{id}/members` | Daftar anggota |
| PATCH | `/workspaces/{id}/members/{user}` | Ubah peran anggota |
| DELETE | `/workspaces/{id}/members/{user}` | Keluarkan anggota (`204`) |
| GET | `/workspaces/{id}/invitations` | Daftar undangan pending |
| POST | `/workspaces/{id}/invitations` | Undang via email (`201`) |
| DELETE | `/workspaces/{id}/invitations/{invitation}` | Cabut undangan (`204`) |
| POST | `/invitations/{token}/accept` | Terima undangan (`200`) |

Resource workspace:

```json
{ "data": { "id": 4, "name": "Tim Produk", "slug": "tim-produk", "is_personal": false, "role": "Owner", "members_count": 3 } }
```

Resource anggota (`/members`):

```json
{ "data": [ { "id": 9, "user_id": 5, "name": "Test User", "email": "test@example.com", "role": "Member", "joined_at": "2026-10-15T04:00:00+00:00" } ] }
```

- **Buat workspace** — body: `name` (required ≤150). Pembuat otomatis menjadi
  `Owner`; `slug` dibuat dari nama (+sufiks numerik bila bentrok).
- **Ubah peran** — body: `role` (enum `WorkspaceRole`, **bukan** `Owner`).
- **Undang** — body: `email` (required, ≤255), `role` (default `Member`, tidak
  boleh `Owner`). Ditolak `422` bila email sudah jadi anggota atau sudah punya
  undangan pending. Undangan berlaku **7 hari**; email dikirim via mailer
  (driver `log` pada dev).
- **Terima undangan** — `POST /invitations/{token}/accept` (tanpa header
  workspace). Email user harus sama dengan email undangan (`403`); undangan
  tidak pending/kedaluwarsa → `410`. Respons mengembalikan workspace yang
  diikuti.
- **Hapus** — diblokir (`409`) bila workspace masih punya project; workspace
  personal tidak dapat dihapus.

## 6. Projects

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/projects` | Daftar project (paginated, default `per_page=15`) |
| POST | `/projects` | Membuat project (`201`) |
| GET | `/projects/{id}` | Detail project + `tasks[]` + `tasks_count` |
| PUT / PATCH | `/projects/{id}` | Memperbarui project |
| DELETE | `/projects/{id}` | Hapus project (`204`; `409` bila masih punya task) |
| GET | `/projects/{id}/tasks` | Daftar task dalam project |

Body create/update: `name` (required ≤150), `description` (nullable),
`status` (enum `ProjectStatus`, default `Active`), `start_date` (nullable date),
`due_date` (nullable date, `after_or_equal:start_date`).

Resource project:

```json
{
  "id": 1,
  "workspace_id": 4,
  "user_id": 1,
  "created_by": 1,
  "name": "Demo Project",
  "description": "Project percobaan",
  "status": "Active",
  "start_date": "2026-09-01",
  "due_date": "2026-12-31",
  "created_at": "2026-10-14T01:56:44+00:00",
  "updated_at": "2026-10-14T01:56:44+00:00",
  "tasks_count": 5
}
```

`/projects` dan `/projects/{id}` selalu ter-scope ke workspace aktif
(`X-Workspace-Id`). Project di luar workspace aktif tidak terlihat; mengaksesnya
langsung → `404`.

> **Kebijakan hapus:** `DELETE` melakukan hard delete dan gagal (`409`) jika
> project masih memiliki task. Untuk menonaktifkan project tanpa kehilangan data,
> ubah `status` menjadi `Archived`. Izin hapus: `managesWorkspace` **atau**
> pembuat project (`created_by`).

## 7. Tasks

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/tasks` | Daftar task + filter (paginated, default `per_page=15`) |
| POST | `/tasks` | Membuat task (butuh `project_id`) (`201`) |
| POST | `/projects/{id}/tasks` | Membuat task di project route (`201`) |
| GET | `/tasks/{id}` | Detail task + `subtasks[]` + `activity_logs[]` |
| PUT / PATCH | `/tasks/{id}` | Memperbarui task |
| PATCH | `/tasks/{id}/status` | Ubah status saja |
| PATCH | `/tasks/{id}/priority` | Ubah prioritas saja |
| DELETE | `/tasks/{id}` | Soft delete (`204`) |
| GET | `/tasks/{id}/activities` | Riwayat aktivitas (semua, tanpa paginasi) |
| GET | `/tasks/{id}/activity-logs` | Alias `activities` |
| POST | `/tasks/{id}/attachments` | Unggah foto lampiran (`multipart`, field `file`) (`201`) |
| DELETE | `/attachments/{id}` | Hapus lampiran + filenya (`204`) |

Body create: `project_id` (required pada `POST /tasks`), `title` (required ≤200),
`type` (required enum `TaskType`), `description` (nullable), `status`
(default `Backlog`), `priority` (default `Medium`), `due_date` (nullable),
`estimated_hours` / `actual_hours` (nullable, ≥0), `parent_task_id` (nullable,
harus satu project), `assignee_id` (nullable, harus `user_id` anggota workspace
**sama** dengan project task; `422` bila bukan anggota), `blocked_reason`
(**wajib bila `status=Blocked`**).

Body update menerima field yang sama secara parsial (`sometimes`).
`PATCH /tasks/{id}/status` → `{ "status": "...", "blocked_reason": "..." }`.
`PATCH /tasks/{id}/priority` → `{ "priority": "..." }`.

Aturan bisnis (dijaga backend, atomik):
- `status=Done` mengisi `completed_at`; keluar dari `Done` mengosongkan kembali.
- `status=Blocked` mewajibkan `blocked_reason`.
- Setiap perubahan status/perubahan penting menulis `task_activity_logs`.

Izin task (lihat juga §4):

- `PUT/PATCH /tasks/{id}` dan `PATCH /tasks/{id}/priority` → **hanya**
  `Owner`/`Admin` (`managesWorkspace`); `Member`/`Viewer` mendapat `403`.
- `PATCH /tasks/{id}/status` → `Owner`/`Admin` untuk task apa pun, atau
  `Member` yang menjadi `assignee_id` task tersebut; selain itu `403`.
- `POST /tasks/{id}/attachments` dan `DELETE /attachments/{id}` mengikuti
  aturan status di atas.

Resource task (dengan `project` ter-load):

```json
{
  "id": 4,
  "project_id": 1,
  "created_by": 1,
  "updated_by": null,
  "parent_task_id": null,
  "assignee_id": 5,
  "title": "Implementasi autentikasi JWT",
  "description": "...",
  "type": "Feature",
  "status": "In Progress",
  "priority": "Critical",
  "due_date": "2026-10-12",
  "estimated_hours": 16,
  "actual_hours": 6.5,
  "completed_at": null,
  "blocked_reason": null,
  "created_at": "2026-10-14T01:56:44+00:00",
  "updated_at": "2026-10-14T01:56:44+00:00",
  "project": { "id": 1, "name": "Demo Project", "status": "Active" },
  "assignee": { "id": 5, "name": "Test User", "email": "test@example.com" }
}
```

`assignee` di-*load* pada `GET /tasks/{id}`; pada list (`GET /tasks`) frontend
mencocokkan `assignee_id` dengan peta anggota workspace. Task juga ter-scope ke
workspace aktif.

### Lampiran (attachments)

Task dapat memiliki foto lampiran: **JPG, PNG, WEBP, atau GIF**, **maksimal
2 MB** per file. `GET /tasks/{id}` menyertakan `attachments[]`:

```json
{
  "attachments": [
    {
      "id": 1,
      "task_id": 3,
      "user_id": 1,
      "original_name": "bukti.png",
      "mime_type": "image/png",
      "size": 69312,
      "url": "http://localhost:8000/storage/task-attachments/3/xxxx.png?expires=1792048286&signature=b5197a49...",
      "created_at": "2026-10-14T07:11:26+00:00"
    }
  ]
}
```

- **Unggah**: `POST /tasks/{id}/attachments` dengan `multipart/form-data` berisi
  field `file`. Jangan kirim `Content-Type: application/json`. Otorisasi =
  pemilik task; route binding mengembalikan `404` untuk task milik user lain.
  Validasi gagal → `422` dengan `errors.file` (mis. "Ukuran foto maksimal 2 MB.").
- **Hapus**: `DELETE /attachments/{id}` menghapus record **dan** file di storage.
- File disimpan pada disk `local` (`storage/app/private`) — **tidak** publik.
  `url` adalah **signed URL** berumur pendek (kedaluwarsa 24 jam) yang
  divalidasi tanpa perlu header Authorization.
- URL `url` dibuat oleh backend dengan origin `FRONTEND_URL`; frontend cukup
  memakai path relatifnya (`url` tanpa origin, lihat `storagePath()` di
  `lib/utils.ts`). Serve file ditangani Route Handler `app/storage/[...path]`
  (rewrite `next.config.ts` sudah dihapus); signature dihitung dari
  `path?expires=` dengan HMAC-SHA256 (`JWT_SECRET`).
- Unggah/hapus lampiran menulis `task_activity_logs`
  (`attachment_added` / `attachment_removed`).
- Tipe file dideteksi dari magic bytes (bukan `Content-Type` klien); ekstensi
  penyimpanan mengikuti hasil deteksi.

### Filter, sort, dan paginasi (`GET /tasks`)

| Param | Nilai |
| --- | --- |
| `status` | enum `TaskStatus` |
| `priority` | enum `TaskPriority` |
| `type` | enum `TaskType` |
| `project_id` | id project milik user |
| `assignee_id` | id user (anggota workspace) |
| `parent_task_id` | id task |
| `due_before` | date (`<=`) |
| `due_after` | date (`>=`) |
| `sort` | `id`, `title`, `status`, `priority`, `type`, `due_date`, `estimated_hours`, `actual_hours`, `completed_at`, `created_at`, `updated_at` |
| `direction` | `asc`, `desc` (default `desc`) |
| `page` | ≥1 |
| `per_page` | 1–100 (default 15) |

`sort` divalidasi dengan allowlist. Contoh:

```http
GET /api/backend/tasks?status=in_progress&priority=high&project_id=1&due_before=2026-10-14&sort=due_date&direction=asc&page=1&per_page=20
```

> Pencarian teks **belum** didukung server-side (`search` bukan parameter yang
> valid). Frontend melakukan pencarian judul di sisi klien pada halaman yang
> sedang tampil.

## 8. Notifications

Notifikasi **in-app (database)** + **email** dikirim ke penerima saat task
dibuat/diubah dengan `assignee_id` (self-assignment dan task tanpa assignee tidak
memicu notifikasi). Endpoint di bawah ini berada di grup `auth:api` +
`active.workspace` (header `X-Workspace-Id` tetap divalidasi bila dikirim).

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/notifications` | Daftar notifikasi user (paginated, default `per_page=15`, max 100) |
| GET | `/notifications/unread-count` | Jumlah notifikasi belum dibaca |
| PATCH | `/notifications/{id}/read` | Tandai satu notifikasi dibaca |
| POST | `/notifications/read-all` | Tandai semua dibaca (`204`) |
| DELETE | `/notifications/{id}` | Hapus notifikasi (`204`) |

Resource notifikasi:

```json
{
  "data": {
    "id": "e47f01bb-2823-4d79-b6b5-bfc376e41bc2",
    "type": "App\\Notifications\\TaskAssigned",
    "data": {
      "task_id": 4,
      "task_title": "Implementasi autentikasi JWT",
      "project_id": 1,
      "project_name": "Demo Project",
      "workspace_id": 3,
      "assigned_by": "Demo User",
      "url": "http://localhost:3000/tasks/4"
    },
    "read_at": null,
    "created_at": "2026-10-15T06:28:41+00:00"
  }
}
```

- `id` berupa UUID. `GET /notifications/unread-count` →
  `{ "data": { "unread_count": 2 } }`.
- `url` menunjuk ke halaman task di frontend (`FRONTEND_URL`), sehingga frontend
  cukup mengambil path-nya (`lib/notifications.ts` → `notificationHref`).
- `workspace_id` adalah workspace pemilik task; frontend memakainya untuk
  mengaktifkan workspace yang benar sebelum membuka `url`
  (`notificationWorkspaceId` + `setActiveWorkspace`), karena route task dibatasi
  pada workspace aktif.
- Mengakses notifikasi milik user lain → `404`.

## 9. Activity log

`GET /tasks/{id}/activities` → koleksi log (append-only, tidak bisa diedit via
CRUD task):

```json
{
  "data": [
    {
      "id": 12,
      "task_id": 4,
      "user_id": 1,
      "action": "status_changed",
      "changes": { "status": ["To Do", "In Progress"] },
      "created_at": "2026-10-14T02:10:00+00:00"
    }
  ]
}
```

## 10. Dashboard dan laporan

**`GET /dashboard/summary`** (`data`-only, bukan koleksi resource):

```json
{
  "data": {
    "projects": { "total": 2, "by_status": { "Active": 2, "On Hold": 0, "Completed": 0, "Archived": 0 } },
    "tasks": {
      "total": 10,
      "by_status": { "Backlog": 3, "To Do": 2, "In Progress": 2, "In Review": 1, "Blocked": 1, "Done": 1 },
      "by_priority": { "Low": 2, "Medium": 3, "High": 4, "Critical": 1 },
      "overdue": 2,
      "completed_this_week": 1
    }
  }
}
```

**`GET /dashboard/upcoming?limit=5`** — task belum selesai dengan `due_date >=
hari ini`, urut tenggat, `limit` 1–50 (default 10). Response: koleksi
`TaskResource`.

**`GET /reports/weekly`**:

```json
{
  "data": {
    "period": { "start": "2026-10-12", "end": "2026-10-18" },
    "created": 4,
    "completed": 1,
    "completed_by_day": { "2026-10-12": 0, "2026-10-13": 1, "...": 0 }
  }
}
```

## 11. Status HTTP

| Kode | Arti |
| --- | --- |
| `200` | Berhasil |
| `201` | Resource dibuat |
| `204` | Berhasil tanpa body (delete) |
| `401` | Belum terautentikasi / kredensial salah |
| `403` | Akses ditolak (bukan anggota workspace / bukan pemilik) |
| `404` | Resource tidak ditemukan, di luar workspace, atau bukan milik user |
| `409` | Konflik (hapus project yang masih punya task; hapus workspace yang masih punya project) |
| `410` | Undangan tidak lagi valid (sudah diterima/dicabut/kedaluwarsa) |
| `422` | Validasi gagal |
| `429` | Rate limit tercapai |

## 12. Rate limiting

- `POST /login` & `POST /auth/login` → `throttle:login` (5 percobaan/menit per IP).
- `POST /register` → `throttle:6,1` (6 percobaan/menit).

## 13. Keamanan

- Semua endpoint privat memakai guard `auth:api` (JWT).
- Otorisasi berbasis keanggotaan workspace: `ProjectPolicy` / `TaskPolicy` /
  `WorkspacePolicy` / `WorkspaceInvitationPolicy`. Route model binding
  (`{project}`, `{task}`, `{attachment}`, `{workspace}`) di-scope ke user aktif,
  sehingga resource di luar jangkauan → `404` (bukan `403`, agar tidak
  membocorkan keberadaan data).
- Peran platform `Admin` **tidak** lagi melewati isolasi workspace untuk
  endpoint koleksi; bypass dibatasi pada kemampuan baca (`Gate::before` hanya
  untuk ability berawalan `view`) dan `platform.manage`.
- Password di-hash; tidak ada password/token yang ditulis ke log.
