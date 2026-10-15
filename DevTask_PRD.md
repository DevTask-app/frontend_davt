# Product Requirements Document (PRD)

## DevTask --- Personal IT Task Management

**Versi:** 1.0\
**Tanggal:** 14 Oktober 2026\
**Status:** Draft untuk implementasi MVP\
**Tujuan produk:** Portfolio developer dan alat produktivitas personal

------------------------------------------------------------------------

## 1. Ringkasan Produk

DevTask adalah aplikasi web untuk mengelola pekerjaan IT secara
terstruktur, mulai dari task harian, pengembangan fitur, bug fixing,
maintenance, support, code review, hingga deployment.

Aplikasi dimulai untuk penggunaan personal. Arsitektur dibuat agar dapat
dikembangkan menjadi aplikasi kolaborasi tim di masa mendatang tanpa
memaksakan kompleksitas multi-user enterprise pada MVP.

### 1.1 Visi

Menyediakan satu tempat untuk merencanakan, menjalankan, dan
mengevaluasi pekerjaan IT dengan status, deadline, prioritas, serta
riwayat aktivitas yang jelas.

### 1.2 Masalah yang ingin diselesaikan

-   Task tersebar di chat, catatan pribadi, dan daftar pekerjaan.
-   Prioritas dan deadline sulit dipantau dari satu tempat.
-   Progres pekerjaan teknis sulit ditelusuri.
-   Tidak tersedia rekam jejak perubahan status yang konsisten.
-   Sulit merangkum pekerjaan selesai untuk evaluasi mingguan atau
    portfolio.

### 1.3 Solusi

DevTask menyediakan dashboard, project, task list, Kanban board, filter,
deadline tracking, dan activity history dalam satu aplikasi.

------------------------------------------------------------------------

## 2. Tujuan dan Metrik Keberhasilan

### 2.1 Tujuan MVP

1.  Pengguna dapat masuk dan mengelola data miliknya dengan aman.
2.  Pengguna dapat membuat project dan task serta memperbaruinya.
3.  Pengguna dapat melihat pekerjaan berdasarkan status, prioritas,
    project, dan deadline.
4.  Perubahan status task tercatat di activity log.
5.  Data tetap tersimpan setelah halaman di-refresh atau pengguna login
    kembali.
6.  Proyek memiliki automated tests, dokumentasi setup, dan bukti
    implementasi untuk portfolio.

### 2.2 Kriteria keberhasilan

  -----------------------------------------------------------------------
  Indikator                           Target MVP
  ----------------------------------- -----------------------------------
  Membuat task sederhana              Maksimal 30 detik pada alur normal

  Melihat pekerjaan aktif             Tersedia dari satu dashboard

  Mengubah status task                Maksimal dua interaksi dari daftar
                                      task

  Menemukan task terlambat            Bisa difilter secara langsung

  Melacak perubahan                   Perubahan status menghasilkan
                                      activity log

  Persistensi                         Data tetap tersedia setelah refresh
                                      dan login ulang

  Isolasi data                        Pengguna tidak dapat mengakses data
                                      pengguna lain

  Kualitas rilis                      Test backend lulus dan frontend
                                      production build berhasil
  -----------------------------------------------------------------------

Target tersebut adalah kriteria desain, bukan hasil pengukuran aktual.

------------------------------------------------------------------------

## 3. Target Pengguna dan Use Case

### 3.1 Target pengguna

Developer individual yang menangani beberapa project dan pekerjaan
teknis secara bersamaan.

### 3.2 Use case utama

-   Mencatat task baru dari permintaan pekerjaan.
-   Mengelompokkan task berdasarkan project.
-   Menetapkan tipe, prioritas, dan deadline.
-   Memindahkan task mengikuti progres pekerjaan.
-   Mencatat hambatan dan meninjau riwayat aktivitas.
-   Melihat task terlambat dan deadline yang akan datang.
-   Merangkum pekerjaan yang selesai dalam periode tertentu.

### 3.3 Di luar target MVP

-   Organisasi dengan banyak workspace atau perusahaan.
-   Kolaborasi realtime dan chat.
-   Sistem sprint planning kompleks.
-   Integrasi wajib dengan GitHub atau GitLab.
-   AI untuk perencanaan task.
-   Arsitektur microservices.

------------------------------------------------------------------------

## 4. Ruang Lingkup Fitur

### 4.1 P0 --- Wajib untuk MVP

#### Authentication

-   Register, login, logout, dan melihat profil pengguna.
-   Endpoint privat membutuhkan autentikasi.
-   Kredensial disimpan dengan mekanisme hashing yang aman.

#### Dashboard

-   Menampilkan jumlah task aktif.
-   Menampilkan task overdue.
-   Menampilkan deadline mendatang.
-   Menampilkan task yang selesai dalam periode mingguan.
-   Menampilkan daftar prioritas hari ini.

Semua angka dashboard harus berasal dari API dan database, bukan angka
statis di frontend.

#### Projects

-   Membuat, melihat, mengubah, dan mengarsipkan project.
-   Menyimpan nama, deskripsi, status, tanggal mulai, dan deadline.
-   Menampilkan daftar task per project.

#### Tasks

-   Membuat, melihat, mengubah, dan menghapus secara soft delete.
-   Menyimpan judul, deskripsi, tipe, status, prioritas, project,
    deadline, dan estimasi jam.
-   Menyediakan filter status, prioritas, project, serta pencarian.
-   Mendukung pagination dan pengurutan yang tervalidasi.
-   Menyediakan detail task.

#### Kanban dan List View

-   Menampilkan task dalam kolom status.
-   Menampilkan task dalam bentuk daftar.
-   Mengubah status melalui kontrol yang jelas.
-   Menampilkan indikator prioritas dan deadline.

#### Activity History

-   Mencatat perubahan status dan perubahan penting pada task.
-   Menyimpan pelaku, waktu, jenis aksi, dan perubahan sebelum/sesudah.
-   Riwayat tidak dapat dimodifikasi melalui endpoint task biasa.

#### Kualitas dasar

-   Responsive layout.
-   Loading, empty, dan error states.
-   Validasi frontend dan backend.
-   Backend feature tests untuk aturan bisnis dan keamanan.
-   README, ERD, dokumentasi API, dan `.env.example`.

### 4.2 P1 --- Setelah MVP stabil

-   Subtask dan checklist.
-   Work log dan pencatatan durasi aktual.
-   Kalender deadline.
-   Laporan mingguan yang lebih lengkap.
-   Label, komentar, dan lampiran.
-   Integrasi GitHub atau GitLab.
-   Notifikasi deadline.

### 4.3 P2 --- Tidak dikerjakan pada MVP

-   Realtime collaboration.
-   Multi-company tenancy.
-   Microservices dan message broker.
-   AI task planning.
-   Workflow builder yang dapat dikonfigurasi bebas.

------------------------------------------------------------------------

## 5. Status, Prioritas, dan Tipe Task

### 5.1 Status task

  Status          Arti
  --------------- ----------------------------------------
  `backlog`       Dicatat untuk dikerjakan nanti
  `todo`          Sudah direncanakan
  `in_progress`   Sedang dikerjakan
  `in_review`     Menunggu pemeriksaan
  `blocked`       Tidak dapat dilanjutkan karena kendala
  `done`          Pekerjaan selesai

Status dan prioritas adalah dua atribut berbeda. `in_progress` adalah
status, sedangkan `critical` adalah prioritas.

### 5.2 Prioritas

-   `low`
-   `medium`
-   `high`
-   `critical`

### 5.3 Tipe task

-   `feature`
-   `bug`
-   `maintenance`
-   `support`
-   `research`

### 5.4 Aturan status

-   Hanya nilai status yang terdaftar yang diterima API.
-   Saat status berubah menjadi `done`, sistem mengisi `completed_at`.
-   Saat task keluar dari `done`, sistem mengosongkan `completed_at`.
-   Saat status menjadi `blocked`, `blocked_reason` sebaiknya
    diwajibkan.
-   Setiap perubahan status harus menghasilkan activity log.
-   Perubahan data task dan pembuatan activity log dilakukan dalam satu
    transaksi database.

------------------------------------------------------------------------

## 6. User Flow

### 6.1 Alur utama

1.  Pengguna login.
2.  Pengguna masuk ke Dashboard.
3.  Pengguna memilih project atau membuat project baru.
4.  Pengguna membuat task dan mengisi detailnya.
5.  Task tersimpan melalui Laravel API ke PostgreSQL.
6.  Task tampil di Kanban dan List View.
7.  Pengguna mengubah status sesuai progres.
8.  Laravel memvalidasi perubahan dan mencatat activity log.
9.  Pengguna memantau overdue, deadline mendatang, dan task yang
    selesai.

### 6.2 Alur task

`Backlog → To Do → In Progress → In Review → Done`

Task dapat kembali dari `In Review` ke `In Progress`. Task juga dapat
berpindah ke `Blocked` jika terdapat kendala. Transisi status harus
diimplementasikan dan diuji secara konsisten.

### 6.3 Alur project

1.  Pengguna membuka halaman Projects.
2.  Pengguna membuat project dengan nama dan deskripsi.
3.  Pengguna menambahkan task ke project tersebut.
4.  Pengguna memantau daftar task dan progres project.
5.  Pengguna mengarsipkan project yang sudah tidak aktif.

------------------------------------------------------------------------

## 7. Sitemap dan Persyaratan Halaman

  Halaman          Route             Persyaratan utama
  ---------------- ----------------- ----------------------------------------
  Login            `/login`          Validasi kredensial, error state
  Register         `/register`       Validasi input dan pembuatan akun
  Dashboard        `/dashboard`      Statistik dan prioritas
  My Tasks         `/tasks`          Kanban/List, filter, pencarian
  Task Detail      `/tasks/:id`      Detail, edit, status, activity history
  Projects         `/projects`       Daftar dan pengelolaan project
  Project Detail   `/projects/:id`   Detail project dan daftar task
  Calendar         `/calendar`       Opsional, P1
  Reports          `/reports`        Ringkasan penyelesaian
  Settings         `/settings`       Profil dan pengaturan akun

### 7.1 Dashboard

Menampilkan: - Active tasks. - Overdue tasks. - Due this week. -
Completed this week. - Daftar prioritas hari ini. - Deadline mendatang.

### 7.2 My Tasks

Menampilkan: - Kanban dan List View. - Filter status, prioritas,
project, dan deadline. - Pencarian berdasarkan judul. - Indikator
overdue. - Form untuk membuat dan mengedit task.

### 7.3 Task Detail

Menampilkan: - Judul dan deskripsi. - Project, tipe, status, dan
prioritas. - Deadline dan estimasi jam. - Alasan blocked jika relevan. -
Activity timeline. - Aksi edit, ubah status, dan soft delete.

### 7.4 UX states

Semua halaman yang mengambil data API harus menangani: - Loading. -
Empty state. - Error dan retry. - Validation error. - Success
feedback. - Unauthorized atau session expired.

------------------------------------------------------------------------

## 8. Arsitektur Teknis

### 8.1 Stack

  Bagian             Teknologi
  ------------------ -----------------------------------------------------------
  Frontend           React + TypeScript + Vite
  Routing            React Router
  API state          TanStack Query
  Form               React Hook Form + Zod
  UI                 Ant Design atau Tailwind CSS; pilih satu pendekatan utama
  Backend            Laravel REST API
  Authentication     Laravel Sanctum sesuai pola deployment
  Database           PostgreSQL
  Backend testing    PHPUnit atau Pest
  Frontend testing   Vitest dan React Testing Library
  Deployment         Docker dan CI/CD

### 8.2 Gaya arsitektur

Gunakan **modular monolith**. Frontend dan backend dipisahkan sebagai
aplikasi, tetapi backend Laravel tetap satu aplikasi modular.

Microservices tidak diperlukan pada MVP karena menambah biaya
deployment, observability, dan komunikasi antarlayanan tanpa kebutuhan
yang sebanding.

### 8.3 Prinsip implementasi

1.  Backend adalah sumber kebenaran untuk validasi dan aturan bisnis.
2.  Frontend tidak boleh menjadi satu-satunya lapisan otorisasi.
3.  Query data selalu dibatasi sesuai pengguna aktif.
4.  Perubahan status dan activity log harus atomik.
5.  Response API konsisten dan terdokumentasi.
6.  Simpan timestamp secara konsisten dalam UTC dan tampilkan sesuai
    zona waktu pengguna.
7.  Jangan menyimpan secret dalam repository.

------------------------------------------------------------------------

## 9. Rancangan Database dan ERD

### 9.1 Tabel inti

#### `users`

Menggunakan tabel users standar Laravel.

-   `id`
-   `name`
-   `email` --- unique
-   `password` --- hash
-   `created_at`
-   `updated_at`

#### `projects`

-   `id`
-   `user_id` --- FK ke users
-   `name` --- wajib
-   `description` --- nullable
-   `status` --- active, on_hold, completed, archived
-   `start_date` --- nullable
-   `due_date` --- nullable
-   `created_at`
-   `updated_at`
-   `deleted_at` --- jika memakai soft delete

#### `tasks`

-   `id`
-   `project_id` --- FK ke projects
-   `created_by` --- FK ke users
-   `updated_by` --- FK ke users, nullable
-   `parent_task_id` --- nullable FK ke tasks
-   `title` --- wajib
-   `description` --- nullable
-   `type`
-   `status`
-   `priority`
-   `blocked_reason` --- nullable
-   `due_date` --- nullable
-   `estimated_hours` --- nullable, tidak negatif
-   `actual_hours` --- nullable, tidak negatif
-   `completed_at` --- nullable
-   `created_at`
-   `updated_at`
-   `deleted_at` --- jika memakai soft delete

#### `task_activity_logs`

-   `id`
-   `task_id` --- FK ke tasks
-   `user_id` --- FK ke users
-   `action`
-   `changes` --- JSONB
-   `created_at`

### 9.2 Relasi

-   Satu user memiliki banyak project.
-   Satu user membuat banyak task.
-   Satu project memiliki banyak task.
-   Task dapat memiliki subtask melalui `parent_task_id`.
-   Satu task memiliki banyak activity log.
-   Satu user dapat menghasilkan banyak activity log.

### 9.3 Constraint dan integritas

-   Project harus dimiliki user yang sedang login.
-   Task tidak boleh merujuk ke project milik user lain.
-   Subtask harus berada pada project yang sama dengan parent task.
-   Nilai status, prioritas, dan tipe harus divalidasi.
-   Estimasi jam dan jam aktual tidak boleh negatif.
-   Gunakan index pada kolom yang sering dipakai untuk filter.
-   Tentukan kebijakan penghapusan project secara eksplisit; pengarsipan
    lebih aman daripada hard delete.
-   Activity log tidak dapat diedit melalui API CRUD task.

### 9.4 Contoh ERD

``` mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ TASKS : creates
    USERS ||--o{ TASKS : updates
    PROJECTS ||--o{ TASKS : contains
    TASKS ||--o{ TASKS : parent_of
    TASKS ||--o{ TASK_ACTIVITY_LOGS : records
    USERS ||--o{ TASK_ACTIVITY_LOGS : performs

    USERS {
        bigint id PK
        string name
        string email UK
        string password
    }

    PROJECTS {
        bigint id PK
        bigint user_id FK
        string name
        text description
        string status
        date start_date
        date due_date
    }

    TASKS {
        bigint id PK
        bigint project_id FK
        bigint created_by FK
        bigint updated_by FK
        bigint parent_task_id FK
        string title
        text description
        string type
        string status
        string priority
        date due_date
        decimal estimated_hours
        decimal actual_hours
        timestamp completed_at
    }

    TASK_ACTIVITY_LOGS {
        bigint id PK
        bigint task_id FK
        bigint user_id FK
        string action
        jsonb changes
        timestamp created_at
    }
```

------------------------------------------------------------------------

## 10. API Specification

Semua endpoint menggunakan prefix `/api/v1`. Endpoint berikut merupakan
rancangan kontrak API.

### 10.1 Authentication

  Method   Endpoint             Fungsi
  -------- -------------------- -----------------------
  POST     `/api/v1/register`   Membuat akun
  POST     `/api/v1/login`      Login
  POST     `/api/v1/logout`     Logout
  GET      `/api/v1/me`         Profil pengguna aktif

Untuk web React dan Laravel pada domain yang terkontrol, evaluasi
Laravel Sanctum dengan session cookie dan perlindungan CSRF. Konfigurasi
CORS, cookie, dan domain harus sesuai deployment.

### 10.2 Projects

  -------------------------------------------------------------------------------
  Method                  Endpoint                        Fungsi
  ----------------------- ------------------------------- -----------------------
  GET                     `/api/v1/projects`              Daftar project

  POST                    `/api/v1/projects`              Membuat project

  GET                     `/api/v1/projects/{id}`         Detail project

  PUT                     `/api/v1/projects/{id}`         Memperbarui project

  DELETE                  `/api/v1/projects/{id}`         Mengarsipkan atau
                                                          menghapus sesuai aturan

  GET                     `/api/v1/projects/{id}/tasks`   Daftar task dalam
                                                          project
  -------------------------------------------------------------------------------

### 10.3 Tasks

  Method   Endpoint                          Fungsi
  -------- --------------------------------- ------------------------
  GET      `/api/v1/tasks`                   Daftar task dan filter
  POST     `/api/v1/tasks`                   Membuat task
  GET      `/api/v1/tasks/{id}`              Detail task
  PUT      `/api/v1/tasks/{id}`              Memperbarui task
  PATCH    `/api/v1/tasks/{id}/status`       Mengubah status
  PATCH    `/api/v1/tasks/{id}/priority`     Mengubah prioritas
  DELETE   `/api/v1/tasks/{id}`              Soft delete task
  GET      `/api/v1/tasks/{id}/activities`   Riwayat aktivitas

### 10.4 Dashboard dan laporan

  Method   Endpoint                       Fungsi
  -------- ------------------------------ ---------------------
  GET      `/api/v1/dashboard/summary`    Statistik dashboard
  GET      `/api/v1/dashboard/upcoming`   Deadline mendatang
  GET      `/api/v1/reports/weekly`       Ringkasan mingguan

### 10.5 Contoh filter

``` http
GET /api/v1/tasks?status=in_progress&priority=high&project_id=2&sort=due_date&direction=asc&page=1&per_page=20
```

Sorting harus menggunakan allowlist. Pagination dan seluruh parameter
filter harus divalidasi.

### 10.6 Contoh response

``` json
{
  "data": [
    {
      "id": 12,
      "title": "Implement RBAC middleware",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2026-10-16"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1
  }
}
```

### 10.7 HTTP status

-   `200` --- request berhasil.
-   `201` --- resource berhasil dibuat.
-   `204` --- operasi berhasil tanpa response body.
-   `401` --- belum terautentikasi.
-   `403` --- akses ditolak.
-   `404` --- resource tidak ditemukan atau tidak boleh diakses.
-   `422` --- validasi gagal.
-   `429` --- rate limit tercapai.

------------------------------------------------------------------------

## 11. RBAC dan Keamanan

RBAC formal tidak wajib untuk MVP personal. Namun, autentikasi dan
authorization berdasarkan kepemilikan resource tetap wajib.

### Keamanan MVP

-   Endpoint privat mewajibkan autentikasi.
-   Laravel Policy memeriksa kepemilikan project dan task.
-   Gunakan Form Request untuk validasi.
-   Terapkan rate limiting untuk login dan endpoint sensitif.
-   Jangan pernah menyimpan password plaintext.
-   Jangan mencatat password, token, atau secret ke log.
-   Uji akses silang dengan dua akun berbeda.
-   Gunakan HTTPS pada deployment.
-   Simpan secret di environment atau secret manager.

### RBAC tahap lanjutan

  Role     Hak akses awal
  -------- --------------------------------------------------
  Owner    Semua resource miliknya dan pengaturan workspace
  Admin    Anggota dan pengaturan workspace
  Member   Membuat dan memperbarui task sesuai izin
  Viewer   Membaca data yang diizinkan

Role tersebut baru diperlukan jika aplikasi berkembang menjadi produk
kolaborasi tim. Untuk MVP, jangan menambah tabel roles dan permissions
tanpa kebutuhan nyata.

------------------------------------------------------------------------

## 12. Struktur Folder

``` text
devtask/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── router.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── common/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   └── reports/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   └── main.tsx
│   ├── public/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Services/
│   │   └── Enums/
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/api.php
│   └── tests/Feature/
├── docs/
│   ├── PRD.md
│   ├── ERD.md
│   └── API.md
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

### Tanggung jawab direktori

-   `Controllers`: menerima request dan mengembalikan response.
-   `Requests`: validasi input.
-   `Resources`: format JSON response.
-   `Policies`: authorization.
-   `Services`: business logic yang layak dipisahkan.
-   `Enums`: status, prioritas, dan tipe task.
-   `features/`: komponen, hooks, API functions, dan types per fitur.

Hindari abstraksi repository untuk setiap model sebelum kebutuhan nyata
muncul. Gunakan Eloquent untuk CRUD sederhana dan pisahkan service saat
business logic mulai kompleks.

------------------------------------------------------------------------

## 13. Rencana Implementasi

Estimasi: sekitar 10--14 hari kerja untuk satu developer, bergantung
pada pengalaman, waktu yang tersedia, dan kebutuhan deployment.

### Tahap 1 --- Fondasi (Hari 1--2)

-   [ ] Buat repository `devtask`.
-   [ ] Setup React, TypeScript, Vite, dan Laravel.
-   [ ] Konfigurasi PostgreSQL dan environment.
-   [ ] Buat layout utama dan routing.
-   [ ] Siapkan `.env.example` dan Git ignore.

**Deliverable:** frontend dan backend berjalan lokal.

### Tahap 2 --- Database dan Auth (Hari 3--4)

-   [ ] Buat migration dan relasi.
-   [ ] Implementasi register, login, logout, dan profil.
-   [ ] Konfigurasi Sanctum sesuai deployment.
-   [ ] Buat policy dan feature tests untuk isolasi data.

**Deliverable:** pengguna dapat login dan data terisolasi.

### Tahap 3 --- Project dan Task CRUD (Hari 5--7)

-   [ ] Implementasi project CRUD.
-   [ ] Implementasi task CRUD.
-   [ ] Tambahkan validasi, filter, pencarian, dan pagination.
-   [ ] Buat Task List, Task Form, dan Task Detail.
-   [ ] Integrasikan frontend dengan API.

**Deliverable:** data tersimpan dan dapat dimuat ulang.

### Tahap 4 --- Kanban dan Activity Log (Hari 8--10)

-   [ ] Buat Kanban dan List View.
-   [ ] Implementasi perubahan status.
-   [ ] Implementasi aturan `completed_at` dan `blocked_reason`.
-   [ ] Catat activity log secara atomik.
-   [ ] Tangani loading, error, dan empty state.

**Deliverable:** alur task end-to-end berjalan.

### Tahap 5 --- Dashboard dan Rilis (Hari 11--14)

-   [ ] Buat statistik dashboard melalui API.
-   [ ] Tambahkan filter overdue dan upcoming deadline.
-   [ ] Jalankan automated tests.
-   [ ] Siapkan Docker dan CI.
-   [ ] Tulis README, ERD, API documentation, dan screenshot.
-   [ ] Deploy dan verifikasi konfigurasi production.

**Deliverable:** MVP yang layak didemonstrasikan.

------------------------------------------------------------------------

## 14. Testing dan Definition of Done

MVP dianggap selesai jika semua kondisi berikut terpenuhi:

-   [ ] Register, login, logout, dan proteksi route berfungsi.
-   [ ] Project dan task CRUD berjalan melalui API.
-   [ ] Data tetap tersedia setelah refresh dan login ulang.
-   [ ] Filter, pencarian, dan pagination berfungsi.
-   [ ] Perubahan status mengikuti aturan bisnis.
-   [ ] `completed_at` dikelola dengan benar.
-   [ ] Activity log tercatat dan tidak dapat diedit melalui CRUD task
    biasa.
-   [ ] Pengguna tidak dapat mengakses data pengguna lain.
-   [ ] Semua halaman menangani loading, error, dan empty state.
-   [ ] Backend tests lulus.
-   [ ] Frontend production build berhasil.
-   [ ] README memuat langkah setup yang dapat diikuti developer lain.
-   [ ] Deployment tidak mengekspos secret atau konfigurasi sensitif.

Checklist ini adalah kriteria penerimaan, bukan klaim bahwa seluruh tes
sudah dijalankan.

------------------------------------------------------------------------

## 15. Risiko dan Mitigasi

  -----------------------------------------------------------------------
  Risiko                  Dampak                  Mitigasi
  ----------------------- ----------------------- -----------------------
  Scope melebar           MVP tidak selesai       Batasi implementasi
                                                  pada fitur P0

  UI dibuat sebelum API   Banyak perubahan ulang  Tetapkan kontrak API
  stabil                                          dan schema lebih awal

  Otorisasi hanya di      Data dapat diakses      Gunakan Policy dan test
  frontend                lintas akun             isolasi

  Dashboard memakai angka Informasi tidak akurat  Hitung agregasi dari
  statis                                          database

  Activity log tidak      Riwayat tidak konsisten Gunakan transaksi
  atomik                                          database

  Terlalu banyak          Kode sulit diubah       Mulai sederhana,
  abstraksi                                       abstraksikan saat
                                                  dibutuhkan

  Tidak ada dokumentasi   Portfolio sulit         Sediakan README, ERD,
                          dievaluasi              API docs, dan
                                                  screenshot
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 16. Strategi Portfolio Developer

Agar proyek menunjukkan kemampuan engineering, bukan hanya kemampuan
membuat UI:

1.  Dokumentasikan alasan memilih modular monolith.
2.  Tunjukkan ERD dan API contract.
3.  Sertakan automated tests untuk business rules dan data isolation.
4.  Gunakan migration dan seeder yang reproducible.
5.  Tambahkan Docker dan CI untuk test serta build.
6.  Sediakan screenshot, demo, dan instruksi setup.
7.  Dokumentasikan trade-off teknis dan keterbatasan MVP.

Jangan mengklaim siap production hanya karena aplikasi berjalan di
komputer lokal. Deployment, backup database, pengelolaan secret, dan
pengujian keamanan juga perlu diverifikasi.

------------------------------------------------------------------------

## 17. Prioritas Eksekusi

Urutan prioritas yang disarankan:

1.  Repository dan environment.
2.  Database migration dan relasi.
3.  Authentication dan data isolation.
4.  Project CRUD.
5.  Task CRUD.
6.  Perubahan status dan activity log.
7.  Kanban dan List View.
8.  Dashboard berbasis API.
9.  Automated tests dan perbaikan UX.
10. Docker, CI/CD, dokumentasi, dan deployment.

**Prinsip utama:** selesaikan satu alur end-to-end --- login → buat
project → buat task → ubah status → lihat activity log --- sebelum
menambah fitur sekunder.

Dengan pendekatan ini, DevTask menjadi aplikasi yang dapat digunakan,
diuji, dipresentasikan, dan dikembangkan lebih lanjut tanpa membangun
kompleksitas yang belum dibutuhkan.
