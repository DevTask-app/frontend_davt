# Screenshots Checklist — DevT

Daftar tangkapan layar untuk dokumentasi/portfolio. Simpan hasilnya di
`docs/screenshots/` dengan nama file seperti pada kolom **File**.

**Persiapan:** login memakai akun demo (`demo@davt.test` / `Password123!`),
jalankan backend yang sudah di-seed, gunakan viewport desktop (1440×900) untuk
tangkapan utama dan satu tangkapan mobile (390×844). Gunakan data yang realistis
(beberapa project, task pada beragam status/prioritas, minimal satu terlambat).

| # | Halaman | Route | File | Fokus yang ditampilkan |
| --- | --- | --- | --- | --- |
| 1 | Login | `/login` | `01-login.png` | Form login + validasi |
| 2 | Register | `/register` | `02-register.png` | Form registrasi |
| 3 | Dashboard | `/dashboard` | `03-dashboard.png` | Kartu statistik, deadline terdekat, laporan mingguan |
| 4 | Projects (list) | `/projects` | `04-projects.png` | Grid kartu project + pagination + pencarian |
| 5 | Form project | `/projects` | `05-project-form.png` | Modal create/edit project |
| 6 | Detail project | `/projects/[id]` | `06-project-detail.png` | Info project + daftar task |
| 7 | Tasks — List | `/tasks` | `07-tasks-list.png` | Filter lengkap + pagination |
| 8 | Tasks — Board | `/tasks` (Board) | `08-tasks-board.png` | Kanban drag & drop antar kolom |
| 9 | Tasks — Terlambat | `/tasks` | `09-tasks-overdue.png` | Filter "Terlambat" aktif |
| 10 | Tasks — 7 hari | `/tasks` | `10-tasks-upcoming.png` | Filter "7 hari ke depan" aktif |
| 11 | Form task | `/tasks` | `11-task-form.png` | Modal create/edit (termasuk `Blocked` + alasan) |
| 12 | Detail task | `/tasks/[id]` | `12-task-detail.png` | Ubah status/prioritas + riwayat aktivitas |
| 13 | Profil | `/profile` | `13-profile.png` | Info akun + statistik |
| 14 | Mobile (drawer) | `/dashboard` | `14-mobile-drawer.png` | Sidebar mobile terbuka |
| 15 | Tema gelap | `/tasks` | `15-dark-mode.png` | Mode gelap |

## Tips

- Gunakan mode gelap **dan** terang bila memungkinkan; tema otomatis mengikuti
  sistem.
- Tampilkan state penting: loading spinner, empty state, dan error banner
  (mis. backend mati) sebagai bukti penanganan UI.
- Untuk tangkapan Kanban, pastikan ada task di beberapa kolom dan sorot satu
  kartu yang sedang di-drag bila memungkinkan.
- Kompres PNG (mis. `pngquant`/TinyPNG) sebelum dimasukkan ke repositori.

## Menyisipkan ke README

Setelah screenshot tersedia, tambahkan bagian galeri pada `README.md`:

```md
## Galeri

![Dashboard](docs/screenshots/03-dashboard.png)
![Tasks Board](docs/screenshots/08-tasks-board.png)
```
