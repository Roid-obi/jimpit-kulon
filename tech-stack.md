# Tech Stack

## Frontend

* **Next.js** — Framework utama aplikasi web.
* **TypeScript** — Bahasa pemrograman utama dengan type safety.
* **Tailwind CSS** — Styling dan responsive UI.
* **Lucide React** — Icon.
* **React Hook Form** — Pengelolaan form.
* **Zod** — Validasi data dan form.

## Backend & Database

* **Firebase Authentication** — Registrasi, login, dan autentikasi pengguna.
* **Firebase Firestore** — Database utama dan satu-satunya database aplikasi.
* **Firestore Security Rules** — Mengatur keamanan dan hak akses data berdasarkan role.

## QR Code

* **QR Code Scanner** — Digunakan untuk memindai QR Code unik pada setiap rumah.
* QR Code hanya berfungsi sebagai **identitas rumah/shortcut menuju halaman rumah**.
* QR Code **bukan metode pembayaran**.
* Aplikasi tidak memiliki fitur QRIS, payment gateway, transfer bank, atau pembayaran online.

## Deployment

* **Vercel** — Deployment aplikasi Next.js.

## Development Tools

* **Bun** — Package manager dan runtime development.
* **Biome** — Formatting dan linting kode.
* **Git** — Version control.
* **GitHub** — Repository dan source code.

---

# Tech Stack Principles

1. Gunakan **TypeScript** secara konsisten.
2. Gunakan **Next.js** sebagai framework utama.
3. Gunakan **Tailwind CSS** untuk styling.
4. Gunakan **Firebase Authentication** untuk autentikasi.
5. Gunakan **Firebase Firestore** sebagai satu-satunya database.
6. Jangan menggunakan database SQL atau database tambahan lainnya.
7. Jangan menggunakan **Firebase Storage**.
8. Jangan menggunakan **shadcn/ui**.
9. Jangan menambahkan library/dependency baru tanpa kebutuhan yang jelas.
10. Gunakan **Biome** sebagai formatter dan linter utama.
11. Jangan menggunakan ESLint atau Prettier jika tidak ada kebutuhan khusus yang telah disepakati.
12. Gunakan **Bun** untuk instalasi package dan menjalankan script development.
13. Seluruh UI dikembangkan dengan pendekatan **mobile-first**, karena aplikasi nantinya ditargetkan untuk penggunaan pada smartphone.
14. QR Code hanya digunakan untuk identifikasi rumah dan navigasi cepat.
15. Aplikasi bukan payment gateway dan tidak menangani pembayaran digital.
16. Seluruh data aplikasi disimpan di Firestore.
17. Hak akses data harus diamankan menggunakan **Firestore Security Rules** dan validasi role pada aplikasi.
