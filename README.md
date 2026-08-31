<div align="center">
  <img src="public/jimpit-kulon-logo.svg" alt="Jimpit Kulon Logo" width="150" />
  <h1>Jimpit Kulon</h1>
  <p>Aplikasi administrasi digital untuk pengelolaan jimpitan secara terstruktur dan transparan.</p>
</div>

---

## 📖 Tentang Jimpit Kulon

**Jimpit Kulon** adalah aplikasi administrasi digital untuk pengelolaan jimpitan di satu RT dengan target sekitar 45 rumah. Aplikasi ini mempermudah pencatatan pembayaran jimpitan, pemasukan, pengeluaran, serta melacak histori keuangan secara terstruktur dan transparan.

> **Penting:** Jimpit Kulon bukan *payment gateway* dan tidak melayani pembayaran *online* atau terintegrasi dengan e-wallet. Pembayaran jimpitan tetap dilakukan secara tunai kepada petugas. Aplikasi sepenuhnya digunakan untuk **mencatat transaksi yang terjadi di lapangan**.

## ✨ Fitur Utama

- **Sistem Jimpitan Terstruktur:** Mencatat pembayaran berdasarkan *Periode Jimpitan* (satu periode terdiri dari 7 hari, dengan penarikan setiap hari Sabtu).
- **Scan QR Code:** Kemudahan memindai QR Code rumah untuk langsung membuka halaman detail rumah tersebut (berfungsi sebagai identitas rumah/shortcut).
- **Dashboard Interaktif:** Ringkasan keuangan seperti saldo, pemasukan, pengeluaran, serta status penarikan periode berjalan.
- **Pencatatan Keuangan Lengkap:** Kemampuan mencatat arus dana tunai dari pembayaran jimpitan, uang donasi (kelebihan pembayaran warga), hingga pengeluaran RT.
- **Laporan Otomatis:** Fitur untuk melihat laporan pembayaran jimpitan per rumah dan laporan keuangan keseluruhan pada rentang waktu tertentu.
- **Role Pengguna (Admin & Petugas):** 
  - **Admin:** Memiliki seluruh akses termasuk manajemen pengguna, rumah, dan pengaturan aplikasi.
  - **Petugas:** Memiliki akses penuh untuk fungsi operasional dan penarikan jimpitan di lapangan tanpa akses ke manajemen data master.

## 🛠 Tech Stack

Seluruh antarmuka aplikasi dikembangkan dengan pendekatan **mobile-first** untuk memberikan pengalaman terbaik di *smartphone* petugas.

### Frontend
- **Framework Utama:** [Next.js](https://nextjs.org/)
- **Bahasa:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icon:** [Lucide React](https://lucide.dev/)
- **Form Management:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Backend & Database
- **Autentikasi:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Database Utama:** [Firebase Firestore](https://firebase.google.com/docs/firestore) (Satu-satunya database yang digunakan)
- **Keamanan:** Firestore Security Rules

### Development Tools
- **Package Manager & Runtime:** [Bun](https://bun.sh/)
- **Formatting & Linting:** [Biome](https://biomejs.dev/)
- **Deployment:** [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

Panduan untuk menjalankan project ini di komputer lokal:

### 1. Prasyarat
Pastikan Anda sudah menginstal [Bun](https://bun.sh/) di sistem Anda.

### 2. Instalasi
Clone repository dan install dependencies:

```bash
git clone <repository-url>
cd jimpit-kulon

# Instalasi menggunakan Bun
bun install
```

### 3. Konfigurasi Environment
Buat file `.env.local` berdasarkan konfigurasi Firebase Anda:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### 4. Menjalankan Server Development
```bash
bun dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda untuk melihat aplikasi berjalan.
