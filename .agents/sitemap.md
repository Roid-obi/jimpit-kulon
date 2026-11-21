# Sitemap

```text
Jimpit Kulon
│
├── Landing Page (/)            ← PUBLIC, tanpa login
│   ├── Saldo Dana Jimpitan
│   ├── Transaksi Terbaru
│   ├── Scan QR (/scan)         ← PUBLIC, tanpa login
│   ├── Cari Rumah (search)
│   └── Detail Rumah (/rumah/[houseId])  ← PUBLIC, tanpa login
│
├── Auth (public)
│   ├── Login
│   ├── Register
│   ├── Verifikasi Email
│   └── Lupa Password
│
└── Authenticated (petugas/admin)
    │
    ├── Dashboard
    │
    ├── Jimpitan
    │   ├── Daftar Rumah
    │   ├── Cari Rumah
    │   ├── Scan QR
    │   └── Detail Rumah
    │       ├── Informasi Rumah
    │       ├── Periode Jimpitan
    │       ├── Catat Pembayaran
    │       └── Riwayat Pembayaran
    │
    ├── Keuangan
    │   ├── Ringkasan Keuangan
    │   ├── Semua Transaksi
    │   ├── Pemasukan
    │   │   ├── Daftar Pemasukan
    │   │   └── Tambah Pemasukan
    │   │
    │   └── Pengeluaran
    │       ├── Daftar Pengeluaran
    │       └── Tambah Pengeluaran
    │
    ├── Laporan
    │   ├── Laporan Jimpitan
    │   └── Laporan Keuangan
    │
    ├── Profil
    │
    └── Admin
        ├── Manajemen Pengguna
        ├── Manajemen Rumah
        └── Pengaturan Aplikasi
```

## Role Warga

Role "warga" TIDAK ADA. Warga tidak perlu login.
Warga cukup mengakses landing page `/` → scan QR atau cari nama → lihat `/rumah/[houseId]`.

Roles yang ada:
- **admin**
- **petugas**
