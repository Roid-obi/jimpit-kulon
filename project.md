# Jimpit Kulon

Jimpit Kulon adalah aplikasi administrasi digital untuk pengelolaan jimpitan di satu RT dengan sekitar 45 rumah.

Aplikasi digunakan untuk mencatat pembayaran jimpitan, pemasukan, pengeluaran, dan histori keuangan secara terstruktur dan transparan.

> **Penting:** Jimpit Kulon bukan payment gateway dan tidak melakukan pembayaran online. Pembayaran jimpitan tetap dilakukan secara tunai kepada petugas. Aplikasi hanya digunakan untuk **mencatat transaksi yang terjadi di lapangan**.

---

# 1. Konsep Dasar

## Sistem Jimpitan

* Penarikan dilakukan setiap hari Sabtu.
* Setiap rumah membayar Rp3.500 untuk satu periode.
* Rp3.500 merupakan akumulasi Rp500 × 7 hari.
* Satu periode selalu terdiri dari 7 hari.
* Periode tidak mengikuti pergantian bulan.
* Satu periode dapat melewati dua bulan.

Contoh:

```text
Periode 1
29 Juni – 5 Juli

Periode 2
6 Juli – 12 Juli

Periode 3
13 Juli – 19 Juli

Periode 4
20 Juli – 26 Juli

Periode 5
27 Juli – 2 Agustus
```

Karena itu aplikasi menggunakan istilah **Periode Jimpitan**, bukan "Minggu 1", "Minggu 2", dan sebagainya.

---

# 2. Target Platform

Aplikasi saat ini dikembangkan sebagai **website**, tetapi desain UI harus menggunakan pendekatan **mobile-first**.

Target penggunaan utama adalah smartphone milik petugas ketika melakukan penarikan jimpitan.

Prioritas:

```text
Mobile
  ↓
Tablet
  ↓
Desktop
```

Website harus tetap responsif pada layar yang lebih besar, tetapi pengalaman pada smartphone menjadi prioritas utama.

---

# 3. Role Pengguna

Aplikasi memiliki dua role:

```text
Admin
Petugas
```

## Admin

Admin memiliki seluruh akses aplikasi, termasuk fitur administrasi.

## Petugas

Petugas dapat mengakses seluruh fitur operasional aplikasi, termasuk:

* Dashboard
* Jimpitan
* Scan QR
* Pembayaran
* Keuangan
* Membuat pemasukan
* Membuat pengeluaran
* Laporan
* Profil

Petugas tidak memiliki akses ke fitur administrasi:

* Manajemen pengguna
* Manajemen rumah
* Pengaturan aplikasi

---

# 4. Struktur Navigasi

## Admin

```text
Dashboard

Jimpitan
├── Daftar Rumah
├── Scan QR
└── Detail Rumah

Keuangan
├── Ringkasan
├── Semua Transaksi
├── Pemasukan
│   └── Tambah Pemasukan
└── Pengeluaran
    └── Tambah Pengeluaran

Laporan
├── Laporan Jimpitan
└── Laporan Keuangan

Admin
├── Pengguna
├── Rumah
└── Pengaturan

Profil
```

## Petugas

```text
Dashboard

Jimpitan
├── Daftar Rumah
├── Scan QR
└── Detail Rumah

Keuangan
├── Ringkasan
├── Semua Transaksi
├── Pemasukan
│   └── Tambah Pemasukan
└── Pengeluaran
    └── Tambah Pengeluaran

Laporan
├── Laporan Jimpitan
└── Laporan Keuangan

Profil
```

---

# 5. Halaman Authentication

## 5.1 Login

Halaman untuk masuk ke aplikasi.

Komponen:

* Logo Jimpit Kulon
* Email
* Password
* Tombol Login
* Lupa Password
* Link Register

Validasi:

* Email wajib valid.
* Password wajib diisi.
* Akun harus sudah terverifikasi email.
* Akun yang tidak aktif tidak dapat masuk.

---

# 5.2 Register

Digunakan untuk membuat akun baru.

Field:

* Nama
* Email
* Password
* Konfirmasi Password

Setelah registrasi berhasil:

```text
Register
↓
Akun dibuat di Firebase Authentication
↓
Email verifikasi dikirim
↓
User membuka email
↓
Email terverifikasi
↓
User dapat login
```

Aplikasi tidak boleh menganggap akun sudah aktif sebelum email terverifikasi.

---

# 5.3 Verifikasi Email

Menampilkan informasi bahwa email belum diverifikasi.

Komponen:

* Email pengguna
* Informasi verifikasi
* Tombol Kirim Ulang Email
* Tombol Cek Status Verifikasi
* Tombol Kembali ke Login

---

# 5.4 Lupa Password

Field:

* Email

Setelah dikirim, Firebase mengirimkan email reset password.

---

# 6. Dashboard

Dashboard adalah halaman utama setelah login.

Dashboard harus dapat dipahami dengan cepat tanpa perlu melakukan banyak interaksi.

## Informasi utama

### Saldo Jimpitan

Menampilkan total dana jimpitan saat ini.

```text
Saldo Jimpitan

Rp7.500.000
```

### Total Pemasukan

```text
Rp8.750.000
```

### Total Pengeluaran

```text
Rp1.250.000
```

### Status Periode

```text
Periode Berjalan

38 / 45 Rumah Lunas
```

### Tunggakan

```text
7 Rumah
```

---

## Transaksi Terbaru

Menampilkan beberapa transaksi terbaru.

Contoh:

```text
+ Rp3.500
Pembayaran Jimpitan
Budi Santoso
Hari ini

- Rp100.000
Konsumsi kerja bakti
Rudi
Kemarin
```

Tersedia tombol:

```text
Lihat Semua
```

yang menuju halaman Semua Transaksi.

---

# 7. Halaman Jimpitan

Jimpitan merupakan fitur utama aplikasi.

Halaman ini digunakan petugas ketika berkeliling mengambil jimpitan.

---

# 7.1 Daftar Rumah

Menampilkan seluruh rumah yang terdaftar.

Karena hanya sekitar 45 rumah, daftar tidak perlu dibuat terlalu kompleks.

Setiap item minimal menampilkan:

* Nomor rumah
* Nama kepala keluarga
* Status periode berjalan
* Informasi tunggakan

Contoh:

```text
A-01
Budi Santoso

🟢 Periode berjalan lunas
```

```text
A-02
Slamet Riyadi

🔴 2 periode tertunggak
```

---

## Search

Petugas dapat mencari berdasarkan:

* Nama kepala keluarga
* Nomor rumah

Search harus mudah digunakan dengan satu tangan.

---

# 7.2 Scan QR

Halaman khusus untuk memindai QR Code rumah.

Alur:

```text
Scan QR
↓
Mendapatkan houseId
↓
Cari rumah
↓
Buka Detail Rumah
```

QR Code hanya digunakan sebagai identitas/shortcut menuju data rumah.

QR Code **bukan metode pembayaran**.

Tidak ada:

* QRIS
* transfer
* e-wallet
* payment gateway

---

## Jika QR gagal

Tampilkan tombol:

```text
Cari Rumah Secara Manual
```

yang mengarah ke Daftar Rumah.

---

# 8. Detail Rumah

Ini adalah halaman paling penting ketika melakukan penarikan.

Informasi atas:

```text
Budi Santoso

Rumah A-01

Tunggakan:
Rp10.500
```

Kemudian tampil daftar periode.

---

# 8.1 Daftar Periode

Contoh:

```text
Periode Jimpitan

🟢 29 Jun – 5 Jul
Lunas

🟢 6 Jul – 12 Jul
Lunas

🔴 13 Jul – 19 Jul
Belum Dibayar

🔵 20 Jul – 26 Jul
Periode Berjalan
```

Status visual harus mudah dibedakan.

### Lunas

Hijau + icon check.

### Belum Dibayar

Abu-abu.

### Tunggakan

Gunakan indikator merah/oranye.

### Periode Berjalan

Berikan highlight khusus.

---

# 8.2 Pembayaran

Petugas menerima uang secara tunai dari warga.

Setelah menerima uang, petugas memilih periode yang dibayar.

Contoh:

```text
☑ 13 Jul – 19 Jul
☑ 20 Jul – 26 Jul
☐ 27 Jul – 2 Agu
```

Sistem menghitung:

```text
2 × Rp3.500
=
Rp7.000
```

Kemudian tampilkan konfirmasi:

```text
Konfirmasi Pembayaran

2 Periode

Rp7.000

[ Batal ]
[ Konfirmasi ]
```

Setelah dikonfirmasi:

1. Payment dibuat.
2. Financial transaction pemasukan dibuat.
3. Status periode berubah menjadi lunas.
4. Histori pembayaran diperbarui.
5. Dashboard ikut berubah.

---

# 8.3 Pembayaran dengan Uang Lebih

Contoh warga memberikan:

```text
Rp5.000
```

sedangkan kewajiban:

```text
Rp3.500
```

Aplikasi harus dapat membedakan:

```text
Pembayaran Jimpitan
Rp3.500

Kelebihan
Rp1.500
```

Jika warga mengikhlaskan kelebihan tersebut, petugas dapat mencatat Rp1.500 sebagai pemasukan lain/donasi.

Jika tidak, uang dianggap dikembalikan kepada warga dan tidak dicatat sebagai pemasukan.

---

# 8.4 Pembatalan Pembayaran

Jika periode sudah lunas lalu petugas menekannya kembali, jangan langsung membatalkan.

Tampilkan modal:

```text
Batalkan Pembayaran?

Periode:
13 Jul – 19 Jul

Nominal:
Rp3.500

Apakah Anda yakin?
```

Setelah dikonfirmasi:

* Payment dibatalkan.
* Transaksi keuangan terkait ikut dibatalkan.
* Histori tetap dapat ditelusuri.
* Petugas yang melakukan pembatalan dicatat.

Jangan menghapus histori secara permanen.

---

# 8.5 Riwayat Pembayaran

Menampilkan:

* Periode
* Nominal
* Tanggal pembayaran
* Petugas

Contoh:

```text
13 Juli 2026
Periode 13–19 Juli

Rp3.500

Dicatat oleh:
Roid
```

---

# 9. Keuangan

Keuangan hanya berkaitan dengan **dana jimpitan**.

Tidak mencakup:

* Kas RT
* Kas pemuda
* Arisan
* Dana lain

---

# 9.1 Ringkasan Keuangan

Menampilkan:

```text
Saldo
Rp7.500.000

Pemasukan
Rp8.750.000

Pengeluaran
Rp1.250.000
```

Semua role dapat melihat informasi tersebut.

---

# 9.2 Semua Transaksi

Menampilkan seluruh arus dana jimpitan.

Contoh:

```text
+ Rp3.500
Pembayaran jimpitan
Budi Santoso
5 Agustus

+ Rp1.500
Kelebihan pembayaran diikhlaskan
Budi Santoso
5 Agustus

- Rp100.000
Konsumsi kerja bakti
Rudi
7 Agustus
```

Filter:

* Semua
* Pemasukan
* Pengeluaran
* Rentang tanggal

---

# 9.3 Pemasukan

Menampilkan seluruh pemasukan.

Jenis pemasukan dapat berupa:

```text
Payment
Donation
Other
```

Pemasukan dari pembayaran jimpitan dibuat otomatis ketika pembayaran dicatat.

---

# 9.4 Tambah Pemasukan

Petugas dan Admin dapat membuat pemasukan manual.

Field:

* Kategori
* Nominal
* Keterangan
* Rumah terkait (opsional)
* Waktu

Contoh:

```text
Kategori:
Donasi

Nominal:
Rp1.500

Keterangan:
Kelebihan pembayaran Budi
diikhlaskan untuk jimpitan
```

---

# 9.5 Pengeluaran

Menampilkan seluruh penggunaan dana jimpitan.

Informasi:

* Nominal
* Keperluan
* Pengambil
* Tanggal
* Pencatat

---

# 9.6 Tambah Pengeluaran

Admin dan Petugas dapat membuat pengeluaran.

Field minimal:

* Nominal
* Keperluan
* Diambil oleh
* Catatan
* Waktu

Contoh:

```text
Nominal:
Rp100.000

Keperluan:
Konsumsi kerja bakti

Diambil oleh:
Rudi

Catatan:
-
```

Setelah disimpan, transaksi masuk sebagai `expense`.

---

# 10. Laporan

Laporan digunakan untuk melihat kondisi jimpitan dalam periode tertentu.

---

# 10.1 Laporan Jimpitan

Menampilkan pembayaran setiap rumah.

Filter:

* Periode
* Rentang tanggal
* Rumah

Contoh:

```text
Rumah       Lunas    Tunggakan

Budi        5        0
Slamet      4        1
Siti        5        0
```

---

# 10.2 Laporan Keuangan

Menampilkan:

```text
Periode:
Agustus 2026

Total Pemasukan
Rp8.750.000

Total Pengeluaran
Rp1.250.000

Saldo
Rp7.500.000
```

Laporan juga menampilkan detail transaksi jika diperlukan.

---

# 11. Admin

Menu ini hanya tersedia untuk Admin.

---

# 11.1 Manajemen Pengguna

Admin dapat:

* Melihat pengguna
* Menambah pengguna
* Menonaktifkan pengguna
* Mengaktifkan kembali pengguna
* Mengubah role

Role:

```text
Admin
Petugas
```

Petugas tidak dapat mengakses halaman ini.

---

# 11.2 Manajemen Rumah

Admin dapat:

* Menambahkan rumah
* Mengubah data rumah
* Menonaktifkan rumah
* Melihat detail rumah
* Membuat/mencetak QR Code rumah

Data rumah:

* Nomor rumah
* Nama kepala keluarga
* Alamat
* Kode QR
* Catatan

---

# 11.3 Pengaturan

Pengaturan aplikasi yang bersifat global.

Contoh:

```text
Nominal harian
Rp500

Nominal periode
Rp3.500

Hari penarikan
Sabtu
```

Pengaturan hanya dapat diubah Admin.

Perubahan nominal harus dilakukan dengan hati-hati karena dapat memengaruhi periode baru.

---

# 12. Profil

Semua pengguna memiliki halaman profil.

Informasi:

* Nama
* Email
* Role
* Status akun

Aksi:

* Logout
* Ubah password
* Kirim ulang verifikasi email jika diperlukan

---

# 13. Prinsip UI/UX

Karena aplikasi nantinya digunakan sebagai aplikasi mobile, desain harus **mobile-first**.

## Prioritas

Petugas sering menggunakan aplikasi sambil berdiri/berjalan dan hanya menggunakan satu tangan.

Karena itu:

* Tombol utama harus mudah dijangkau.
* Touch target harus cukup besar.
* Hindari tabel yang terlalu lebar.
* Gunakan card/list pada mobile.
* Informasi penting harus terlihat tanpa banyak scroll.
* Scan QR harus mudah ditemukan.
* Proses pencatatan pembayaran harus sesingkat mungkin.

---

# 14. Navigasi Mobile

Pada mobile gunakan bottom navigation atau navigasi yang sederhana.

Rekomendasi:

```text
┌─────────────────────────────┐
│                             │
│        Content              │
│                             │
│                             │
├─────────────────────────────┤
│ Home │ Jimpitan │ Keuangan │
│      │          │          │
└─────────────────────────────┘
```

Menu lain dapat berada di menu More/Profil.

Untuk halaman Jimpitan, tombol **Scan QR** dapat menjadi action utama yang mudah diakses.

---

# 15. Prinsip Keuangan

Aplikasi hanya mengelola:

```text
DANA JIMPITAN
```

Tidak boleh mencampurkan:

```text
Kas RT
Kas Pemuda
Arisan
Dana lain
```

---

## Pemasukan

Ada dua jalur.

### Otomatis

Pembayaran jimpitan:

```text
Payment
↓
Financial Transaction
↓
Income
```

### Manual

Pemasukan lain:

```text
Tambah Pemasukan
↓
Financial Transaction
↓
Income
```

---

## Pengeluaran

```text
Tambah Pengeluaran
↓
Financial Transaction
↓
Expense
```

---

# 16. Prinsip Database

Database menggunakan **Firebase Firestore**.

Collection utama:

```text
users
houses
periods
payments
financial_transactions
settings
```

`payments` digunakan untuk mengetahui status pembayaran rumah terhadap periode.

`financial_transactions` digunakan untuk mencatat seluruh arus uang dana jimpitan.

Saldo tidak disimpan sebagai angka permanen di database.

Saldo dihitung berdasarkan:

```text
Total Income - Total Expense
```

---

# 17. Prinsip Penting

### 1. Tidak ada payment gateway

Jangan membuat:

* Payment Gateway
* QRIS Payment
* Transfer Bank
* E-wallet
* Checkout

Aplikasi hanya mencatat pembayaran tunai yang sudah terjadi.

### 2. Jangan menggunakan "Minggu 1/2/3/4"

Gunakan:

```text
Periode Jimpitan
```

dengan rentang tanggal 7 hari.

### 3. Jangan menghapus histori transaksi secara permanen

Data keuangan harus dapat ditelusuri.

### 4. Petugas dapat membuat pemasukan dan pengeluaran

Petugas memiliki akses operasional penuh.

### 5. Semua pengguna dapat melihat kondisi keuangan

Admin dan Petugas dapat melihat:

* Total pemasukan
* Total pengeluaran
* Saldo
* Riwayat transaksi

### 6. Email harus terverifikasi

User yang belum melakukan verifikasi email tidak boleh menggunakan aplikasi.

### 7. Mobile-first

Walaupun aplikasi saat ini berupa website, seluruh desain harus diprioritaskan untuk penggunaan smartphone.

---

# 18. Alur Utama Aplikasi

## Penarikan Jimpitan

```text
Petugas
↓
Scan QR Rumah
↓
Detail Rumah
↓
Pilih Periode
↓
Terima uang tunai
↓
Konfirmasi
↓
Payment dibuat
↓
Income dibuat
↓
Selesai
```

## Pemasukan Lain

```text
Petugas
↓
Keuangan
↓
Tambah Pemasukan
↓
Isi nominal + keterangan
↓
Simpan
↓
Income dibuat
```

## Pengeluaran

```text
Petugas
↓
Keuangan
↓
Tambah Pengeluaran
↓
Isi nominal + keperluan + pengambil
↓
Simpan
↓
Expense dibuat
```

## Melihat Kondisi Keuangan

```text
Dashboard
↓
Saldo
Pemasukan
Pengeluaran
↓
Detail transaksi
```

---

# 19. Batasan Sistem

Jimpit Kulon bukan:

* aplikasi pembayaran online,
* aplikasi kas RT,
* aplikasi arisan,
* aplikasi keuangan pribadi,
* sistem multi-RT,
* sistem multi-dusun.

Scope saat ini:

```text
1 RT
±45 Rumah
2 Role
Admin
Petugas
```

Fokus utama:

> **Digitalisasi pencatatan jimpitan dan transparansi pengelolaan dana jimpitan.**
