# Deployment — DevT

Panduan men-deploy aplikasi DevT (Next.js 16 + Route Handlers API + Prisma +
PostgreSQL). UI dan API dikirim oleh proses Next.js yang sama.

## 1. Variabel lingkungan

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | ya | — | Koneksi PostgreSQL (Prisma). |
| `JWT_SECRET` | ya | — | Secret HS256 untuk access token. |
| `FRONTEND_URL` | tidak | `http://localhost:3000` | Basis URL untuk link undangan. |
| `MAIL_MAILER` | tidak | `log` | `log` (tulis ke log) atau `smtp`. |
| `MAIL_FROM_ADDRESS` | tidak | `hello@example.com` | Alamat pengirim email. |
| `MAIL_FROM_NAME` | tidak | `DevT` | Nama pengirim email. |
| `NEXT_PUBLIC_APP_NAME` | tidak | `DevT` | Nama aplikasi pada UI. |

Semua variabel bersifat **runtime** (tidak di-bake saat build), kecuali
`NEXT_PUBLIC_*` yang harus tersedia saat build.

## 2. Menjalankan lokal (Node)

```bash
npm ci
cp .env.example .env          # sesuaikan DATABASE_URL & JWT_SECRET
npx prisma migrate deploy     # terapkan migration
npm run db:seed               # data contoh (opsional)
npm run build
npm start                     # http://localhost:3000
```

Development: `npm run dev`.

## 3. Docker

`output: "standalone"` aktif, sehingga image akhir hanya memuat server minimal.
Tahap build tidak membutuhkan database.

### Build & jalankan manual

```bash
docker build -t frontend_davt .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/davt_next \
  -e JWT_SECRET=... \
  frontend_davt
```

### Docker Compose

```bash
docker compose up --build
```

- `docker-compose.yml` meneruskan variabel dari shell/host `.env`, dengan
  default yang menunjuk ke container Postgres di host
  (`host.docker.internal:5433`).
- Jalankan migration dari luar container (atau tambahkan langkah migrate di
  entrypoint): `npx prisma migrate deploy`.
- **Lampiran task** disimpan di disk `storage/app/private` di dalam container.
  Untuk produksi, pasang volume agar file tidak hilang saat container dibuat
  ulang, mis. `-v davt_storage:/app/storage/app/private`.
- Simpan `MAIL_MAILER=log` pada demo; gunakan SMTP bila email notifikasi perlu
  benar-benar terkirim (Phase 2 mengirim lewat log mailer).

### Struktur image

Dockerfile memakai tiga tahap: `deps` (`npm ci`) → `builder` (`npm run build`)
→ `runner` (menyalin `.next/standalone`, `.next/static`, dan `public`, lalu
menjalankan `node server.js` sebagai user non-root).

## 4. Deploy ke platform terkelola (mis. Vercel)

1. Sediakan `DATABASE_URL` (mis. Neon/Supabase) dan `JWT_SECRET` pada
   environment runtime.
2. Build command `npm run build`, output standar Next.js.
3. Jalankan `npx prisma migrate deploy` sekali per rilis (build step atau
   release command).

## 5. Checklist rilis

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `DATABASE_URL` & `JWT_SECRET` benar; migration terakhir sudah `deploy`
- [ ] Database sudah di-seed (user demo + project/task) agar UI tidak kosong
- [ ] Login demo berhasil dan token tersimpan di cookie `davt_token`
- [ ] Redirect rute terlindungi berjalan (belum login → `/login`)
- [ ] Unggah lampiran berhasil dan file bisa dibuka lewat signed URL `/storage/...`
- [ ] Volume `storage/app/private` terpasang (lampiran tidak publik)

## 6. Troubleshooting

- **Login gagal padahal user ada**: pastikan aplikasi memakai database yang
  sama dengan yang di-seed (`DATABASE_URL` di environment runtime vs lokal).
- **UI kosong / dashboard nol**: jalankan `npm run db:seed` (idempoten —
  melewati seed bila `demo@davt.test` sudah ada) atau `npm run db:reset`
  untuk reset penuh (menghapus data!).
- **Tabel tidak ada**: `npx prisma migrate deploy`.
- **Aset statis hilang di Docker**: pastikan `public/` dan `.next/static`
  tersalin (sudah ditangani `Dockerfile`).
