# Deployment — DevT Frontend

Panduan men-deploy frontend Next.js 16. Aplikasi membutuhkan backend Laravel
(`backend_devt`) yang sudah berjalan dan dapat dijangkau.

## 1. Variabel lingkungan

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `BACKEND_API_URL` | ya | `http://localhost:8000` | Base URL backend (tanpa `/api/v1`). Dipakai oleh rewrite proxy. |
| `NEXT_PUBLIC_APP_NAME` | tidak | `DevT` | Nama aplikasi pada UI. |

> **Penting:** `next.config.ts` membaca `BACKEND_API_URL` **saat build** untuk
> menyusun aturan `rewrites`. Pada `output: "standalone"` dan image Docker, nilai
> ini ter-bake ke hasil build. Jika backend berpindah URL, lakukan build ulang
> (atau sediakan sebagai build arg, lihat bagian Docker).

Semua request browser memakai path same-origin `/api/backend/*` yang di-proxy ke
`${BACKEND_API_URL}/api/v1/*`, sehingga tidak ada masalah CORS dan URL backend
tidak terekspos ke klien.

## 2. Menjalankan lokal (Node)

```bash
npm ci
cp .env.example .env.local   # sesuaikan BACKEND_API_URL
npm run dev                  # http://localhost:3000
```

Produksi lokal:

```bash
npm run build
npm start                    # menyajikan hasil build di :3000
```

## 3. Docker

`output: "standalone"` aktif, sehingga image akhir hanya memuat server minimal.

### Build & jalankan manual

```bash
docker build --build-arg BACKEND_API_URL=http://host.docker.internal:8000 -t frontend_davt .
docker run --rm -p 3000:3000 frontend_davt
```

### Docker Compose

```bash
docker compose up --build
```

- `docker-compose.yml` menetapkan default `BACKEND_API_URL=http://host.docker.internal:8000`
  dan menambahkan `extra_hosts` agar nama host tersebut juga bekerja di Linux.
- Jika backend dijalankan lewat `backend_devt/docker-compose.yml` pada network
  Docker yang sama, arahkan ke nama service-nya:

  ```bash
  BACKEND_API_URL=http://app:8000 docker compose up --build
  ```

  lalu hubungkan kedua compose ke network bersama (buat network eksternal dan
  deklarasikan di kedua file), atau jalankan backend dengan `ports: 8000:8000`
  dan pakai `host.docker.internal`.

### Struktur image

Dockerfile memakai tiga tahap: `deps` (`npm ci`) → `builder` (`npm run build`)
→ `runner` (menyalin `.next/standalone`, `.next/static`, dan `public`, lalu
menjalankan `node server.js` sebagai user non-root).

## 4. Deploy ke platform terkelola (mis. Vercel)

1. Set environment variable `BACKEND_API_URL` pada environment build.
2. Build command `npm run build`, output standar Next.js.
3. Pastikan backend dapat diakses publik dari server platform (rewrite dilakukan
   di sisi server Next.js, bukan browser).

> Catatan: `output: "standalone"` tetap kompatibel dengan Vercel namun tidak
> diperlukan di sana. Untuk platform serverless, boleh dihapus.

## 5. Checklist rilis

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `BACKEND_API_URL` benar & backend sehat (`GET /api/v1/...` merespons)
- [ ] Backend sudah di-seed (user demo + project/task) agar UI tidak kosong
- [ ] Login demo berhasil dan token tersimpan di cookie `davt_token`
- [ ] Redirect rute terlindungi berjalan (belum login → `/login`)
