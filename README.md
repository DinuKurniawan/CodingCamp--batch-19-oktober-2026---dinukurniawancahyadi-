# Productivity Dashboard

Web app statis untuk membantu mengatur hari: jam & sapaan otomatis, focus timer 25 menit, to-do list anti-duplikat, dan quick link favorit — semuanya dalam satu halaman, tanpa backend dan tanpa framework.

Buka `index.html` langsung di browser, atau pakai sebagai standalone app / browser extension.

---

## Highlights

- ⏱️ Jam dan tanggal real-time, diperbarui tiap detik
- 👋 Greeting otomatis: Good Morning / Afternoon / Evening / Night
- ✍️ Nama kustom pada sapaan ("Good Morning, Budi")
- 🌓 Light & Dark mode (default awal: Light), pilihan tersimpan permanen
- ⏳ Focus timer 25 menit dengan progress ring, Start/Stop/Reset
- ✅ To-do list: tambah, edit via modal overlay, checklist, hapus per task, hapus semua via modal konfirmasi, counter selesai
- 🚫 Deteksi task duplikat (case-insensitive, tahan spasi ganda)
- 🔗 Quick links: ikon situs otomatis, auto `https://`, buka di tab baru, aman dari `javascript:` URL
- 💾 Semua data tersimpan lokal di browser (Local Storage API)
- ♿ Aksesibel: label, `role="alert"`, fokus terlihat, 0 violation axe-core
- 📱 Responsif: rapi di desktop, tablet, dan mobile 320px+

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Struktur | HTML5 semantik |
| Styling | CSS3 (CSS variables, Grid, Flexbox) |
| Logika | Vanilla JavaScript (ES2015+: `const`/`let`, arrow function, template literal) |
| Penyimpanan | Local Storage API + `try/catch` |
| Dependency | Tidak ada |

---

## Struktur Folder

```text
project/
├── index.html          # Struktur halaman + form
├── css/
│   └── style.css       # Design tokens, layout, komponen, responsif
├── js/
│   └── script.js       # Seluruh logika aplikasi
├── favicon.svg         # Logo browser (SVG, scalable)
├── favicon.ico         # Fallback untuk browser lama (16/32/48)
├── favicon-32.png      # Fallback PNG
├── apple-touch-icon.png# Ikon home screen iOS (180×180)
├── README.md           # Dokumentasi ini
└── BUILD_STEPS.md      # Panduan build step-by-step + kode lengkap
```

---

## Logo Browser (Favicon)

Identitas visual proyek memakai **kartu rounded dengan gradien indigo** (`#6366f1 → #4338ca`), di dalamnya **ring timer** putih transparan dengan **centang putih** — menggabungkan dua ikon utama aplikasi (focus timer + task selesai).

| File | Ukuran | Fungsi |
|---|---|---|
| `favicon.svg` | scalable | Ikon utama browser modern (Chrome, Firefox, Edge, Safari) |
| `favicon.ico` | 16 / 32 / 48 | Fallback untuk browser lama & bookmark |
| `favicon-32.png` | 32×32 | Fallback PNG |
| `apple-touch-icon.png` | 180×180 | Ikon saat aplikasi ditambahkan ke home screen iOS |

Sudah terhubung di `index.html`:

```html
<meta name="theme-color" content="#4f46e5" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
```

---

## Cara Menjalankan

1. Buka folder project di file explorer.
2. Klik dua kali `index.html` (Chrome / Firefox / Edge / Safari).
3. Langsung dipakai — data otomatis tersimpan di browser.

Butuh HTTP (mis. untuk eksperimen ekstensi atau agar Local Storage konsisten):

```bash
python -m http.server 8000
# lalu buka http://localhost:8000
```

---

## Cara Pakai

### Greeting & Nama
Jam (HH:MM:SS) dan tanggal lengkap tampil di header, diperbarui setiap detik. Sapaan berganti otomatis sesuai waktu:

| Jam | Sapaan |
|---|---|
| 05:00 – 11:59 | Good Morning |
| 12:00 – 17:59 | Good Afternoon |
| 18:00 – 20:59 | Good Evening |
| 21:00 – 04:59 | Good Night |

Klik **Ubah nama** untuk menampilkan input, isi nama (maks. 40 karakter), lalu **Simpan**. Sapaan menjadi "Good Morning, Budi". Nama dikosongkan → sapaan tampil tanpa nama.

### Focus Timer
- **Start** — countdown 25:00. Klik berulang tidak membuat timer ganda.
- **Stop** — menjeda, sisa waktu disimpan, dan tombol **Start** otomatis berganti label menjadi **Lanjutkan**.
- **Lanjutkan** — meneruskan sisa waktu (tidak mengulang dari 25:00).
- **Reset** — kembali ke 25:00 dan label tombol kembali menjadi **Start**.

Warna progress ring konstan biru indigo (`var(--primary)`) — warna yang sama dengan tombol utama, diatur lewat CSS.

### To-Do List
- Tambah task lewat input + **Add**, atau tekan **Enter**.
- **Edit** → membuka overlay (modal) di tengah layar dengan input teks, tombol **Simpan** dan **Batal**. Tekan **Enter** untuk menyimpan, **Esc** atau klik area gelap di luar modal untuk membatalkan, dan **✕** untuk menutup.
- Checkbox menandai selesai/belum selesai (task selesai dicoret).
- **Hapus** (warna merah di tiap baris) menghapus satu task.
- **Hapus semua** (kanan atas card) membuka modal konfirmasi "Hapus semua task?" berisi jumlah task yang akan dihapus, tombol **Batal** dan tombol **Hapus semua** (merah solid). Tekan Escape atau klik area gelap untuk membatalkan.
- Task kosong ditolak. Task dengan teks sama (mengabaikan huruf besar-kecil dan spasi awal/akhir) ditolak dengan pesan merah — termasuk saat mengedit lewat modal.

### Quick Links
- Isi **Nama link** dan **URL**, lalu **Add link** (atau Enter).
- Ikon otomatis sesuai situs: GitHub, YouTube, Gmail, Google, Drive, X, Instagram, LinkedIn, Reddit, TikTok, Telegram, WhatsApp, Spotify, Netflix, Amazon, Shopify, Zoom, Slack, Discord, Figma, Notion, Medium, Pinterest, Twitch, Dropbox, Wikipedia, Unsplash, Microsoft, Stack Overflow, Tokopedia, Shopee, Traveloka, Grab, ChatGPT, dan lainnya. Ikon digambar sebagai SVG inline (tidak ada request ke server luar, tetap jalan offline).
- Situs yang belum dikenali memakai avatar huruf pertama dengan warna yang diturunkan dari nama domain.
- URL tanpa protokol otomatis diberi `https://`. Contoh: `github.com` → `https://github.com/`.
- Klik link → membuka di tab baru (`target="_blank"` + `rel="noopener noreferrer"`).
- **Hapus** menghapus link. Hanya URL `http`/`https` yang diterima.

### Tema
Saat pertama dibuka, aplikasi selalu dalam **Light mode**. Klik tombol **Light mode / Dark mode** di kanan atas untuk beralih — pilihan tersimpan di browser dan langsung diterapkan saat halaman dibuka berikutnya (tanpa kedipan tema). Menghapus data situs akan mengembalikan default ke Light mode.

---

## Penyimpanan Data

Semua data disimpan di Local Storage browser pada origin halaman ini:

| Key | Isi | Contoh |
|---|---|---|
| `productivity-dashboard:theme` | Tema aktif | `"dark"` |
| `productivity-dashboard:name` | Nama pengguna | `"Budi"` |
| `productivity-dashboard:tasks` | Daftar task | `[{"id":"…","text":"Belajar JS","done":false}]` |
| `productivity-dashboard:links` | Daftar link | `[{"id":"…","name":"GitHub","url":"https://github.com/"}]` |

**Reset data:** hapus data situs untuk origin terkait lewat pengaturan browser (Chrome: `chrome://settings/content/all` → cari origin → *Delete data*), atau jalankan di console:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith('productivity-dashboard:'))
  .forEach((key) => localStorage.removeItem(key));
```

Data bersifat lokal per browser/per profil — tidak ada sinkronisasi antar perangkat.

---

## Catatan Teknis

- **Tanpa flash tema** — `js/script.js` dimuat di `<head>` dan menerapkan `data-theme` sebelum body dirender (default `light`), inisialisasi DOM menunggu `DOMContentLoaded`.
- **Timer akurat & anti-double-interval** — sisa waktu dihitung dari `endTimestamp - Date.now()`, dan `Start` dijaga oleh nilai `endTimestamp`, bukan sekadar status tombol.
- **Penyimpanan aman** — seluruh akses Local Storage memakai helper `getFromStorage` / `saveToStorage` dengan `try/catch`; data JSON rusak otomatis diabaikan dan tidak menyebabkan crash.
- **Anti-XSS** — data pengguna selalu dirender dengan `textContent` atau properti DOM; `innerHTML` tidak pernah dipakai untuk data dari pengguna.
- **URL aman** — link divalidasi lewat `new URL()` dan hanya protokol `http`/`https` yang diterima, sehingga `javascript:` tidak pernah menjadi `href`.
- **Ikon tanpa request eksternal** — ikon situs adalah SVG inline (viewBox 24x24) yang dibuat lewat `createElementNS`, jadi tetap tampil saat offline. Ikon dipilih berdasarkan hostname/nama link; bila tidak ada yang cocok, jatuh ke avatar huruf dengan warna `hsl()` yang dihitung dari hash nama domain.
- **Performa** — event delegation untuk daftar task & link, render ulang hanya saat data berubah, toggle checkbox diperbarui in-place, dan daftar task dibatasi tinggi dengan scroll internal.
- **Aksesibilitas** — skip link, `sr-only` labels, `aria-invalid` + pesan error, `aria-live` untuk status timer, `focus-visible`, `prefers-reduced-motion`.
- **Modal overlay** — dipakai untuk dua aksi: edit task dan konfirmasi hapus semua task. Keduanya memakai `role="dialog"`/`role="alertdialog"` + `aria-modal`, fokus otomatis ke elemen utama, focus trap (Tab tidak keluar dari modal), `Esc` menutup, klik backdrop menutup, latar belakang diberi atribut `inert` supaya tidak bisa difokuskan, dan fokus dikembalikan ke tombol pemicu setelah ditutup.

---

## Kompatibilitas

Chrome, Firefox, Edge, dan Safari versi modern (fitur yang dipakai: `URL`, `Intl.DateTimeFormat`, `CSS Grid/Flexbox`, `crypto.randomUUID` dengan fallback, `CSS.escape`).

---

## Pengujian yang Sudah Dijalankan

| Area | Hasil |
|---|---|
| Tambah / edit / hapus / checklist task | Lolos |
| Edit task via modal overlay (buka, simpan, duplikat, Escape, backdrop, focus trap) | Lolos |
| Hapus semua via modal konfirmasi (Batal / Hapus, Escape, backdrop) | Lolos |
| Deteksi duplikat (tambah & edit) | Lolos |
| Persistensi setelah reload | Lolos |
| Local Storage JSON rusak | Tidak crash, fallback aman |
| Timer start/stop/reset, selesai, restart | Lolos (diuji dengan durasi 3 detik) |
| Anti-interval ganda | Lolos |
| Auto `https://` + tolak `javascript:` / `ftp:` / `not a url` | Lolos |
| Ikon situs otomatis (34 situs terdaftar) + fallback avatar huruf | Lolos |
| Tema light/dark + persistensi | Lolos |
| Audit axe-core (light & dark) | 0 violation |
| Layout 320px / 390px / 1280px | Tanpa overflow horizontal |
| Payload XSS (`<img onerror>`, `<svg onload>`) | Tidak dieksekusi |

---

## FAQ

**Data saya hilang setelah pindah perangkat?**
Ya, Expected. Data hanya tersimpan di browser perangkat ini. Gunakan bookmarklet/sync manual bila perlu.

**Timer terasa meleset beberapa detik.**
Timer menghitung dari timestamp sehingga akurat meski tab di-throttle browser. Jika tab lama tidak aktif, tampilan menyesuaikan kembali saat tab kembali terlihat.

**Tidak bisa menyimpan (private mode / kuota penuh).**
Aplikasi tetap berjalan, tetapi perubahan tidak tersimpan dan pesan "Perubahan tidak dapat disimpan" muncul di bawah form.

**Bisa dipakai sebagai browser extension?**
Bisa. Bungkus folder ini dengan `manifest.json` (MV3) yang menunjuk `index.html`. File manifest sengaja tidak disertakan agar struktur proyek tetap persis seperti spesifikasi.

---

## Lisensi

MIT — bebas dipakai dan dimodifikasi sesuai kebutuhan proyek kamu.
