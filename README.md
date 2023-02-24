# bot-lost-found-DPM

Bot yang digunakan untuk pelaporan kehilangan atau penemuan barang

## Instalasi

Clone project ke local repository

```bash
git clone https://github.com/alfiansyrff/lost-found-DPM.git
cd lost-found-DPM
```

Install Depedency dengan 

```bash
npm install
```

Untuk menjalankan: 
```bash
npm start
```

# Mekanisme bot 
- mhs buat laporan di bot
  - kehilangan
  - penemuan
  - setiap pembuatan laporan hanya perlu menyalin format teks yang dikirim dan mengisi field yang dibutuhkan, tanpa perlu menghapus bagian teks tertentu.
- mhs bisa cek barang yg statusnya belum selesai
  - kehilangan
  - penemuan
 - setiap barang yg sudah kembali ke pemilik asalnya, si pemilik diharuskan menghubungi administrator untuk mengubah status barang menjadi selesai
 - mhs tidak diperbolehkan mengirimkan stiker ( kalo kirim media udah ada handlingnya )

