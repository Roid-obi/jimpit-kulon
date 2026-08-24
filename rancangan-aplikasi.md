# Rancangan Sistem Aplikasi Website Jimpitan Pemuda Dusun

Saya ingin membuat sebuah aplikasi website untuk membantu pengelolaan jimpitan di dusun saya. Sistem ini digunakan oleh pemuda yang bertugas melakukan penarikan jimpitan setiap minggu.

## Sistem Jimpitan yang Berjalan Saat Ini

* Penarikan jimpitan dilakukan **setiap hari Sabtu**.
* Nominal yang dibayarkan setiap rumah adalah **Rp3.500**, yang merupakan akumulasi dari **Rp500 per hari selama 7 hari**.
* Karena menggunakan periode 7 hari, maka satu periode jimpitan dapat melintasi dua bulan. Contohnya:

  * Periode 29 Juni – 5 Juli
  * Periode 27 Juli – 2 Agustus
* Oleh karena itu, aplikasi **tidak menggunakan istilah "Minggu 1, Minggu 2"**, melainkan menggunakan **Periode Jimpitan** yang terdiri dari rentang tanggal selama 7 hari.

---

## Permasalahan Saat Ini

### 1. Tidak ada dokumentasi keuangan yang jelas

Seluruh pemasukan dan pengeluaran jimpitan masih dicatat secara manual sehingga:

* kurang transparan,
* sulit mencari histori transaksi,
* rawan terjadi kesalahan pencatatan,
* sulit mengetahui saldo jimpitan yang sebenarnya.

Perlu diperjelas bahwa sistem ini **hanya mengelola keuangan jimpitan**, tidak mencakup kas RT, kas pemuda, arisan, ataupun jenis keuangan lainnya.

---

### 2. Pembayaran warga bersifat fleksibel

Dalam praktiknya terdapat berbagai kondisi, misalnya:

* ada warga yang membayar hanya periode saat ini,
* ada yang ingin membayar dua atau tiga periode sekaligus,
* ada yang langsung membayar satu bulan,
* ada yang ingin melunasi seluruh tunggakan beberapa periode sebelumnya.

Karena itu petugas harus dapat memilih periode mana saja yang dibayar tanpa harus mengikuti urutan.

---

### 3. Checklist manual kurang jelas

Saat ini checklist hanya berisi:

* Minggu 1
* Minggu 2
* Minggu 3
* Minggu 4

Padahal tidak diketahui minggu tersebut mewakili tanggal berapa.

Pada aplikasi nanti setiap pembayaran harus berdasarkan **Periode Jimpitan**, misalnya:

* 29 Juni – 5 Juli
* 6 Juli – 12 Juli
* 13 Juli – 19 Juli
* 20 Juli – 26 Juli
* 27 Juli – 2 Agustus

Dengan demikian tidak akan ada kebingungan ketika satu periode melewati pergantian bulan.

---

# Konsep Sistem

## Alur Penarikan Jimpitan

1. Petugas login ke aplikasi.

2. Petugas mendatangi rumah warga.

3. Di setiap rumah terdapat **QR Code** yang berisi kode unik rumah.

4. Petugas melakukan scan QR Code.

5. Jika QR Code tidak dapat dipindai, petugas dapat mencari rumah melalui fitur pencarian.

6. Setelah rumah ditemukan, aplikasi langsung membuka halaman pembayaran jimpitan milik rumah tersebut.

---

## Halaman Pembayaran Rumah

Pada halaman tersebut ditampilkan informasi seperti:

* Nama Kepala Keluarga
* Alamat
* Status pembayaran
* Total tunggakan
* Riwayat pembayaran

Di bawahnya terdapat daftar **Periode Jimpitan**.

Contoh:

* 29 Juni – 5 Juli
* 6 Juli – 12 Juli
* 13 Juli – 19 Juli
* 20 Juli – 26 Juli
* 27 Juli – 2 Agustus

Setiap periode memiliki status:

🟢 Lunas

⚪ Belum Dibayar

🔴 Tunggakan (periode telah lewat tetapi belum dibayar)

Periode yang sedang berjalan diberikan highlight khusus agar petugas mengetahui periode yang sedang ditagih hari itu.

---

## Proses Pembayaran

Petugas cukup memilih periode yang dibayarkan oleh warga.

Contohnya warga ingin membayar:

* Periode 29 Juni – 5 Juli
* Periode 6 Juli – 12 Juli
* Periode 13 Juli – 19 Juli

Maka petugas cukup mencentang ketiga periode tersebut.

Sistem secara otomatis menghitung:

3 × Rp3.500 = Rp10.500

Kemudian muncul konfirmasi pembayaran.

Setelah dikonfirmasi:

* status periode berubah menjadi Lunas,
* pembayaran tersimpan ke database,
* histori pembayaran tercatat,
* pemasukan jimpitan bertambah secara otomatis.

---

## Pencegahan Salah Klik

Jika petugas tidak sengaja menekan periode yang sudah lunas, aplikasi tidak langsung menghapus status pembayaran.

Akan muncul dialog konfirmasi:

"Apakah Anda yakin ingin membatalkan pembayaran periode ini?"

Jika dibatalkan, sistem mencatat:

* siapa petugas yang melakukan pembatalan,
* waktu pembatalan,
* alasan (opsional).

Seluruh aktivitas tersebut disimpan sebagai audit log.

---

## Histori Pembayaran

Setiap rumah memiliki histori pembayaran yang menampilkan:

* Periode yang dibayar
* Nominal
* Tanggal pembayaran
* Nama petugas

Sehingga seluruh riwayat pembayaran dapat ditelusuri kembali kapan saja.

---

# Pemasukan Jimpitan

Setiap pembayaran yang berhasil dilakukan otomatis menjadi transaksi pemasukan.

Informasi yang disimpan:

* Tanggal pembayaran
* Rumah
* Periode yang dibayar
* Nominal
* Petugas

Petugas tidak perlu melakukan input pemasukan secara manual.

---

# Pengeluaran Dana Jimpitan

Aplikasi juga menyediakan pencatatan pengeluaran dana jimpitan.

Saat ada pengambilan dana, pengguna wajib mengisi:

* Tanggal pengambilan
* Nominal
* Nama pengambil
* Keperluan pengambilan
* Keterangan tambahan (opsional)
* Bukti/foto nota (opsional)

Setelah disimpan, saldo dana jimpitan otomatis berkurang.

---

# Dashboard

Dashboard menampilkan ringkasan:

* Total saldo dana jimpitan
* Total pemasukan
* Total pengeluaran
* Jumlah rumah
* Jumlah rumah yang memiliki tunggakan
* Jumlah rumah yang sudah melunasi periode berjalan

---

# Laporan

Aplikasi menyediakan laporan:

* Laporan pemasukan
* Laporan pengeluaran
* Laporan saldo dana jimpitan
* Laporan pembayaran setiap rumah
* Laporan tunggakan warga

Seluruh laporan dapat difilter berdasarkan:

* rentang tanggal,
* periode,
* bulan,
* tahun.

Laporan dapat diunduh dalam format PDF maupun Excel.

---

# Hak Akses

### Admin

* Mengelola data rumah
* Mengelola data petugas
* Mengelola QR Code
* Mengelola seluruh transaksi
* Melihat seluruh laporan

### Petugas Jimpitan

* Scan QR Code
* Mencari rumah
* Melakukan pembayaran
* Melihat histori pembayaran

### Bendahara

* Melihat seluruh pemasukan
* Mencatat pengeluaran dana jimpitan
* Melihat saldo
* Mencetak laporan

---

# Tujuan Sistem

Aplikasi ini bertujuan untuk:

* mendigitalisasi proses jimpitan,
* mempercepat proses penarikan,
* mengurangi kesalahan pencatatan,
* mempermudah pembayaran beberapa periode sekaligus,
* menyediakan laporan keuangan yang transparan,
* memudahkan pelacakan histori pembayaran setiap rumah,
* serta meningkatkan akuntabilitas pengelolaan dana jimpitan di lingkungan dusun.
