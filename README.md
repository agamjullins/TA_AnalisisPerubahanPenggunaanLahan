# Analisis Perubahan Penggunaan Lahan Kabupaten Timor Tengah Utara

Repository ini berisi script **Google Earth Engine (GEE)** yang digunakan untuk klasifikasi penggunaan lahan Kabupaten Timor Tengah Utara (TTU) tahun 2015 dan 2025 menggunakan citra Landsat 8 dan metode Random Forest.

## Judul Penelitian

**ANALISIS PERUBAHAN PENGGUNAAN LAHAN DI KABUPATEN TIMOR TENGAH UTARA, PROVINSI NUSA TENGGARA TIMUR TAHUN 2015 DAN TAHUN 2025 DENGAN METODE RANDOM FOREST DAN CITRA SATELIT**

## Tujuan

Script digunakan untuk menghasilkan klasifikasi penggunaan lahan tahun 2015 dan 2025 sebagai dasar analisis perubahan penggunaan lahan.

## Data dan Metode

| Komponen | Keterangan |
|---|---|
| Platform | Google Earth Engine |
| Citra | Landsat 8 Collection 2 Tier 1 Level 2 |
| Tahun | 2015 dan 2025 |
| Resolusi | 30 meter |
| Cloud cover filter | < 20% |
| Cloud masking | QA_PIXEL (cloud dan cloud shadow) |
| Composite | Median |
| Indeks | NDVI, NDBI, NDWI |
| Metode klasifikasi | Random Forest |
| Jumlah tree | 100 |
| Sampel | 100 pixel per kelas |
| Pembagian data | 80% training dan 20% testing |
| Seed | 1 |

## Kelas Penggunaan Lahan

| Kode | Kelas |
|---:|---|
| 0 | Permukiman |
| 1 | Lahan Pertanian |
| 2 | Kebun Campuran |
| 3 | Vegetasi |
| 4 | Badan Air |

## Struktur Repository

```text
analisis-perubahan-lahan-ttu/
│
├── README.md
│
└── gee/
    ├── 01_klasifikasi_2015.js
    └── 02_klasifikasi_2025.js
```

## 1. Klasifikasi Tahun 2015

File `gee/01_klasifikasi_2015.js` berisi proses:

1. Menentukan wilayah penelitian menggunakan asset `KABTTU`.
2. Mengambil citra Landsat 8 tahun 2015.
3. Memfilter citra berdasarkan wilayah dan tanggal.
4. Membuat daftar citra dan metadata akuisisi.
5. Memfilter citra dengan cloud cover kurang dari 20%.
6. Melakukan cloud masking menggunakan `QA_PIXEL`.
7. Melakukan preprocessing dan composite median.
8. Menghitung NDVI, NDBI, dan NDWI.
9. Menggabungkan band spektral dan indeks sebagai input Random Forest.
10. Mengambil 100 pixel sampel untuk masing-masing kelas.
11. Membagi data menjadi 80% training dan 20% testing.
12. Melatih Random Forest dengan 100 tree.
13. Melakukan klasifikasi penggunaan lahan.
14. Melakukan evaluasi menggunakan confusion matrix, Overall Accuracy, Kappa, Producer Accuracy, dan User Accuracy.
15. Menghitung luas setiap kelas penggunaan lahan.
16. Membuat grafik luas penggunaan lahan.
17. Mengekspor hasil klasifikasi dan data terkait ke Google Drive.

## 2. Klasifikasi Tahun 2025

File `gee/02_klasifikasi_2025.js` menggunakan alur yang sama untuk tahun 2025, yaitu:

1. Menentukan wilayah penelitian menggunakan asset `KABTTU`.
2. Mengambil citra Landsat 8 tahun 2025.
3. Memfilter citra berdasarkan wilayah dan tanggal.
4. Membuat daftar citra dan metadata akuisisi.
5. Memfilter citra dengan cloud cover kurang dari 20%.
6. Melakukan cloud masking menggunakan `QA_PIXEL`.
7. Melakukan preprocessing dan composite median.
8. Menghitung NDVI, NDBI, dan NDWI.
9. Menggabungkan band spektral dan indeks sebagai input Random Forest.
10. Mengambil 100 pixel sampel untuk masing-masing kelas.
11. Membagi data menjadi 80% training dan 20% testing.
12. Melatih Random Forest dengan 100 tree.
13. Melakukan klasifikasi penggunaan lahan.
14. Melakukan evaluasi menggunakan confusion matrix, Overall Accuracy, Kappa, Producer Accuracy, dan User Accuracy.
15. Menghitung luas setiap kelas penggunaan lahan.
16. Membuat grafik luas penggunaan lahan.
17. Mengekspor hasil klasifikasi dan data terkait ke Google Drive.

## Asset Google Earth Engine

Script menggunakan asset yang berada di akun/project Google Earth Engine, termasuk:

- `KABTTU`
- Polygon sampel:
  - `Permukiman2015` / `Permukiman2025`
  - `Lahan_Pertanian2015` / `Lahan_Pertanian2025`
  - `Kebun_Campuran2015` / `Kebun_Campuran2025`
  - `Vegetasi2015` / `Vegetasi2025`
  - `Badan_Air2015` / `Badan_Air2025`

Asset tersebut **tidak disertakan dalam repository** karena merupakan asset GEE yang aksesnya bergantung pada akun/project pemilik.

## Cara Menjalankan Script

1. Buka Google Earth Engine Code Editor.
2. Pastikan asset `KABTTU` dan polygon sampel tersedia pada akun/project GEE.
3. Buka file yang diperlukan dari folder `gee`.
4. Salin isi file ke GEE Code Editor.
5. Sesuaikan nama asset jika berbeda dengan nama pada script.
6. Jalankan script.
7. Hasil klasifikasi, evaluasi, grafik, dan task export dapat dilihat pada GEE.

## Output

Script menghasilkan antara lain:

- Citra komposit Landsat.
- Peta klasifikasi penggunaan lahan.
- Confusion matrix.
- Overall Accuracy.
- Kappa.
- Producer Accuracy.
- User Accuracy.
- Luas penggunaan lahan.
- Grafik luas penggunaan lahan.
- Raster/GeoTIFF hasil klasifikasi.
- SHP hasil klasifikasi.
- Data sampel dan metadata citra sesuai export yang terdapat pada masing-masing script.

## Catatan Reproduksibilitas

Hasil klasifikasi bergantung pada:

- Asset wilayah penelitian.
- Polygon sampel yang digunakan.
- Waktu dan rentang tanggal citra.
- Filter cloud cover.
- Parameter preprocessing.
- Parameter Random Forest.
- Data training dan testing.

Repository ini menyimpan script penelitian, sedangkan data citra Landsat diakses melalui Google Earth Engine.

## Penulis

**Agam JulliNS**

Program Studi Teknik Informatika  
Konsentrasi Data Science
