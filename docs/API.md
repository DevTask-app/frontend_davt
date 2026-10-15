# API Reference — DevTask (backend_devt)

Kontrak REST API Laravel yang dikonsumsi frontend. Semua endpoint memakai prefix
`/api/v1`.

- **Base URL (lokal):** `http://localhost:8000/api/v1`
- **Autentikasi:** JWT bearer (`Authorization: Bearer <access_token>`)
- **Format:** JSON (`Content-Type: application/json`, `Accept: application/json`)

> Frontend **tidak** memanggil backend secara langsung. Browser memakai path
> same-origin `/api/backend/*` yang di-proxy oleh Next.js ke
> `${BACKEND_API_URL}/api/v1/*` (lihat `next.config.ts`).

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

**`GET /me`** → `{"data":{"id":1,"name":"Demo User","email":"demo@davt.test","email_verified_at":null,"created_at":"..."}}`.

## 4. Projects

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
  "user_id": 1,
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

> **Kebijakan hapus:** `DELETE` melakukan hard delete dan gagal (`409`) jika
> project masih memiliki task. Untuk menonaktifkan project tanpa kehilangan data,
> ubah `status` menjadi `Archived`.

## 5. Tasks

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
harus satu project), `blocked_reason` (**wajib bila `status=Blocked`**).

Body update menerima field yang sama secara parsial (`sometimes`).
`PATCH /tasks/{id}/status` → `{ "status": "...", "blocked_reason": "..." }`.
`PATCH /tasks/{id}/priority` → `{ "priority": "..." }`.

Aturan bisnis (dijaga backend, atomik):
- `status=Done` mengisi `completed_at`; keluar dari `Done` mengosongkan kembali.
- `status=Blocked` mewajibkan `blocked_reason`.
- Setiap perubahan status/perubahan penting menulis `task_activity_logs`.

Resource task (dengan `project` ter-load):

```json
{
  "id": 4,
  "project_id": 1,
  "created_by": 1,
  "updated_by": null,
  "parent_task_id": null,
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
  "project": { "id": 1, "name": "Demo Project", "status": "Active" }
}
```

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
  `url` adalah **signed URL** Laravel berumur pendek (route `storage.local`)
  yang divalidasi tanpa perlu header Authorization.
- Frontend men-*rewrite* `/storage/:path*` ke backend (`next.config.ts`),
  sehingga cukup memakai path relatif (`url` tanpa origin, lihat
  `storagePath()` di `lib/utils.ts`).
- Unggah/hapus lampiran menulis `task_activity_logs`
  (`attachment_added` / `attachment_removed`).
- Batas unggah PHP di-*raise* lewat `docker/php.ini`
  (`upload_max_filesize=8M`, `post_max_size=12M`) agar file 2 MB lolos.

### Filter, sort, dan paginasi (`GET /tasks`)

| Param | Nilai |
| --- | --- |
| `status` | enum `TaskStatus` |
| `priority` | enum `TaskPriority` |
| `type` | enum `TaskType` |
| `project_id` | id project milik user |
| `parent_task_id` | id task |
| `due_before` | date (`<=`) |
| `due_after` | date (`>=`) |
| `sort` | `id`, `title`, `status`, `priority`, `type`, `due_date`, `estimated_hours`, `actual_hours`, `completed_at`, `created_at`, `updated_at` |
| `direction` | `asc`, `desc` (default `desc`) |
| `page` | ≥1 |
| `per_page` | 1–100 (default 15) |

`sort` divalidasi dengan allowlist. Contoh:

```http
GET /api/v1/tasks?status=in_progress&priority=high&project_id=1&due_before=2026-10-14&sort=due_date&direction=asc&page=1&per_page=20
```

> Pencarian teks **belum** didukung server-side (`search` bukan parameter yang
> valid). Frontend melakukan pencarian judul di sisi klien pada halaman yang
> sedang tampil.

## 6. Activity log

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

## 7. Dashboard dan laporan

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

## 8. Status HTTP

| Kode | Arti |
| --- | --- |
| `200` | Berhasil |
| `201` | Resource dibuat |
| `204` | Berhasil tanpa body (delete) |
| `401` | Belum terautentikasi / kredensial salah |
| `403` | Akses ditolak (bukan pemilik) |
| `404` | Resource tidak ditemukan atau bukan milik user |
| `409` | Konflik (hapus project yang masih punya task) |
| `422` | Validasi gagal |
| `429` | Rate limit tercapai |

## 9. Rate limiting

- `POST /login` & `POST /auth/login` → `throttle:login` (5 percobaan/menit per IP).
- `POST /register` → `throttle:6,1` (6 percobaan/menit).

## 10. Keamanan

- Semua endpoint privat memakai guard `auth:api` (JWT).
- Otorisasi kepemilikan dilakukan lewat `ProjectPolicy` / `TaskPolicy`; user tetap
  tidak dapat mengakses data milik user lain.
- Password di-hash; tidak ada password/token yang ditulis ke log.
