# 🎂 Alvien & Vinella — 3D Digital Birthday Invitation

Undangan digital ulang tahun 3D modern, elegan, cinematic, dan interaktif untuk perayaan ulang tahun bersama dua orang: **Alvien & Vinella**.

Dibuat dengan **Python + Streamlit**, dipadukan dengan **Three.js**, **GSAP**, dan **HTML5 Audio**.

---

## ✨ Fitur Utama

- 🎈 **Opening Cinematic:** Animasi pembuka dengan balon pastel 3D, efek bokeh, sparkles, dan transisi dramatis saat tombol *Open Invitation ✨* ditekan.
- 🎂 **3D Birthday Cake Interactive:** Kue ulang tahun 3D bertingkat dengan lilin menyala untuk kedua celebrant (*Alvien & Vinella*). Pengunjung dapat menyentuh/mengklik kue untuk meniup lilin dan memicu ledakan sparkles.
- 🪪 **3D Tilt Invitation Card:** Kartu undangan digital kaca (*glassmorphism*) premium dengan aksen emas yang merespons pergerakan kursor 3D.
- 👥 **The Birthday Celebrants:** Kartu profil berdampingan untuk Alvien & Vinella dengan efek tilt, glow, dan zoom foto yang otomatis responsif menjadi vertikal di smartphone.
- 📅 **Save The Date & Calendar:** Hitung mundur (*countdown timer*) waktu nyata, tombol **Add to Calendar (.ics)**, dan integrasi instan ke Google Calendar.
- 📍 **Interactive Location:** Alamat lengkap venue, tombol navigasi Google Maps, dan peta interaktif.
- 📸 **Memories Gallery 3D:** Galeri foto polaroid 3D dengan efek floating, rotasi dinamis, dan lightbox zoom resolusi tinggi.
- 💌 **RSVP Interaktif:** Tamu dapat memilih kehadiran (*Yes / No*), menentukan jumlah tamu, menuliskan pesan doa, dan konfirmasi langsung. Data tersimpan ke Session State, CSV lokal, dan siap disinkronkan ke **Google Sheets**.
- 🎵 **Floating Birthday Playlist:** Pemutar musik elegan dengan piringan berputar, kontrol play/pause/prev/next, slider volume, dan progress bar.
- 🎉 **Climax "Celebrate With Us":** Ledakan kembang api (*fireworks*), hujan confetti, balon beterbangan, dan musik perayaan meriah.

---

## 📁 Struktur Project

```text
birthday-invitation/
│
├── app.py                      # Main Streamlit application & Konfigurasi Utama
├── requirements.txt            # Dependencies Python
├── README.md                   # Petunjuk lengkap
│
├── .streamlit/
│   └── config.toml             # Konfigurasi tema pastel & server Streamlit
│
├── frontend/                   # Visual & 3D Web Engine
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── bridge.js           # Penghubung Streamlit Component
│       ├── fx.js               # Canvas 2D Particle Engine (Confetti, Fireworks, Sparkles)
│       ├── scene3d.js          # Three.js 3D Balloons & Particle Engine
│       ├── cake3d.js           # Three.js 3D Procedural Birthday Cake
│       ├── player.js           # Floating Audio Player & Web Audio Fallback
│       └── main.js             # Controller utama & interaksi
│
├── assets/
│   ├── images/
│   │   ├── alvien.jpg          # Foto profil Alvien
│   │   ├── vinella.jpg         # Foto profil Vinella
│   │   ├── photo1.jpg          # Galeri kenangan 1
│   │   ├── photo2.jpg          # Galeri kenangan 2
│   │   ├── photo3.jpg          # Galeri kenangan 3
│   │   ├── photo4.jpg          # Galeri kenangan 4
│   │   ├── photo5.jpg          # Galeri kenangan 5
│   │   └── photo6.jpg          # Galeri kenangan 6
│   │
│   ├── music/
│   │   ├── birthday_song.mp3   # Lagu utama
│   │   ├── song_2.mp3          # Lagu playlist 2
│   │   └── song_3.mp3          # Lagu playlist 3
│   │
│   └── 3d/
│       └── cake.glb            # (Opsional) 3D Model GLTF/GLB jika ingin custom
│
└── data/
    └── rsvp.csv                # Penyimpanan data RSVP lokal otomatis
```

---

## 🚀 1. Cara Install & Persiapan

Pastikan Anda telah menginstal **Python 3.9+**.

1. Buka Terminal / PowerShell di folder project:
   ```bash
   cd birthday-invitation
   ```

2. (Disarankan) Buat virtual environment:
   ```bash
   python -m venv venv
   # Di Windows:
   venv\Scripts\activate
   # Di Mac/Linux:
   source venv/bin/activate
   ```

3. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```

---

## 💻 2. Cara Menjalankan Lokal

Jalankan perintah berikut di terminal:

```bash
streamlit run app.py
```

Aplikasi otomatis terbuka di browser pada alamat:
`http://localhost:8501`

> 💡 **Melihat Hasil RSVP Tamu:**
> Kunjungi link admin dengan format:
> `http://localhost:8501/?admin=alvien-vinella-2026`
> Anda dapat melihat daftar tamu yang hadir, jumlah orang, ucapan mereka, serta mengunduh file `rsvp.csv`.

---

## 🎨 3. Cara Kustomisasi

Seluruh konfigurasi utama undangan dapat diganti dengan sangat mudah di bagian atas file `app.py`:

```python
# =============================================================================
# 🎉 CONFIGURATION — edit everything here
# =============================================================================

BIRTHDAY_PERSON_1 = "Alvien"
BIRTHDAY_PERSON_2 = "Vinella"

EVENT_TITLE = "Birthday Celebration 🎂"
EVENT_SUBTITLE = "Two Birthdays, One Special Celebration ✨"

EVENT_DATE = "Sabtu, 17 Oktober 2026"     # Teks tanggal kartu
EVENT_TIME = "15:30 WIB - Selesai"          # Teks jam kartu
EVENT_VENUE = "Kampung Kecil Summarecon Serpong"  # Nama venue
EVENT_ADDRESS = "Summarecon Serpong, Tangerang"

# Format: YYYY-MM-DDTHH:MM (untuk countdown & file kalender otomatis)
EVENT_START = "2026-10-17T15:30"
EVENT_END = "2026-10-17T19:30"
```

### 🖼️ 4. Cara Memasukkan Foto
- **Foto Celebrant:** Letakkan foto wajah Alvien di `assets/images/alvien.jpg` dan Vinella di `assets/images/vinella.jpg` (format `.jpg`, `.png`, atau `.webp`).
- **Foto Galeri Kenangan:** Letakkan foto memori favorit di folder `assets/images/` dengan nama seperti `photo1.jpg`, `photo2.jpg`, dst. Aplikasi akan otomatis mendeteksi, mengoptimalkan, dan menampilkannya di galeri 3D.

### 🎵 5. Cara Memasukkan Lagu
- Simpan file musik kesukaan Anda berformat `.mp3`, `.m4a`, atau `.wav` ke folder `assets/music/`.
- Contoh: `birthday_song.mp3`, `song_2.mp3`, dll.
- Anda dapat memberi label nama lagu di dictionary `PLAYLIST_TITLES` pada `app.py`.

### 📅 6. Cara Mengganti Tanggal & Waktu
Cukup sesuaikan variabel `EVENT_DATE`, `EVENT_TIME`, `EVENT_START`, dan `EVENT_END` di `app.py`. Countdown timer dan tombol kalender akan otomatis memperbarui hitungan hari dan jamnya.

### 📍 7. Cara Mengganti Venue & Lokasi
Ubah nilai `EVENT_VENUE` dan `EVENT_ADDRESS` di `app.py`. Tombol *Get Directions* dan *Open Google Maps* akan otomatis mengarahkan tamu ke titik tujuan yang tepat.

### 📝 8. Cara Menggunakan Google Form Langsung di Web
Tamu kini bisa mengisi **Google Form langsung tertanam di dalam web** (tab *Isi via Google Form*):
1. Buka [Google Forms](https://forms.google.com/) dan buat form RSVP baru (misal: Nama, Jumlah Tamu, Doa/Ucapan).
2. Klik tombol **Kirim (Send)** di pojok kanan atas.
3. Pilih tab link `🔗` atau tab sematkan `< >`, lalu salin link URL-nya.
4. Buka `app.py`, lalu tempelkan link tersebut ke variabel:
   ```python
   GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/KODE_FORM_ANDA/viewform?embedded=true"
   ```
5. Simpan file `app.py`. Sekarang formulir Google Form akan langsung tampil dan dapat diisi oleh tamu tanpa harus keluar dari website undangan!

---

## 📊 9. Integrasi Google Sheets untuk RSVP Otomatis (Opsional)

Jika ingin data RSVP otomatis masuk ke Google Spreadsheet tamu secara live:

1. Buat Google Spreadsheet baru.
2. Buka menu **Extensions > Apps Script**, lalu paste script berikut:
   ```javascript
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var data = JSON.parse(e.postData.contents);
     sheet.appendRow([data.timestamp, data.name, data.attending, data.guests, data.message]);
     return ContentService.createTextOutput(JSON.stringify({"result": "success"})).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Klik **Deploy > New Deployment** > pilih jenis **Web App**.
4. Set *Who has access* ke **Anyone**.
5. Salin URL Web App yang dihasilkan, lalu masukkan ke `GOOGLE_SHEETS_WEBHOOK_URL` di `app.py` atau di `.streamlit/secrets.toml`:
   ```toml
   GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfyc.../exec"
   ```

---

## ☁️ 9. Cara Deploy ke Streamlit Community Cloud

Aplikasi ini 100% kompatibel dan siap di-deploy secara gratis ke **Streamlit Community Cloud**:

1. Upload seluruh folder project `birthday-invitation` ke repository **GitHub** milik Anda (bisa public atau private).
2. Buka [share.streamlit.io](https://share.streamlit.io/) dan login dengan akun GitHub Anda.
3. Klik tombol **New app**.
4. Pilih repository GitHub Anda, branch `main`, dan set *Main file path* ke:
   ```text
   app.py
   ```
5. (Opsional) Jika menggunakan Google Sheets atau Custom Admin Key, masukkan di menu **Advanced Settings > Secrets**:
   ```toml
   ADMIN_KEY = "alvien-vinella-2026"
   GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/.../exec"
   ```
6. Klik **Deploy!** 🚀
   Dalam 1-2 menit, link undangan website 3D Anda aktif dan siap dibagikan kepada seluruh tamu undangan!

---

Selamat merayakan ulang tahun **Alvien & Vinella**! 🎉🎂✨
