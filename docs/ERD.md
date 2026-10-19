# ERD — DevT

Entity Relationship Diagram untuk backend (kini Route Handlers Next.js +
Prisma; skema di `prisma/schema.prisma`, semula Laravel `backend_devt`).
Frontend tidak memiliki basis data sendiri; seluruh data diambil dari REST API
`/api/v1`.

```mermaid
erDiagram
    users ||--o{ workspace_members : "anggota"
    workspaces ||--o{ workspace_members : "punya anggota"
    workspaces ||--o{ workspace_invitations : "punya undangan"
    users ||--o{ workspace_invitations : "mengundang"
    workspaces ||--o{ projects : "berisi"
    users ||--o{ projects : "memiliki (owner)"
    users ||--o{ projects : "membuat (created_by)"
    projects ||--o{ tasks : "berisi"
    users ||--o{ tasks : "membuat / mengubah"
    users ||--o{ tasks : "ditugaskan (assignee_id)"
    tasks ||--o{ tasks : "subtask (parent_task_id)"
    tasks ||--o{ task_activity_logs : "punya riwayat"
    users ||--o{ task_activity_logs : "mencatat"
    tasks ||--o{ task_attachments : "punya lampiran"
    users ||--o{ task_attachments : "mengunggah"

    users {
        bigint id PK
        string name
        string email UK
        timestamp email_verified_at
        string password
        string role "Admin|User, default User"
        string two_factor_secret
        text two_factor_recovery_codes
        timestamp two_factor_confirmed_at
        string remember_token
        timestamp created_at
        timestamp updated_at
    }

    workspaces {
        bigint id PK
        string name "max 150"
        string slug UK "max 180"
        boolean is_personal "default false"
        timestamp created_at
        timestamp updated_at
    }

    workspace_members {
        bigint id PK
        bigint workspace_id FK
        bigint user_id FK
        string role "Owner|Admin|Member|Viewer, default Member"
        bigint invited_by FK "nullable"
        timestamp joined_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    workspace_invitations {
        bigint id PK
        bigint workspace_id FK
        string email
        string role "Owner|Admin|Member|Viewer, default Member"
        string token UK "64 karakter"
        bigint invited_by FK "nullable"
        timestamp expires_at "nullable, +7 hari"
        timestamp accepted_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    projects {
        bigint id PK
        bigint workspace_id FK
        bigint user_id FK "owner"
        bigint created_by FK
        string name "max 150"
        text description "nullable"
        string status "Active|On Hold|Completed|Archived, default Active"
        date start_date "nullable"
        date due_date "nullable"
        timestamp created_at
        timestamp updated_at
    }

    tasks {
        bigint id PK
        bigint project_id FK
        bigint created_by FK
        bigint updated_by FK "nullable"
        bigint parent_task_id FK "nullable, self-reference"
        bigint assignee_id FK "nullable"
        string title "max 200"
        text description "nullable"
        string type "Feature|Bug|Maintenance|Support|Research"
        string status "Backlog|To Do|In Progress|In Review|Blocked|Done"
        string priority "Low|Medium|High|Critical"
        date due_date "nullable"
        decimal estimated_hours "nullable (8,2)"
        decimal actual_hours "nullable (8,2)"
        timestamp completed_at "nullable"
        text blocked_reason "nullable (wajib saat status Blocked)"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "soft delete"
    }

    task_activity_logs {
        bigint id PK
        bigint task_id FK
        bigint user_id FK
        string action "created|updated|status_changed|..."
        json changes "snapshot perubahan"
        timestamp created_at
    }

    task_attachments {
        bigint id PK
        bigint task_id FK
        bigint user_id FK "pengunggah"
        string disk "default local"
        string path "path relatif pada disk"
        string original_name "nama file asli"
        string mime_type "image/jpeg|..."
        bigint size "ukuran (byte)"
        timestamp created_at
        timestamp updated_at
    }
```

## Catatan relasi & aturan

- **Kolaborasi berbasis workspace:** setiap project berada di dalam tepat satu
  workspace. Akses ditentukan keanggotaan `workspace_members` + perannya
  (`Owner`/`Admin`/`Member`/`Viewer`). Setiap user punya satu **personal
  workspace** (`is_personal=true`) yang dipakai bila header `X-Workspace-Id`
  tidak dikirim.
- **Peran platform vs peran tim:** `users.role` (`Admin`/`User`) hanya untuk
  super-admin platform (default `User`); peran kolaborasi disimpan per-workspace
  pada `workspace_members.role`. Kolaborator pertama saat membuat workspace
  otomatis menjadi `Owner`.
- **Undangan:** `workspace_invitations` menyimpan undangan via email dengan
  `token` acak 64 karakter dan masa berlaku 7 hari. `role` tidak boleh `Owner`.
  Undangan untuk email yang sudah menjadi anggota / sudah punya undangan
  pending ditolak (`422`); token yang tidak valid lagi (diterima/dicabut/
  kedaluwarsa) → `410`.
- `projects.workspace_id` dan `projects.created_by` **wajib** (diisi lewat
  backfill: project lama pindah ke personal workspace pemiliknya). `user_id`
  tetap dipertahankan sebagai pemilik historis.
- Penghapusan **workspace** diblokir (`409`) bila masih punya project; workspace
  personal tidak dapat dihapus. `workspace_members` / `workspace_invitations`
  terhapus berantai saat workspace dihapus.
- `tasks.assignee_id` (nullable, FK `users`) menunjuk penanggung jawab; harus
  merupakan anggota workspace project tersebut. `ON DELETE SET NULL`.
- `projects.user_id`, `tasks.project_id`, `tasks.created_by`, dan
  `task_activity_logs.user_id` memakai `ON DELETE RESTRICT` — penghapusan user
  yang masih memiliki data ditolak.
- `tasks.updated_by` memakai `ON DELETE SET NULL`.
- `tasks` memakai **soft delete** (`deleted_at`); subtask ikut terhapus berantai
  saat parent dihapus (`cascadeOnDelete` pada `parent_task_id`).
- `task_activity_logs` tidak punya `updated_at` (append-only) dan terhapus
  berantai saat task-nya dihapus.
- `task_attachments` terhapus berantai saat task-nya dihapus; `user_id` memakai
  `ON DELETE RESTRICT`. File fisik disimpan di disk `local`
  (`storage/app/private`) dan diakses lewat **signed URL** (`/storage/{path}`),
  bukan akses publik.
- Enum disimpan sebagai `string` + index (bukan tipe enum PostgreSQL).

## Pemetaan ke frontend

| Tabel | Tipe frontend (`lib/types.ts`) | Halaman |
| --- | --- | --- |
| `users` | `User` (+ `role`, `workspaces`) | `/profile`, topbar |
| `workspaces` | `Workspace` | pemilih workspace di topbar |
| `workspace_members` | `WorkspaceMember` | `/workspaces/[id]`, peta `membersById` |
| `workspace_invitations` | `WorkspaceInvitation` | `/workspaces/[id]`, `/invitations/[token]` |
| `projects` | `Project` | `/projects`, `/projects/[id]` |
| `tasks` | `Task` (+ `assignee_id`, `assignee`) | `/tasks`, `/tasks/[id]` |
| `task_activity_logs` | `TaskActivityLog` | tab riwayat di `/tasks/[id]` |
| `task_attachments` | `TaskAttachment` | galeri lampiran di `/tasks/[id]` |
