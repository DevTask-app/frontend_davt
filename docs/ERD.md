# ERD — DevT

Entity Relationship Diagram untuk backend (`backend_devt`, Laravel + PostgreSQL).
Frontend tidak memiliki basis data sendiri; seluruh data diambil dari REST API
`/api/v1`.

```mermaid
erDiagram
    users ||--o{ projects : "memiliki (owner)"
    users ||--o{ tasks : "membuat / mengubah"
    users ||--o{ task_activity_logs : "mencatat"
    projects ||--o{ tasks : "berisi"
    tasks ||--o{ tasks : "subtask (parent_task_id)"
    tasks ||--o{ task_activity_logs : "punya riwayat"

    users {
        bigint id PK
        string name
        string email UK
        timestamp email_verified_at
        string password
        string two_factor_secret
        text two_factor_recovery_codes
        timestamp two_factor_confirmed_at
        string remember_token
        timestamp created_at
        timestamp updated_at
    }

    projects {
        bigint id PK
        bigint user_id FK "owner"
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
```

## Catatan relasi & aturan

- **Kepemilikan bersifat owner-only**: `projects.user_id` adalah pemilik; sebuah
  task dapat diakses bila user adalah pemilik project (`ProjectPolicy`,
  `TaskPolicy`). Belum ada konsep tim/role.
- `projects.user_id`, `tasks.project_id`, `tasks.created_by`, dan
  `task_activity_logs.user_id` memakai `ON DELETE RESTRICT` — penghapusan user
  yang masih memiliki data ditolak.
- `tasks.updated_by` memakai `ON DELETE SET NULL`.
- `tasks` memakai **soft delete** (`deleted_at`); subtask ikut terhapus berantai
  saat parent dihapus (`cascadeOnDelete` pada `parent_task_id`).
- `task_activity_logs` tidak punya `updated_at` (append-only) dan terhapus
  berantai saat task-nya dihapus.
- Enum disimpan sebagai `string` + index (bukan tipe enum PostgreSQL).

## Pemetaan ke frontend

| Tabel | Tipe frontend (`lib/types.ts`) | Halaman |
| --- | --- | --- |
| `users` | `User` | `/profile`, topbar |
| `projects` | `Project` | `/projects`, `/projects/[id]` |
| `tasks` | `Task` | `/tasks`, `/tasks/[id]` |
| `task_activity_logs` | `TaskActivityLog` | tab riwayat di `/tasks/[id]` |
