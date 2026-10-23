# Productivity Dashboard — Panduan Build Lengkap

Web app statis untuk mengelola fokus, task, dan link favorit dalam satu halaman. Dibangun tanpa framework, tanpa backend, dan tanpa build tool.

**Tech stack:** HTML + CSS + Vanilla JavaScript + Local Storage API  
**Mode:** Light / Dark  
**Target browser:** Chrome, Firefox, Edge, Safari (versi modern)

---

## 1. Struktur Folder

```text
project/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── favicon.svg
├── favicon.ico
├── favicon-32.png
├── apple-touch-icon.png
├── README.md
└── BUILD_STEPS.md
```

Aturan yang dipegang:

- Hanya **satu** file CSS (`css/style.css`) dan **satu** file JavaScript (`js/script.js`).
- Tidak ada framework, library, CDN, gambar eksternal, atau backend.
- Seluruh data pengguna disimpan di Local Storage browser.
- Semua teks dari pengguna dirender dengan `textContent`, bukan `innerHTML`.

---

## 2. Ringkasan Fitur

| Fitur | Implementasi |
|---|---|
| Jam & tanggal real-time | `setInterval(renderClock, 1000)` + `Intl.DateTimeFormat('id-ID')` |
| Greeting otomatis | `Good Morning / Afternoon / Evening / Night` sesuai jam |
| Nama kustom | Form edit nama, disimpan di Local Storage |
| Light / Dark mode | CSS variables + atribut `data-theme` di `<html>` |
| Focus timer 25 menit | `setInterval`, guard anti-interval ganda, Start/Stop/Reset |
| Notifikasi timer selesai | Pesan status, badge, animasi kartu, dan judul tab |
| To-do list | Tambah, edit via modal overlay, checklist, hapus per task, hapus semua (modal konfirmasi), counter selesai |
| Anti-duplikat task | Case-insensitive, trim spasi, berlaku saat tambah & edit |
| Quick links | Ikon situs otomatis, tambah, buka tab baru, hapus, auto `https://` |
| Persistensi | Local Storage dengan helper `try/catch` dan validasi data |

---

## 3. Langkah Build

### Step 1 — Buat kerangka HTML semantik

Buat `index.html` dengan susunan:

1. `<header>` untuk tanggal, jam, greeting, nama, dan toggle tema.
2. `<main>` berisi tiga `<section class="card">`: Focus Timer, To-Do List, Quick Links.
3. `<footer>` untuk keterangan penyimpanan lokal.
4. Elemen status/error memakai `role="alert"` atau `role="status"` agar terbaca screen reader.
5. Overlay modal edit task diletakkan setelah `</div>` pembungkus `.app`, dengan `role="dialog"` + `aria-modal="true"`.
6. Overlay modal konfirmasi hapus semua task memakai `role="alertdialog"` + `aria-describedby` untuk pesan konfirmasi.
7. Logo browser dipasang lewat `<link rel="icon">` (SVG sebagai utama, ICO/PNG sebagai fallback) plus `apple-touch-icon` dan `theme-color`.

```html
<meta name="theme-color" content="#4f46e5" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
```

Detail penting:

- Letakkan `<script src="js/script.js"></script>` di `<head>` **tanpa** `defer`. Script menerapkan tema lebih awal agar tidak ada kedipan tema, lalu menunggu `DOMContentLoaded` untuk menginisialisasi UI.
- Timer memakai SVG ring dengan `pathLength="100"` supaya progres bisa dihitung dalam persen tanpa menghitung keliling lingkaran.

Potongan markup timer:

```html
<svg class="timer-ring" viewBox="0 0 220 220" aria-hidden="true">
  <circle class="timer-ring-track" cx="110" cy="110" r="96"></circle>
  <circle
    class="timer-ring-progress"
    id="timerProgress"
    cx="110" cy="110" r="96"
    pathLength="100"
  ></circle>
</svg>
<p class="timer-text" id="timerText" role="timer" aria-live="off">25:00</p>
```

**Cek:** halaman terbuka, semua section dan form tampil, tidak ada error di console.

---

### Step 2 — Tentukan design token & tema

Tulis semua warna, radius, dan shadow sebagai CSS variables di `:root`, lalu override di `[data-theme="dark"]`.

```css
:root {
  --bg: #f3f5fb;
  --surface: #ffffff;
  --text: #182034;
  --text-muted: #667085;
  --border: #e3e7f0;
  --primary: #4f46e5;
  --on-primary: #ffffff;
  --primary-soft: #eef2ff;
  --danger: #c92a2a;
  --ring-track: #e9ecf6;
  --shadow: 0 22px 60px -34px rgba(16, 24, 40, 0.35);
}

[data-theme="dark"] {
  --bg: #0b1020;
  --surface: #141a2e;
  --text: #edf1ff;
  --text-muted: #9aa7c7;
  --border: #293352;
  --primary: #a5b4fc;
  --on-primary: #151b31;
  --primary-soft: #232c50;
  --danger: #fda4af;
  --ring-track: #26304d;
  --shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.8);
}
```

Alur tema di JavaScript:

1. Baca `productivity-dashboard:theme` dari Local Storage.
2. Jika belum ada preferensi tersimpan, aplikasi selalu memakai **Light mode** (tidak mengikuti `prefers-color-scheme` perangkat).
3. Pasang `data-theme` pada `<html>`.
4. Saat toggle diklik: ganti tema, perbarui `aria-pressed`, lalu simpan pilihan.

Gunakan transisi `background-color`/`color` 0.2–0.3 detik, dan hormati `prefers-reduced-motion`.

**Cek:** toggle mengubah seluruh halaman, pilihan tetap tersimpan setelah reload.

---

### Step 3 — Bangun layout responsif

Gunakan CSS Grid dan Flexbox:

- `.app` selebar maksimum `1120px`, padding nyaman.
- `.dashboard-grid` dua kolom di desktop; Quick Links membentang penuh.
- Di bawah `880px`, grid menjadi satu kolom.
- Di bawah `640px`, header menumpuk, form Quick Links menjadi satu kolom, tombol full-width.
- Gunakan `min-width: 0` pada item grid/flex agar teks panjang tidak merusak layout.
- Tambahkan `:focus-visible`, `.sr-only`, dan skip-link untuk aksesibilitas.

Hierarki visual:

1. Greeting besar sebagai fokus utama.
2. Jam di kanan atas.
3. Kartu dengan judul, badge, dan aksi.
4. Tombol utama memakai warna aksen; aksi sekunder lebih tenang.

**Cek:** layout rapi di lebar 1280px, 768px, dan 390px.

---

### Step 4 — Buat lapisan penyimpanan yang aman

Semua akses Local Storage lewat dua helper:

```js
const getFromStorage = (key, fallbackValue) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallbackValue;
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`Gagal membaca "${key}".`, error);
    return fallbackValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Gagal menyimpan "${key}".`, error);
    return false;
  }
};
```

Key yang dipakai:

| Key | Isi |
|---|---|
| `productivity-dashboard:theme` | `"light"` atau `"dark"` |
| `productivity-dashboard:name` | string nama |
| `productivity-dashboard:tasks` | array `{ id, text, done }` |
| `productivity-dashboard:links` | array `{ id, name, url }` |

Data yang dimuat selalu divalidasi:

- Task tanpa teks valid dibuang.
- Duplikat lama dibersihkan secara case-insensitive.
- Link tanpa nama/URL http(s) valid dibuang.
- Nama yang bukan string diabaikan.

**Cek:** isi Local Storage dengan JSON rusak, reload, aplikasi tetap jalan tanpa crash dan menampilkan state kosong.

---

### Step 5 — Implementasikan jam, tanggal, dan greeting

```js
const getGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 21) return 'Good Evening';
  return 'Good Night';
};
```

- Format jam `HH:MM:SS` memakai `padStart(2, '0')`.
- Tanggal memakai `Intl.DateTimeFormat('id-ID', { weekday, day, month, year })`.
- Panggil render segera saat init, lalu ulangi setiap 1000 ms.
- Jangan pasang `aria-live` pada jam agar screen reader tidak bicara setiap detik.

**Cek:** batas waktu 04:59 → Good Night, 05:00 → Good Morning, 11:59 → Good Morning, 12:00 → Good Afternoon, 17:59 → Good Afternoon, 18:00 → Good Evening, 20:59 → Good Evening, 21:00 → Good Night.

---

### Step 6 — Tambahkan nama kustom pada greeting

- Tombol **Ubah nama** menampilkan form inline.
- Form berisi input, tombol Simpan, dan Batal.
- Saat disimpan: `trim()`, batasi 40 karakter, simpan ke Local Storage, panggil ulang render greeting.
- Nama kosong diperbolehkan; greeting tampil tanpa koma dan nama.
- `Escape` menutup form tanpa menyimpan.

```js
const greeting = getGreeting(new Date().getHours());
dom.greeting.textContent = state.name ? `${greeting}, ${state.name}` : greeting;
```

**Cek:** isi nama “Budi”, greeting menjadi “Good Afternoon, Budi”; kosongkan nama, greeting kembali tanpa nama; reload tetap menyimpan nama.

---

### Step 7 — Buat Focus Timer yang anti-interval ganda

Gunakan tiga state:

```js
timer: {
  remaining: 25 * 60,   // sisa detik
  endTimestamp: null,   // null = tidak berjalan
  intervalId: null,
}
```

Aturan penting:

1. **Start** langsung berhenti jika `endTimestamp !== null`, sehingga klik berulang tidak membuat interval baru.
2. Waktu dihitung dari `endTimestamp - Date.now()` agar tetap akurat meski tab di-throttle browser.
3. **Stop** menyimpan sisa waktu dan menghentikan interval. Label tombol utama otomatis berganti menjadi **Lanjutkan** (bukan **Start**) karena sesi masih tersisa.
4. **Lanjutkan** meneruskan sisa waktu, bukan mengulang dari `25:00`.
5. **Reset** menghentikan interval, mengembalikan `25:00`, dan mengembalikan label tombol menjadi **Start**.
6. Saat waktu habis: interval dibersihkan, badge menjadi “Selesai”, pesan muncul, kartu beranimasi, dan `document.title` berubah. Label kembali ke **Start** untuk sesi baru.
7. Saat tab kembali aktif, panggil tick sekali untuk menyinkronkan waktu.

```js
const startTimer = () => {
  if (state.timer.endTimestamp !== null) return;

  if (state.timer.remaining <= 0) {
    state.timer.remaining = FOCUS_DURATION_SECONDS;
  }

  state.timer.endTimestamp = Date.now() + state.timer.remaining * 1000;
  state.timer.intervalId = window.setInterval(tickTimer, 250);
  renderTimer();
};

const tickTimer = () => {
  const millisecondsLeft = state.timer.endTimestamp - Date.now();
  state.timer.remaining = Math.max(0, Math.ceil(millisecondsLeft / 1000));
  renderTimer();
  if (millisecondsLeft <= 0) completeTimer();
};
```

Progres ring:

```js
const elapsedPercentage =
  ((FOCUS_DURATION_SECONDS - remaining) / FOCUS_DURATION_SECONDS) * 100;
dom.timerProgress.style.strokeDashoffset = String(elapsedPercentage);
```

Warna progress ring tidak diatur lewat JS; `stroke` diatur oleh CSS sebagai `var(--primary)` — warna indigo yang sama dengan tombol utama.

Label tombol Start/Lanjutkan diturunkan dari state yang sama, sehingga selalu konsisten dengan status badge:

```js
const isPaused = !isRunning && !isFinished && remaining < FOCUS_DURATION_SECONDS;
dom.startBtn.textContent = isPaused ? 'Lanjutkan' : 'Start';
```

**Cek:** klik Start dua kali cepat → hanya satu hitungan; Stop → status “Dijeda” dan tombol berubah menjadi **Lanjutkan**; klik **Lanjutkan** → hitungan meneruskan sisa waktu (bukan dari 25:00); Reset → 25:00 dan tombol kembali **Start**; biarkan habis → notifikasi selesai dan tombol kembali **Start** untuk sesi baru. Warnanya konstan biru indigo, sama dengan tombol.

---

---

### Step 8 — Bangun To-Do List dengan validasi duplikat

Bentuk data:

```js
{ id: crypto.randomUUID(), text: 'Belajar JavaScript', done: false }
```

Fitur:

1. **Tambah** lewat submit form (klik Add atau Enter).
2. **Edit via modal overlay**: tombol Edit membuka dialog di tengah layar (bukan input inline di dalam list).
3. **Toggle selesai** lewat checkbox; teks mendapat coretan dan warna muted.
4. **Hapus** task lewat tombol **Hapus** (warna merah) di tiap baris.
5. **Hapus semua** lewat tombol **Hapus semua** di header card, memakai konfirmasi dua klik tanpa `confirm()` browser.
6. **Counter** menampilkan jumlah selesai/total.

Validasi:

```js
const isDuplicateTask = (text, ignoredTaskId = null) => {
  const normalizedText = text.trim().toLowerCase();
  return state.tasks.some(
    (task) =>
      task.id !== ignoredTaskId &&
      task.text.trim().toLowerCase() === normalizedText,
  );
};
```

Konfirmasi hapus semua memakai modal overlay dengan tombol **Batal** dan **Hapus semua** (tanpa `confirm()` browser):

```js
const openClearAllModal = () => {
  if (state.tasks.length === 0) return;

  dom.clearAllModalMessage.textContent =
    `Semua ${state.tasks.length} task akan dihapus permanen. ` +
    'Tindakan ini tidak dapat dibatalkan.';

  openOverlay(dom.clearAllModal, dom.clearAllConfirm);
};

const confirmClearAllTasks = () => {
  state.tasks = [];
  state.editingTaskId = null;

  persistTasks();
  closeClearAllModal();
  renderTodos();
  showTodoSuccess('Semua task berhasil dihapus.');
  dom.todoInput.focus();
};
```

- Task kosong → “Task tidak boleh kosong.”
- Duplikat → “Task ini sudah ada. Gunakan teks yang berbeda.”
- Error tampil sebagai teks merah di bawah form, bukan `alert`.
- Saat edit, pengecualian `ignoredTaskId` mencegah task dianggap duplikat dengan dirinya sendiri.
- Error dibersihkan saat pengguna mengetik.

Gunakan **event delegation** pada `<ul>` untuk klik Edit/Hapus/Simpan/Batal, perubahan checkbox, dan keydown input edit. Render ulang hanya saat data berubah; toggle checkbox cukup memperbarui class dan counter (tanpa render ulang seluruh list).

Semua teks dimasukkan dengan `textContent`:

```js
const taskText = createElement('span', 'todo-text', task.text);
```

**Cek:**

- Tambah “Belajar” → muncul.
- Tambah “  belajar  ” → ditolak sebagai duplikat.
- Tambah string kosong/spasi → ditolak.
- Edit task menjadi teks task lain → ditolak.
- Edit teks → Enter menyimpan; Escape membatalkan.
- Centang → coret + counter berubah.
- Hapus → hilang.
- Reload → semua state tetap.

---

### Step 8b — Modal overlay untuk edit task & hapus semua task

Tombol **Edit** tidak mengubah baris task menjadi input, melainkan membuka dialog overlay. Tombol **Hapus semua** memakai pola yang sama: dialog konfirmasi berisi tombol **Batal** dan **Hapus semua**.

Markup (versi ringkas):

```html
<!-- Modal edit task -->
<div class="modal-overlay" id="taskModal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="taskModalTitle">
    <h2 id="taskModalTitle">Edit task</h2>
    <form id="taskEditForm" autocomplete="off">
      <label class="field-label" for="taskEditInput">Teks task</label>
      <input class="input" id="taskEditInput" type="text" maxlength="120"
             aria-describedby="taskEditError" />
      <p class="form-error" id="taskEditError" role="alert"></p>
      <button class="btn btn-secondary" id="taskEditCancel" type="button">Batal</button>
      <button class="btn btn-primary" type="submit">Simpan</button>
    </form>
  </div>
</div>

<!-- Modal konfirmasi hapus semua task -->
<div class="modal-overlay" id="clearAllModal" hidden>
  <div class="modal" role="alertdialog" aria-modal="true"
       aria-labelledby="clearAllModalTitle" aria-describedby="clearAllModalMessage">
    <h2 id="clearAllModalTitle">Hapus semua task?</h2>
    <p class="modal-message" id="clearAllModalMessage"></p>
    <button class="btn btn-secondary" id="clearAllCancel" type="button">Batal</button>
    <button class="btn btn-danger-solid" id="clearAllConfirm" type="button">Hapus semua</button>
  </div>
</div>
```

CSS overlay (backdrop gelap + blur, dialog di tengah, scroll halaman terkunci):

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(16, 24, 40, 0.55);
  backdrop-filter: blur(3px);
}

.modal {
  width: min(460px, 100%);
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
}

body.is-modal-open {
  overflow: hidden;
}
```

Perilaku modal di JavaScript:

1. `openTaskModal()` mengisi input dengan teks task, menampilkan overlay, mengunci scroll (`body.is-modal-open`), memberi atribut `inert` pada `#app` supaya latar belakang tidak bisa difokuskan, lalu memfokuskan input.
2. `saveTaskFromModal()` memvalidasi teks (tidak kosong + tidak duplikat dengan task lain), menyimpan, menutup modal, dan mengembalikan fokus ke tombol Edit.
3. `closeTaskModal()` dipakai oleh tombol Batal, tombol ✕, klik backdrop, dan tombol Escape.
4. `trapModalFocus()` menahan fokus keyboard (Tab / Shift+Tab) di dalam dialog.

```js
const openTaskModal = (taskId, triggerElement = null) => {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;
  modalTriggerElement = triggerElement;

  dom.taskEditInput.value = task.text;
  clearTaskEditError();
  dom.taskModal.hidden = false;
  document.body.classList.add('is-modal-open');
  dom.app.setAttribute('inert', '');

  dom.taskEditInput.focus();
  dom.taskEditInput.select();
};
```

### Step 9 — Buat Quick Links dengan normalisasi URL

Alur tambah link:

1. Trim nama dan URL.
2. Tolak nama/URL kosong.
3. Jika belum ada protokol, tambahkan `https://`.
4. Parse dengan `new URL()` dan hanya izinkan `http:` / `https:`.
5. Tolak whitespace agar input seperti `not a url` tidak lolos.
6. Simpan, render, reset form, fokus kembali ke input nama.

```js
const normalizeUrl = (value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue || /\s/.test(trimmedValue)) return '';

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedValue);
  const candidate = hasProtocol ? trimmedValue : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(candidate);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return '';
    }
    return parsedUrl.href;
  } catch {
    return '';
  }
};
```

Keamanan link:

```js
anchor.href = link.url;
anchor.target = '_blank';
anchor.rel = 'noopener noreferrer';
```

Dengan validasi protokol, URL seperti `javascript:alert(1)` tidak akan pernah menjadi `href`.

**Cek:**

- Nama “GitHub”, URL `github.com` → tombol membuka `https://github.com/` di tab baru.
- URL `https://example.com/path` tetap utuh.
- `javascript:alert(1)`, `ftp://...`, dan `not a url` ditolak dengan pesan jelas.
- Hapus link → hilang dan empty state muncul.
- Reload → link tetap ada.

---

### Step 9b — Ikon situs otomatis untuk Quick Links

Setiap link mendapat ikon sesuai situsnya. Semua ikon digambar sebagai **SVG inline** (viewBox `0 0 24 24`) sehingga tidak ada request ke server luar dan aplikasi tetap berfungsi offline.

1. `SITE_ICON_PATHS` menyimpan data `path` SVG untuk setiap ikon (GitHub, YouTube, Gmail, Google, Drive, X, Instagram, LinkedIn, Reddit, TikTok, Telegram, WhatsApp, Spotify, Netflix, Amazon, Shopify, Zoom, Slack, Discord, Figma, Notion, Medium, Pinterest, Twitch, Dropbox, Wikipedia, Unsplash, Microsoft, Stack Overflow, Tokopedia, Shopee, Traveloka, Grab, ChatGPT, dan lainnya).
2. `SITE_ICON_RULES` memetakan domain/nama link ke ikon. `hosts` dicocokkan persis (agar `x.com` tidak salah cocok dengan `box.com`), `keywords` dicocokkan sebagai bagian dari hostname atau nama link.
3. `createSiteIcon()` membangun SVG lewat `createElementNS` — tanpa `innerHTML`.
4. Bila tidak ada ikon yang cocok, tampilkan avatar huruf pertama dengan warna `hsl()` yang berasal dari hash nama domain, sehingga tiap situs tetap terlihat berbeda.

```js
const detectSiteIcon = (link) => {
  const host = getHostname(link.url).toLowerCase();
  const name = link.name.toLowerCase();

  for (const rule of SITE_ICON_RULES) {
    if (rule.hosts && rule.hosts.some((item) => host === item || host.endsWith(`.${item}`))) {
      return rule.icon;
    }

    if (
      rule.keywords &&
      rule.keywords.some((keyword) => host.includes(keyword) || name.includes(keyword))
    ) {
      return rule.icon;
    }
  }

  return null;
};
```

Styling ikon:

```css
.site-icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

### Step 9c — Logo browser (favicon)

Logo memakai motif yang sama dengan aplikasi: **kartu rounded gradien indigo** + **ring timer** + **centang**. Semua varian file dibuat dari satu desain 64×64 agar konsisten.

`favicon.svg` (dipakai browser modern):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Productivity Dashboard">
  <defs>
    <linearGradient id="pdGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1" />
      <stop offset="1" stop-color="#4338ca" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#pdGradient)" />
  <circle cx="32" cy="32" r="18" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="4.5" />
  <path d="M23 32.5 29.5 39 41 26" fill="none" stroke="#ffffff" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

`favicon.ico` (16/32/48) dan `favicon-32.png` dibuat dari desain yang sama, sedangkan `apple-touch-icon.png` (180×180) memakai bidang penuh tanpa sudut membulat karena iOS membulatkan sendiri.

### Step 10 — Inisialisasi, persistensi, dan QA akhir

Urutan init:

1. Cache semua elemen DOM.
2. Muat task, link, dan nama dari Local Storage.
3. Terapkan tema.
4. Pasang semua event listener.
5. Render jam, timer, task, dan link.
6. Jalankan interval jam.

Checklist akhir:

- [ ] Tidak ada error di console.
- [ ] Semua data bertahan setelah reload.
- [ ] Data JSON rusak tidak membuat app crash.
- [ ] Task kosong dan duplikat ditolak di UI.
- [ ] Timer tidak membuat interval ganda.
- [ ] Quick link selalu memakai protokol http/https.
- [ ] Tidak ada penggunaan `innerHTML` untuk data pengguna.
- [ ] Tema terang dan gelap sama-sama kontras.
- [ ] Layout nyaman di mobile.
- [ ] Bisa dioperasikan dengan keyboard (Tab, Enter, Escape).
- [ ] Audit axe-core: 0 violation.

---

## 4. Cara Menjalankan (3 Langkah)

1. Buka folder project di file explorer.
2. Klik dua kali `index.html` (atau buka dengan Chrome/Firefox/Edge/Safari).
3. Gunakan aplikasi; semua perubahan otomatis tersimpan di browser.

> Opsional untuk lingkungan yang membutuhkan HTTP (mis. eksperimen ekstensi): jalankan `python -m http.server 8000` di folder project, lalu buka `http://localhost:8000`.

---

## 5. Catatan Implementasi

- **Tanpa flash tema:** script dimuat di `<head>` dan menerapkan `data-theme` sebelum body dirender. Inisialisasi DOM menunggu `DOMContentLoaded`.
- **Local Storage aman:** semua akses dibungkus `try/catch`; JSON rusak menghasilkan fallback.
- **Anti-XSS:** data pengguna selalu masuk lewat `textContent` atau properti DOM (`value`, `href` setelah validasi), tidak pernah lewat `innerHTML`.
- **Anti-interval ganda:** Start dijaga oleh `endTimestamp`, bukan hanya oleh status tombol.
- **Timer akurat:** sisa waktu dihitung dari timestamp, bukan mengurangi angka setiap tick.
- **Aksesibilitas:** label tersembunyi, `aria-invalid`, `role="alert"`, `aria-live`, fokus terlihat, dan `prefers-reduced-motion`.
- **Reset data:** hapus data situs untuk origin terkait dari pengaturan browser.
- **Ekstensi browser:** folder ini bisa dibungkus `manifest.json` secara terpisah. File manifest tidak disertakan agar struktur tetap sesuai spesifikasi (hanya satu CSS dan satu JS).
- **Kompatibilitas:** memakai fitur modern yang didukung Chrome, Firefox, Edge, dan Safari terkini (`URL`, `Intl`, `crypto.randomUUID` dengan fallback, `CSS.escape`).

---

## 6. Kode Lengkap

### `index.html`

````html
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Productivity Dashboard: sapaan, focus timer, to-do list, dan quick links dalam satu halaman." />
  <title>Productivity Dashboard</title>
  <meta name="theme-color" content="#4f46e5" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="alternate icon" href="favicon.ico" sizes="16x16 32x32 48x48" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <link rel="stylesheet" href="css/style.css" />
  <!-- Dimuat di head agar tema dari Local Storage diterapkan sebelum halaman dilukis. -->
  <script src="js/script.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Lewati ke konten utama</a>

  <div class="app" id="app">
    <!-- ===== Header: sapaan, jam, tanggal, nama, tema ===== -->
    <header class="topbar">
      <div class="greeting-block">
        <p class="date" id="currentDate">Memuat tanggal...</p>
        <h1 class="greeting" id="greeting">Good Morning</h1>

        <div class="name-controls">
          <button class="btn btn-ghost btn-small" id="editNameBtn" type="button">
            Ubah nama
          </button>

          <form class="name-form" id="nameForm" hidden>
            <label class="sr-only" for="nameInput">Nama kamu</label>
            <input
              class="input input-compact"
              id="nameInput"
              type="text"
              maxlength="40"
              placeholder="Nama kamu"
              autocomplete="off"
            />
            <button class="btn btn-primary btn-small" type="submit">Simpan</button>
            <button class="btn btn-ghost btn-small" id="cancelNameBtn" type="button">Batal</button>
          </form>
        </div>
      </div>

      <div class="clock-block">
        <p class="time" id="currentTime">00:00:00</p>
        <button
          class="theme-toggle"
          id="themeToggle"
          type="button"
          aria-pressed="false"
          aria-label="Aktifkan dark mode"
        >
          <span class="theme-icon" id="themeIcon" aria-hidden="true">🌙</span>
          <span id="themeLabel">Dark mode</span>
        </button>
      </div>
    </header>

    <main class="dashboard-grid" id="main" tabindex="-1">
      <!-- ===== Focus Timer ===== -->
      <section class="card timer-card" id="timerCard" aria-labelledby="timerTitle">
        <div class="card-head">
          <div>
            <p class="eyebrow">Sesi fokus</p>
            <h2 id="timerTitle">Focus Timer</h2>
          </div>
          <span class="badge" id="timerStatus">Siap</span>
        </div>

        <div class="timer-display">
          <svg class="timer-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle class="timer-ring-track" cx="110" cy="110" r="96"></circle>
            <circle
              class="timer-ring-progress"
              id="timerProgress"
              cx="110"
              cy="110"
              r="96"
              pathLength="100"
            ></circle>
          </svg>
          <div class="timer-center">
            <p class="timer-text" id="timerText" role="timer" aria-live="off">25:00</p>
            <p class="timer-caption">menit fokus</p>
          </div>
        </div>

        <div class="timer-actions">
          <button class="btn btn-primary" id="startBtn" type="button">Start</button>
          <button class="btn btn-secondary" id="stopBtn" type="button" disabled>Stop</button>
          <button class="btn btn-ghost" id="resetBtn" type="button">Reset</button>
        </div>

        <p class="timer-message" id="timerMessage" role="status" aria-live="polite">
          Siap memulai sesi fokus 25 menit.
        </p>
      </section>

      <!-- ===== To-Do List ===== -->
      <section class="card" aria-labelledby="todoTitle">
        <div class="card-head card-head-split">
          <div>
            <p class="eyebrow">Rencana hari ini</p>
            <h2 id="todoTitle">To-Do List</h2>
          </div>
          <div class="card-actions">
            <span class="badge" id="todoCount">0 task</span>
            <button
              class="btn btn-ghost btn-small btn-danger"
              id="clearAllBtn"
              type="button"
              disabled
              aria-label="Hapus semua task"
            >
              Hapus semua
            </button>
          </div>
        </div>

        <form class="inline-form" id="todoForm" autocomplete="off">
          <label class="sr-only" for="todoInput">Task baru</label>
          <input
            class="input"
            id="todoInput"
            type="text"
            maxlength="120"
            placeholder="Tambah task baru..."
            aria-describedby="todoError"
          />
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
        <p class="form-error" id="todoError" role="alert"></p>

        <ul class="todo-list" id="todoList"></ul>
        <p class="empty-state" id="todoEmpty">Belum ada task. Tambahkan satu untuk memulai.</p>
      </section>

      <!-- ===== Quick Links ===== -->
      <section class="card links-card" aria-labelledby="linksTitle">
        <div class="card-head">
          <div>
            <p class="eyebrow">Akses cepat</p>
            <h2 id="linksTitle">Quick Links</h2>
          </div>
        </div>

        <form class="link-form" id="linkForm" autocomplete="off">
          <div class="field">
            <label class="field-label" for="linkName">Nama link</label>
            <input
              class="input"
              id="linkName"
              type="text"
              maxlength="40"
              placeholder="Contoh: GitHub"
              aria-describedby="linkError"
            />
          </div>
          <div class="field">
            <label class="field-label" for="linkUrl">URL</label>
            <input
              class="input"
              id="linkUrl"
              type="text"
              maxlength="500"
              placeholder="github.com atau https://github.com"
              aria-describedby="linkError"
            />
          </div>
          <button class="btn btn-primary link-submit" type="submit">Add link</button>
        </form>
        <p class="form-error" id="linkError" role="alert"></p>

        <ul class="link-list" id="linkList"></ul>
        <p class="empty-state" id="linkEmpty">Belum ada link favorit.</p>
      </section>
    </main>

    <footer class="footer">
      <p>Semua data disimpan secara lokal di browser kamu.</p>
    </footer>
  </div>

  <!-- ===== Modal overlay: edit task ===== -->
  <div class="modal-overlay" id="taskModal" hidden>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="taskModalTitle"
    >
      <div class="modal-head">
        <h2 id="taskModalTitle">Edit task</h2>
        <button
          class="icon-btn modal-close"
          id="taskModalClose"
          type="button"
          aria-label="Tutup dialog edit task"
        >
          ✕
        </button>
      </div>

      <form id="taskEditForm" autocomplete="off">
        <div class="field">
          <label class="field-label" for="taskEditInput">Teks task</label>
          <input
            class="input"
            id="taskEditInput"
            type="text"
            maxlength="120"
            placeholder="Tulis ulang task..."
            aria-describedby="taskEditError"
          />
          <p class="form-error" id="taskEditError" role="alert"></p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" id="taskEditCancel" type="button">Batal</button>
          <button class="btn btn-primary" type="submit">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== Modal overlay: hapus semua task ===== -->
  <div class="modal-overlay" id="clearAllModal" hidden>
    <div
      class="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="clearAllModalTitle"
      aria-describedby="clearAllModalMessage"
    >
      <div class="modal-head">
        <h2 id="clearAllModalTitle">Hapus semua task?</h2>
        <button
          class="icon-btn modal-close"
          id="clearAllModalClose"
          type="button"
          aria-label="Tutup dialog hapus semua task"
        >
          ✕
        </button>
      </div>

      <p class="modal-message" id="clearAllModalMessage">
        Semua task pada daftar ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </p>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="clearAllCancel" type="button">Batal</button>
        <button class="btn btn-danger-solid" id="clearAllConfirm" type="button">
          Hapus semua
        </button>
      </div>
    </div>
  </div>
</body>
</html>
````

### `css/style.css`

````css
/* ==========================================================================
   1. Design tokens (light & dark theme)
   ========================================================================== */
:root {
  color-scheme: light;

  --bg: #f3f5fb;
  --bg-glow-one: rgba(99, 102, 241, 0.16);
  --bg-glow-two: rgba(14, 165, 233, 0.12);

  --surface: #ffffff;
  --surface-muted: #f7f8fc;
  --surface-hover: #f1f3fa;
  --text: #182034;
  --text-muted: #667085;
  --border: #e3e7f0;
  --border-strong: #ccd3e3;

  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --on-primary: #ffffff;
  --primary-soft: #eef2ff;

  --success: #087f5b;
  --success-soft: #e8f8f1;
  --danger: #c92a2a;
  --danger-soft: #fff0f0;
  --on-danger: #ffffff;

  --ring-track: #e9ecf6;
  --shadow: 0 22px 60px -34px rgba(16, 24, 40, 0.35);
  --shadow-soft: 0 8px 24px -18px rgba(16, 24, 40, 0.45);

  --radius-xl: 24px;
  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 9px;

  --focus-ring: rgba(79, 70, 229, 0.35);
}

[data-theme="dark"] {
  color-scheme: dark;

  --bg: #0b1020;
  --bg-glow-one: rgba(129, 140, 248, 0.16);
  --bg-glow-two: rgba(34, 211, 238, 0.08);

  --surface: #141a2e;
  --surface-muted: #1b233b;
  --surface-hover: #222c48;
  --text: #edf1ff;
  --text-muted: #9aa7c7;
  --border: #293352;
  --border-strong: #3a466b;

  --primary: #a5b4fc;
  --primary-hover: #c7d2fe;
  --on-primary: #151b31;
  --primary-soft: #232c50;

  --success: #6ee7b7;
  --success-soft: #12332a;
  --danger: #fda4af;
  --danger-soft: #3a1c27;
  --on-danger: #161b31;

  --ring-track: #26304d;
  --shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.8);
  --shadow-soft: 0 10px 24px -18px rgba(0, 0, 0, 0.9);

  --focus-ring: rgba(165, 180, 252, 0.4);
}

/* ==========================================================================
   2. Base & background
   ========================================================================== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  min-height: 100vh;
  margin: 0;
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
  background-color: var(--bg);
  background-image:
    radial-gradient(700px 420px at 8% -10%, var(--bg-glow-one), transparent 70%),
    radial-gradient(640px 420px at 100% 0%, var(--bg-glow-two), transparent 68%);
  background-attachment: fixed;
  transition: background-color 0.25s ease, color 0.25s ease;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
p {
  margin: 0;
}

button,
input {
  font: inherit;
}

button {
  color: inherit;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

[hidden] {
  display: none !important;
}

::selection {
  background: var(--primary);
  color: var(--on-primary);
}

/* ==========================================================================
   3. Layout
   ========================================================================== */
.app {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 40px 24px 32px;
}

.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 28px;
}

.greeting-block {
  min-width: 0;
}

.eyebrow {
  margin-bottom: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.date {
  margin-bottom: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.greeting {
  font-size: clamp(2rem, 4.2vw, 3.25rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}

.name-controls {
  margin-top: 10px;
  min-height: 32px;
}

.name-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.clock-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.time {
  font-size: clamp(1.7rem, 3.6vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 22px;
  align-items: start;
}

.links-card {
  grid-column: 1 / -1;
}

.footer {
  margin-top: 26px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ==========================================================================
   4. Cards
   ========================================================================== */
.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 26px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  transition: background-color 0.25s ease, border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.card-head h2 {
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: -0.015em;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 999px;
  white-space: nowrap;
}

.badge.is-running {
  color: var(--success);
  background: var(--success-soft);
}

.badge.is-running::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 1.4s ease-in-out infinite;
}

.badge.is-finished {
  color: var(--success);
  background: var(--success-soft);
}

/* ==========================================================================
   5. Buttons & form controls
   ========================================================================== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:focus-visible,
.theme-toggle:focus-visible,
.icon-btn:focus-visible,
.link-anchor:focus-visible,
input:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  color: var(--on-primary);
  background: var(--primary);
  box-shadow: var(--shadow-soft);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-secondary {
  color: var(--text);
  background: var(--surface-muted);
  border-color: var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.btn-ghost {
  color: var(--text-muted);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-muted);
}

/* Tombol destruktif (hapus) */
.btn-danger {
  color: var(--danger);
  border-color: var(--border);
}

.btn-danger:hover:not(:disabled) {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: var(--danger);
}

.btn-danger.is-confirming {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: var(--danger);
}

/* Tombol destruktif solid (tombol konfirmasi di dalam modal) */
.btn-danger-solid {
  color: var(--on-danger);
  background: var(--danger);
  border-color: var(--danger);
}

.btn-danger-solid:hover:not(:disabled) {
  color: var(--on-danger);
  background: var(--danger);
  border-color: var(--danger);
  filter: brightness(0.94);
}

.btn-small {
  padding: 7px 11px;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
}

.input {
  width: 100%;
  min-width: 0;
  padding: 11px 14px;
  color: var(--text);
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: background-color 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.input::placeholder {
  color: var(--text-muted);
  opacity: 0.75;
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-soft);
}

.input-compact {
  width: 190px;
  padding: 7px 11px;
  font-size: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text-muted);
}

.form-error {
  min-height: 1.2em;
  margin-top: -8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--danger);
}

.form-error.is-success {
  color: var(--success);
}

.inline-form {
  display: flex;
  gap: 10px;
}

.inline-form .input {
  flex: 1;
}

.link-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) auto;
  align-items: end;
  gap: 10px;
}

.link-submit {
  min-height: 45px;
}

/* ==========================================================================
   6. Focus timer
   ========================================================================== */
.timer-card.is-finished {
  border-color: var(--success);
  animation: celebrate 0.9s ease;
}

.timer-display {
  position: relative;
  display: grid;
  place-items: center;
  width: min(240px, 78%);
  margin: 0 auto;
}

.timer-ring {
  width: 100%;
  height: auto;
  transform: rotate(-90deg);
}

.timer-ring-track,
.timer-ring-progress {
  fill: none;
  stroke-width: 11;
}

.timer-ring-track {
  stroke: var(--ring-track);
}

.timer-ring-progress {
  stroke: var(--primary);
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.5s linear, stroke 0.25s ease;
}

.timer-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.timer-text {
  font-size: clamp(2.35rem, 6vw, 3rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.timer-caption {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.timer-actions {
  display: flex;
  gap: 8px;
}

.timer-actions .btn {
  flex: 1;
}

.timer-message {
  font-size: 0.82rem;
  text-align: center;
  color: var(--text-muted);
}

/* ==========================================================================
   7. To-do list
   ========================================================================== */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  max-height: 330px;
  padding-right: 3px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 11px 12px;
  background: var(--surface-muted);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  transition: background-color 0.18s ease, border-color 0.18s ease,
    opacity 0.18s ease;
}

.todo-item:hover {
  border-color: var(--border);
}

.todo-item.is-done {
  background: var(--surface-muted);
}

.todo-check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--primary);
  cursor: pointer;
}

.todo-text {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.todo-item.is-done .todo-text {
  color: var(--text-muted);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.icon-btn {
  padding: 5px 8px;
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.icon-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

/* Tombol hapus per task selalu memakai warna destruktif agar mudah dikenali */
.todo-actions .icon-btn[data-action="delete"] {
  color: var(--danger);
}

.icon-btn[data-action="delete"]:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

/* ==========================================================================
   8b. Modal overlay (edit task)
   ========================================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(16, 24, 40, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: overlay-in 0.18s ease;
}

[data-theme="dark"] .modal-overlay {
  background: rgba(3, 6, 15, 0.72);
}

.modal {
  width: min(460px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  animation: modal-in 0.2s ease;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-head h2 {
  font-size: 1.1rem;
  font-weight: 750;
  letter-spacing: -0.015em;
}

.modal-close {
  padding: 6px 9px;
  font-size: 1rem;
  line-height: 1;
  color: var(--text);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.modal-message {
  margin-bottom: 18px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text-muted);
}

/* Kunci scroll halaman saat modal terbuka */
body.is-modal-open {
  overflow: hidden;
}

@keyframes overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ==========================================================================
   8. Quick links
   ========================================================================== */
.link-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 11px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  background: var(--surface-muted);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  transition: background-color 0.18s ease, border-color 0.18s ease,
    transform 0.18s ease;
}

.link-item:hover {
  border-color: var(--border);
  transform: translateY(-1px);
}

.link-anchor {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  color: var(--text);
  text-decoration: none;
  border-radius: 8px;
}

.link-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  font-size: 0.9rem;
  font-weight: 750;
  color: hsl(var(--avatar-hue, 240) 55% 36%);
  background: hsl(var(--avatar-hue, 240) 72% 94%);
  border-radius: 10px;
  text-transform: uppercase;
}

/* Ikon situs (SVG inline) memakai warna aksen aplikasi */
.link-avatar.has-icon {
  color: var(--primary);
  background: var(--primary-soft);
}

[data-theme="dark"] .link-avatar {
  color: hsl(var(--avatar-hue, 240) 80% 76%);
  background: hsl(var(--avatar-hue, 240) 42% 20%);
}

[data-theme="dark"] .link-avatar.has-icon {
  color: var(--primary);
  background: var(--primary-soft);
}

.site-icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.link-meta {
  min-width: 0;
}

.link-name,
.link-host {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-name {
  font-size: 0.88rem;
  font-weight: 650;
}

.link-host {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ==========================================================================
   9. Empty state, theme toggle, utilities & motion
   ========================================================================== */
.empty-state {
  padding: 22px 16px;
  font-size: 0.85rem;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease;
}

.theme-toggle:hover {
  color: var(--text);
  border-color: var(--border-strong);
  background: var(--surface-muted);
}

.theme-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  padding: 10px 14px;
  font-weight: 650;
  color: var(--on-primary);
  background: var(--primary);
  border-radius: var(--radius-sm);
  transform: translateY(-160%);
  transition: transform 0.18s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

/* Scrollbar halus untuk daftar task */
.todo-list::-webkit-scrollbar {
  width: 8px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 999px;
}

.todo-list::-webkit-scrollbar-track {
  background: transparent;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.75);
  }
}

@keyframes celebrate {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
  }
  60% {
    box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: var(--shadow);
  }
}

/* ==========================================================================
   10. Responsive
   ========================================================================== */
@media (max-width: 880px) {
  body {
    background-attachment: scroll;
  }

  .app {
    padding: 30px 20px 28px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .links-card {
    grid-column: auto;
  }

  .timer-display {
    width: min(230px, 72%);
  }
}

@media (max-width: 640px) {
  .app {
    padding: 24px 16px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
    margin-bottom: 22px;
  }

  .clock-block {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    order: -1;
  }

  .time {
    font-size: 1.55rem;
  }

  .greeting {
    font-size: clamp(1.8rem, 9vw, 2.5rem);
  }

  .card {
    padding: 20px;
    border-radius: 20px;
  }

  /* Judul + aksi (badge & tombol hapus) turun ke baris sendiri di layar kecil */
  .card-head-split {
    flex-wrap: wrap;
  }

  .card-head-split .card-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .link-form {
    grid-template-columns: 1fr;
  }

  .link-submit {
    width: 100%;
  }

  .link-list {
    grid-template-columns: 1fr;
  }

  .inline-form {
    gap: 8px;
  }

  .inline-form .btn {
    padding-inline: 16px;
  }
}

@media (max-width: 400px) {
  .name-form {
    align-items: stretch;
  }

  .input-compact {
    width: 100%;
  }

  .timer-actions {
    flex-wrap: wrap;
  }

  .timer-actions .btn {
    flex: 1 1 40%;
  }

  .todo-actions {
    gap: 0;
  }
}

/* Hormati preferensi pengguna yang mengurangi animasi */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
````

### `js/script.js`

````js
'use strict';

/* ==========================================================================
   1. Constants, storage helpers & shared utilities
   ========================================================================== */
const STORAGE_KEYS = Object.freeze({
  theme: 'productivity-dashboard:theme',
  name: 'productivity-dashboard:name',
  tasks: 'productivity-dashboard:tasks',
  links: 'productivity-dashboard:links',
});

const FOCUS_DURATION_SECONDS = 25 * 60;
const MAX_NAME_LENGTH = 40;
const MAX_TASK_LENGTH = 120;
const MAX_LINK_NAME_LENGTH = 40;
const MAX_LINK_URL_LENGTH = 500;
const DEFAULT_DOCUMENT_TITLE = 'Productivity Dashboard';

/**
 * Membaca data dari Local Storage dengan aman.
 * Data rusak / bukan JSON yang valid akan menghasilkan fallback.
 */
const getFromStorage = (key, fallbackValue) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return fallbackValue;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`[Productivity Dashboard] Gagal membaca "${key}" dari Local Storage.`, error);
    return fallbackValue;
  }
};

/**
 * Menyimpan data ke Local Storage.
 * Mengembalikan false jika penyimpanan gagal (mis. kuota penuh / private mode).
 */
const saveToStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[Productivity Dashboard] Gagal menyimpan "${key}" ke Local Storage.`, error);
    return false;
  }
};

const createId = () => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Membuat elemen DOM tanpa pernah memakai innerHTML untuk data pengguna. */
const createElement = (tagName, className = '', text = null) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== null) {
    element.textContent = text;
  }
  return element;
};

const isValidHttpUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Menambahkan "https://" bila URL belum punya protokol.
 * Hanya URL http/https yang diterima agar "javascript:" tidak bisa disisipkan.
 */
const normalizeUrl = (value) => {
  const trimmedValue = value.trim();

  // Tolak string kosong atau yang mengandung spasi/karakter whitespace.
  if (!trimmedValue || /\s/.test(trimmedValue)) {
    return '';
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedValue);
  const candidate = hasProtocol ? trimmedValue : `https://${trimmedValue}`;

  if (!isValidHttpUrl(candidate)) {
    return '';
  }

  return new URL(candidate).href;
};

const getHostname = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
};

/* ==========================================================================
   2. Theme bootstrap
   Dijalankan lebih awal (script ada di <head>) agar tidak terjadi flash tema.
   ========================================================================== */
const getInitialTheme = () => {
  const storedTheme = getFromStorage(STORAGE_KEYS.theme, null);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  // Default aplikasi selalu Light mode, mengikuti preferensi sistem perangkat.
  return 'light';
};

const setTheme = (theme) => {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', safeTheme);

  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const themeIcon = document.getElementById('themeIcon');

  if (themeToggle) {
    const isDark = safeTheme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
  }
  if (themeLabel) {
    themeLabel.textContent = safeTheme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  if (themeIcon) {
    themeIcon.textContent = safeTheme === 'dark' ? '☀️' : '🌙';
  }

  return safeTheme;
};

let currentTheme = setTheme(getInitialTheme());

/* ==========================================================================
   3. Application state & DOM references
   ========================================================================== */
const state = {
  tasks: [],
  links: [],
  name: '',
  editingTaskId: null,
  theme: currentTheme,
  timer: {
    remaining: FOCUS_DURATION_SECONDS,
    endTimestamp: null,
    intervalId: null,
  },
};

const dom = {};

/** Elemen yang membuka modal edit task (dipakai untuk mengembalikan fokus). */
let modalTriggerElement = null;

/* ==========================================================================
   4. Date, time & greeting
   ========================================================================== */
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const padTwoDigits = (value) => String(value).padStart(2, '0');

const getGreeting = (hour) => {
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }
  if (hour >= 12 && hour < 18) {
    return 'Good Afternoon';
  }
  if (hour >= 18 && hour < 21) {
    return 'Good Evening';
  }
  return 'Good Night';
};

const renderClock = () => {
  const now = new Date();

  dom.currentTime.textContent = [
    padTwoDigits(now.getHours()),
    padTwoDigits(now.getMinutes()),
    padTwoDigits(now.getSeconds()),
  ].join(':');

  dom.currentDate.textContent = dateFormatter.format(now);

  const greeting = getGreeting(now.getHours());
  dom.greeting.textContent = state.name ? `${greeting}, ${state.name}` : greeting;
};

/* ==========================================================================
   5. Name editor
   ========================================================================== */
const openNameEditor = () => {
  dom.nameForm.hidden = false;
  dom.editNameBtn.hidden = true;
  dom.nameInput.value = state.name;
  dom.nameInput.focus();
  dom.nameInput.select();
};

const closeNameEditor = () => {
  dom.nameForm.hidden = true;
  dom.editNameBtn.hidden = false;
};

const handleNameSubmit = (event) => {
  event.preventDefault();
  state.name = dom.nameInput.value.trim().slice(0, MAX_NAME_LENGTH);
  saveToStorage(STORAGE_KEYS.name, state.name);
  renderClock();
  closeNameEditor();
  dom.editNameBtn.focus();
};

const handleNameKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeNameEditor();
    dom.editNameBtn.focus();
  }
};

/* ==========================================================================
   6. Theme toggle
   ========================================================================== */
const toggleTheme = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  currentTheme = setTheme(state.theme);
  saveToStorage(STORAGE_KEYS.theme, state.theme);
};

/* ==========================================================================
   7. Focus timer
   ========================================================================== */
const renderTimer = () => {
  const { remaining, endTimestamp } = state.timer;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isRunning = endTimestamp !== null;
  const isFinished = remaining === 0 && !isRunning;
  const isPaused = !isRunning && !isFinished && remaining < FOCUS_DURATION_SECONDS;

  dom.timerText.textContent = `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;

  const elapsedPercentage = ((FOCUS_DURATION_SECONDS - remaining) / FOCUS_DURATION_SECONDS) * 100;
  dom.timerProgress.style.strokeDashoffset = String(elapsedPercentage);

  // Warna progress ring tidak diatur lewat JS; `stroke` diatur oleh CSS
  // sebagai var(--primary) — warna indigo yang sama dengan tombol utama.

  dom.startBtn.disabled = isRunning;
  dom.stopBtn.disabled = !isRunning;

  // Label tombol mengikuti status: sesi yang dijeda menampilkan "Lanjutkan".
  dom.startBtn.textContent = isPaused ? 'Lanjutkan' : 'Start';

  if (isRunning) {
    dom.timerStatus.textContent = 'Berjalan';
    dom.timerStatus.className = 'badge is-running';
    return;
  }

  if (isFinished) {
    dom.timerStatus.textContent = 'Selesai';
    dom.timerStatus.className = 'badge is-finished';
    return;
  }

  if (remaining < FOCUS_DURATION_SECONDS) {
    dom.timerStatus.textContent = 'Dijeda';
    dom.timerStatus.className = 'badge';
    return;
  }

  dom.timerStatus.textContent = 'Siap';
  dom.timerStatus.className = 'badge';
};

const clearTimerInterval = () => {
  if (state.timer.intervalId !== null) {
    window.clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
};

const completeTimer = () => {
  clearTimerInterval();
  state.timer.endTimestamp = null;
  state.timer.remaining = 0;

  renderTimer();
  dom.timerCard.classList.add('is-finished');
  dom.timerMessage.textContent = 'Sesi fokus selesai! Waktunya istirahat sejenak.';
  document.title = 'Sesi fokus selesai!';
};

const tickTimer = () => {
  const { endTimestamp } = state.timer;
  if (endTimestamp === null) {
    return;
  }

  const millisecondsLeft = endTimestamp - Date.now();
  state.timer.remaining = Math.max(0, Math.ceil(millisecondsLeft / 1000));
  renderTimer();

  if (millisecondsLeft <= 0) {
    completeTimer();
  }
};

const startTimer = () => {
  // Guard agar klik Start berulang tidak membuat interval ganda.
  if (state.timer.endTimestamp !== null) {
    return;
  }

  if (state.timer.remaining <= 0) {
    state.timer.remaining = FOCUS_DURATION_SECONDS;
  }

  state.timer.endTimestamp = Date.now() + state.timer.remaining * 1000;
  state.timer.intervalId = window.setInterval(tickTimer, 250);

  dom.timerCard.classList.remove('is-finished');
  dom.timerMessage.textContent = 'Sesi fokus sedang berjalan. Tetap fokus ya!';
  document.title = DEFAULT_DOCUMENT_TITLE;

  renderTimer();
};

const stopTimer = () => {
  if (state.timer.endTimestamp === null) {
    return;
  }

  const millisecondsLeft = state.timer.endTimestamp - Date.now();

  // Jika waktu sudah habis, selesaikan sesi (jangan menimpa pesan "selesai").
  if (millisecondsLeft <= 0) {
    completeTimer();
    return;
  }

  // Simpan sisa waktu terakhir, lalu hentikan interval.
  state.timer.remaining = Math.max(1, Math.ceil(millisecondsLeft / 1000));
  clearTimerInterval();
  state.timer.endTimestamp = null;

  renderTimer();
  dom.timerMessage.textContent = 'Timer dijeda. Tekan Lanjutkan untuk meneruskan sisa waktu.';
};

const resetTimer = () => {
  clearTimerInterval();
  state.timer.endTimestamp = null;
  state.timer.remaining = FOCUS_DURATION_SECONDS;

  dom.timerCard.classList.remove('is-finished');
  dom.timerMessage.textContent = 'Timer direset ke 25:00. Siap memulai sesi baru.';
  document.title = DEFAULT_DOCUMENT_TITLE;

  renderTimer();
};

/* ==========================================================================
   8. To-do list
   ========================================================================== */
const loadTasks = () => {
  const storedTasks = getFromStorage(STORAGE_KEYS.tasks, []);
  if (!Array.isArray(storedTasks)) {
    return [];
  }

  const seenTexts = new Set();
  const seenIds = new Set();
  const validTasks = [];

  storedTasks.forEach((item) => {
    if (!item || typeof item.text !== 'string') {
      return;
    }

    const text = item.text.trim().slice(0, MAX_TASK_LENGTH);
    const textKey = text.toLowerCase();

    if (!text || seenTexts.has(textKey)) {
      return;
    }

    let id = typeof item.id === 'string' && item.id ? item.id : createId();
    if (seenIds.has(id)) {
      id = createId();
    }

    seenTexts.add(textKey);
    seenIds.add(id);
    validTasks.push({
      id,
      text,
      done: item.done === true,
    });
  });

  return validTasks;
};

/** Timer untuk pesan sukses yang hilang otomatis. */
let todoSuccessTimer = null;

const showTodoError = (message, inputElement = dom.todoInput) => {
  dom.todoError.textContent = message;
  dom.todoError.classList.remove('is-success');
  inputElement.setAttribute('aria-invalid', 'true');
};
const showTodoSuccess = (message) => {
  dom.todoError.textContent = message;
  dom.todoError.classList.add('is-success');
  dom.todoInput.removeAttribute('aria-invalid');

  // Pesan sukses hilang otomatis agar tampilan tetap bersih.
  if (todoSuccessTimer !== null) {
    window.clearTimeout(todoSuccessTimer);
  }
  todoSuccessTimer = window.setTimeout(() => {
    dom.todoError.textContent = '';
    dom.todoError.classList.remove('is-success');
    todoSuccessTimer = null;
  }, 3000);
};

const clearTodoError = () => {
  dom.todoError.textContent = '';
  dom.todoError.classList.remove('is-success');
  dom.todoInput.removeAttribute('aria-invalid');
};

const persistTasks = () => {
  if (!saveToStorage(STORAGE_KEYS.tasks, state.tasks)) {
    showTodoError('Perubahan tidak dapat disimpan. Periksa penyimpanan browser kamu.');
    return false;
  }
  return true;
};

const isDuplicateTask = (text, ignoredTaskId = null) => {
  const normalizedText = text.trim().toLowerCase();
  return state.tasks.some(
    (task) => task.id !== ignoredTaskId && task.text.trim().toLowerCase() === normalizedText,
  );
};

const updateTodoCount = () => {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.done).length;
  dom.todoCount.textContent = total === 0 ? '0 task' : `${completed}/${total} selesai`;
};

const renderTodos = () => {
  const fragment = document.createDocumentFragment();

  state.tasks.forEach((task) => {
    const item = createElement('li', 'todo-item');
    item.dataset.id = task.id;
    if (task.done) {
      item.classList.add('is-done');
    }

    const checkbox = createElement('input', 'todo-check');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.dataset.id = task.id;
    checkbox.setAttribute(
      'aria-label',
      task.done ? `Tandai "${task.text}" belum selesai` : `Tandai "${task.text}" selesai`,
    );

    const taskText = createElement('span', 'todo-text', task.text);

    const actions = createElement('div', 'todo-actions');
    const editButton = createElement('button', 'icon-btn', 'Edit');
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = task.id;
    editButton.setAttribute('aria-label', `Edit task: ${task.text}`);

    const deleteButton = createElement('button', 'icon-btn', 'Hapus');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = task.id;
    deleteButton.setAttribute('aria-label', `Hapus task: ${task.text}`);

    actions.append(editButton, deleteButton);
    item.append(checkbox, taskText, actions);

    fragment.append(item);
  });

  dom.todoList.replaceChildren(fragment);
  dom.todoEmpty.hidden = state.tasks.length > 0;
  dom.clearAllBtn.disabled = state.tasks.length === 0;
  updateTodoCount();
};

const handleAddTask = (event) => {
  event.preventDefault();

  const text = dom.todoInput.value.trim().slice(0, MAX_TASK_LENGTH);

  if (!text) {
    showTodoError('Task tidak boleh kosong.');
    dom.todoInput.focus();
    return;
  }

  if (isDuplicateTask(text)) {
    showTodoError('Task ini sudah ada. Gunakan teks yang berbeda.');
    dom.todoInput.focus();
    return;
  }

  state.tasks.push({
    id: createId(),
    text,
    done: false,
  });

  clearTodoError();
  dom.todoInput.value = '';
  persistTasks();
  renderTodos();
  dom.todoInput.focus();
};

const toggleTask = (taskId, isDone) => {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  task.done = isDone;
  persistTasks();

  const item = dom.todoList.querySelector(`.todo-item[data-id="${CSS.escape(taskId)}"]`);
  if (item) {
    item.classList.toggle('is-done', isDone);
    const checkbox = item.querySelector('.todo-check');
    if (checkbox) {
      checkbox.setAttribute(
        'aria-label',
        isDone ? `Tandai "${task.text}" belum selesai` : `Tandai "${task.text}" selesai`,
      );
    }
  }

  updateTodoCount();
};

/* --------------------------------------------------------------------------
   Edit task via modal overlay
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   Overlay (modal) umum — dipakai untuk edit task & hapus semua task
   -------------------------------------------------------------------------- */
const MODAL_FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Overlay yang sedang terbuka, atau null jika tidak ada. */
const getOpenOverlay = () => {
  if (!dom.taskModal.hidden) {
    return dom.taskModal;
  }
  if (!dom.clearAllModal.hidden) {
    return dom.clearAllModal;
  }
  return null;
};

/** Membuka overlay: kunci scroll, nonaktifkan latar belakang, fokus ke elemen target. */
const openOverlay = (overlayElement, focusTarget = null) => {
  overlayElement.hidden = false;
  document.body.classList.add('is-modal-open');

  // Latar belakang dibuat non-interaktif (browser modern mendukung "inert").
  dom.app.setAttribute('inert', '');

  if (focusTarget) {
    focusTarget.focus();
    if (typeof focusTarget.select === 'function') {
      focusTarget.select();
    }
  }
};

/** Menutup overlay dan melepas kunci scroll bila tidak ada overlay lain yang terbuka. */
const closeOverlay = (overlayElement) => {
  if (overlayElement.hidden) {
    return;
  }

  overlayElement.hidden = true;

  if (getOpenOverlay() === null) {
    document.body.classList.remove('is-modal-open');
    dom.app.removeAttribute('inert');
  }
};

/** Menahan fokus keyboard di dalam overlay yang aktif (focus trap sederhana). */
const trapOverlayFocus = (overlayElement, event) => {
  if (event.key !== 'Tab') {
    return;
  }

  const focusableElements = overlayElement.querySelectorAll(MODAL_FOCUSABLE_SELECTOR);
  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
};

/* --------------------------------------------------------------------------
   Modal: edit task
   -------------------------------------------------------------------------- */
const showTaskEditError = (message) => {
  dom.taskEditError.textContent = message;
  dom.taskEditInput.setAttribute('aria-invalid', 'true');
};

const clearTaskEditError = () => {
  dom.taskEditError.textContent = '';
  dom.taskEditInput.removeAttribute('aria-invalid');
};

/** Membuka overlay edit task dan memfokuskan input. */
const openTaskModal = (taskId, triggerElement = null) => {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  state.editingTaskId = taskId;
  modalTriggerElement = triggerElement;

  dom.taskEditInput.value = task.text;
  clearTaskEditError();

  openOverlay(dom.taskModal, dom.taskEditInput);
};

/** Menutup overlay dan mengembalikan fokus ke tombol pemicu. */
const closeTaskModal = () => {
  if (dom.taskModal.hidden) {
    return;
  }

  const editingId = state.editingTaskId;

  closeOverlay(dom.taskModal);
  clearTaskEditError();
  state.editingTaskId = null;

  // Kembalikan fokus ke tombol Edit milik task tersebut (setelah list di-render ulang).
  if (editingId) {
    const editButton = dom.todoList.querySelector(
      `button[data-action="edit"][data-id="${CSS.escape(editingId)}"]`,
    );
    if (editButton) {
      editButton.focus();
      modalTriggerElement = null;
      return;
    }
  }

  if (modalTriggerElement && document.contains(modalTriggerElement)) {
    modalTriggerElement.focus();
  }
  modalTriggerElement = null;
};

/** Menyimpan perubahan teks task dari modal (dengan validasi yang sama). */
const saveTaskFromModal = (event) => {
  event.preventDefault();

  if (state.editingTaskId === null) {
    return;
  }

  const task = state.tasks.find((item) => item.id === state.editingTaskId);
  if (!task) {
    closeTaskModal();
    return;
  }

  const text = dom.taskEditInput.value.trim().slice(0, MAX_TASK_LENGTH);

  if (!text) {
    showTaskEditError('Task tidak boleh kosong.');
    dom.taskEditInput.focus();
    return;
  }

  if (isDuplicateTask(text, task.id)) {
    showTaskEditError('Task ini sudah ada. Gunakan teks yang berbeda.');
    dom.taskEditInput.focus();
    return;
  }

  task.text = text;
  persistTasks();
  renderTodos();
  closeTaskModal();
  showTodoSuccess('Task berhasil diperbarui.');
};

/* --------------------------------------------------------------------------
   Modal: konfirmasi hapus semua task
   -------------------------------------------------------------------------- */
const openClearAllModal = () => {
  if (state.tasks.length === 0) {
    return;
  }

  dom.clearAllModalMessage.textContent =
    `Semua ${state.tasks.length} task akan dihapus permanen. ` +
    'Tindakan ini tidak dapat dibatalkan.';

  openOverlay(dom.clearAllModal, dom.clearAllConfirm);
};

const closeClearAllModal = () => {
  closeOverlay(dom.clearAllModal);

  if (!dom.clearAllBtn.disabled) {
    dom.clearAllBtn.focus();
  }
};

const confirmClearAllTasks = () => {
  state.tasks = [];
  state.editingTaskId = null;

  persistTasks();
  closeClearAllModal();
  renderTodos();
  showTodoSuccess('Semua task berhasil dihapus.');
  dom.todoInput.focus();
};

const deleteTask = (taskId) => {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);

  if (state.editingTaskId === taskId) {
    closeTaskModal();
  }

  clearTodoError();
  persistTasks();
  renderTodos();
};

const handleTodoListClick = (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) {
    return;
  }

  const { action, id } = actionButton.dataset;
  if (!id) {
    return;
  }

  if (action === 'edit') {
    openTaskModal(id, actionButton);
  } else if (action === 'delete') {
    deleteTask(id);
  }
};

const handleTodoListChange = (event) => {
  const checkbox = event.target.closest('.todo-check');
  if (!checkbox) {
    return;
  }
  toggleTask(checkbox.dataset.id, checkbox.checked);
};

/* ==========================================================================
   9. Quick links
   ========================================================================== */
const loadLinks = () => {
  const storedLinks = getFromStorage(STORAGE_KEYS.links, []);
  if (!Array.isArray(storedLinks)) {
    return [];
  }

  return storedLinks.reduce((links, item) => {
    if (!item || typeof item.name !== 'string' || typeof item.url !== 'string') {
      return links;
    }

    const name = item.name.trim().slice(0, MAX_LINK_NAME_LENGTH);
    const url = normalizeUrl(item.url.slice(0, MAX_LINK_URL_LENGTH));

    if (!name || !url) {
      return links;
    }

    links.push({
      id: typeof item.id === 'string' && item.id ? item.id : createId(),
      name,
      url,
    });

    return links;
  }, []);
};

const showLinkError = (message, inputElement = null) => {
  dom.linkError.textContent = message;
  if (inputElement) {
    inputElement.setAttribute('aria-invalid', 'true');
  }
};

const clearLinkError = () => {
  dom.linkError.textContent = '';
  dom.linkName.removeAttribute('aria-invalid');
  dom.linkUrl.removeAttribute('aria-invalid');
};

const persistLinks = () => {
  if (!saveToStorage(STORAGE_KEYS.links, state.links)) {
    showLinkError('Perubahan tidak dapat disimpan. Periksa penyimpanan browser kamu.');
    return false;
  }
  return true;
};

/* --------------------------------------------------------------------------
   Ikon situs untuk Quick Links
   Semua ikon digambar sebagai SVG inline (24x24) agar tidak ada request
   ke server luar dan tetap tampil saat aplikasi dipakai offline.
   -------------------------------------------------------------------------- */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const SITE_ICON_PATHS = {
  code: ['M9.5 7 4.5 12l5 5', 'M14.5 7l5 5-5 5'],
  github: [
    'M5.5 10.5 7 5.5l2.6 2h4.8L17 5.5l1.5 5v4.5a4 4 0 0 1-4 4h-5a4 4 0 0 1-4-4z',
    'M9.6 12.2h.01',
    'M14.4 12.2h.01',
  ],
  youtube: [
    'M3.5 8A3.5 3.5 0 0 1 7 4.5h10A3.5 3.5 0 0 1 20.5 8v8a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 16z',
    'm10.2 9.2 4.8 2.8-4.8 2.8z',
  ],
  search: ['M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13', 'm15.8 15.8 4 4'],
  mail: [
    'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
    'm4.5 7.5 7.5 5.5 7.5-5.5',
  ],
  folder: ['M4 7a2 2 0 0 1 2-2h3.6l2 2.4H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'],
  drive: ['M12 3.5 21 19.5H3z', 'M7.8 15.5h8.4'],
  chat: [
    'M4.5 7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v6A2.5 2.5 0 0 1 17 15.5h-5L8 19v-3.5H7A2.5 2.5 0 0 1 4.5 13z',
    'm12 6.6.9 1.8 1.9.3-1.4 1.3.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.3z',
  ],
  x: ['M5 5l14 14', 'M19 5 5 19'],
  facebook: ['M10.8 21v-7.6', 'M7.6 13.4h6.4', 'M10.8 13.4V8.8A2.4 2.4 0 0 1 13.2 6.4h2.6'],
  instagram: [
    'M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5z',
    'M12 8.3a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4',
    'M16.9 7.1h.01',
  ],
  linkedin: [
    'M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5z',
    'M8 10.6v5',
    'M8 7.6h.01',
    'M11.6 15.6v-3a1.8 1.8 0 0 1 3.6 0v3',
  ],
  reddit: [
    'M12 8.2a6 6 0 1 1 0 12 6 6 0 0 1 0-12',
    'M12 8.2V5.6',
    'M10.2 5.6h3.6',
    'M9.6 13.6h.01',
    'M14.4 13.6h.01',
    'M9.6 16.6a3.4 3.4 0 0 0 4.8 0',
  ],
  music: ['M13.5 17.5V5l5.5 1.6v2.9', 'M10.8 17.5a2.7 2.7 0 1 0 2.7-2.7'],
  telegram: ['M20.5 4 3.8 11.1l5.6 2.1z', 'm9.4 13.2 3.8 6.3 1.6-6.3'],
  whatsapp: [
    'M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9.8l-4.3 3.2z',
    'M9 9c.6 1.6 1.4 2.4 3 3l1-1 1.5.8-.5 1.4c-2.3.6-5-2.1-4.4-4.4l1.4-.5.8 1.5z',
  ],
  spotify: [
    'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17',
    'M8 10.4c2.6-.6 5.1-.3 7.2.7',
    'M8.6 13.7c1.9-.4 3.7-.2 5.3.6',
  ],
  netflix: ['M6.5 20V4l11 16V4'],
  bag: [
    'M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4z',
    'M9 8V6a3 3 0 0 1 6 0v2',
  ],
  bagAlt: [
    'M6 8.5h12l-.9 11a1.5 1.5 0 0 1-1.5 1.4H8.4a1.5 1.5 0 0 1-1.5-1.4z',
    'M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5',
  ],
  video: [
    'M3.5 7.5A2 2 0 0 1 5.5 5.5h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z',
    'M14.5 10.5 20.5 7v10l-6-3.5',
  ],
  hash: ['M9 4.5v15', 'M15 4.5v15', 'M4.5 9h15', 'M4.5 15h15'],
  controller: [
    'M7.5 7.5h9a4.5 4.5 0 0 1 4.4 5.5l-.6 3.4a2.6 2.6 0 0 1-4.6 1L14 15.5h-4l-1.7 1.9a2.6 2.6 0 0 1-4.6-1L3.1 13A4.5 4.5 0 0 1 7.5 7.5z',
    'M9 12h.01',
    'M15 12h.01',
  ],
  shapes: ['M9 3.5h6v6H9z', 'M9 9.5h6v6H9z', 'M9 15.5h3v5.2a2.6 2.6 0 1 1-3-2.6z'],
  document: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12h6', 'M9 15h6', 'M9 18h4'],
  circles: [
    'M6.8 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    'M17.2 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  ],
  pin: [
    'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17',
    'M10.4 16.6v-5h2.3a2.2 2.2 0 0 1 0 4.4h-2.3',
    'M10.4 11.6V9.8',
  ],
  gamepad: [
    'M7.5 5.5h9a4 4 0 0 1 4 4v3.5a2 2 0 0 1-2 2h-2l-2.5 3H12v-3H7.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z',
    'M10 9.5v3.5',
    'M8.2 11.2h3.6',
  ],
  diamonds: [
    'M7 4.5 12 8.5 7 12.5 2 8.5z',
    'M17 4.5 22 8.5 17 12.5 12 8.5z',
    'M12 12.5l5 4-5 4-5-4z',
  ],
  globe: [
    'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17',
    'M3.5 12h17',
    'M12 3.5c2.4 2.4 2.4 14.6 0 17',
    'M12 3.5c-2.4 2.4-2.4 14.6 0 17',
  ],
  camera: [
    'M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z',
    'M12 12.2a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4',
  ],
  squares: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  apple: [
    'M12 7.6c1.4-2 4.4-2.1 5.4.5 1 2.6 0 6.1-2 8.1-1 1-2 .5-3.4.5s-2.4.5-3.4-.5c-2-2-3-5.5-2-8.1 1-2.6 4-2.5 5.4-.5z',
    'M12 7.6c0-2 1.4-3.6 3.4-3.6',
  ],
  cap: [
    'M2.5 9 12 5l9.5 4L12 13z',
    'M6.5 11v4.6c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9V11',
    'M21.5 9v5',
  ],
  plane: [
    'M12 3.2c.9 0 1.4 1.1 1.4 2.4v4.2l6.6 2.6v2L13.4 13v3.4l2.6 1.8v1.4L12 18.4l-4 1.2v-1.4l2.6-1.8V13L4 12.2v-2l6.6-2.6V5.6c0-1.3.5-2.4 1.4-2.4z',
  ],
  car: [
    'M4.5 16.5h15',
    'M6 16.5 7.6 11h8.8l1.6 5.5',
    'M8 18.5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8',
    'M16 18.5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8',
  ],
  cube: ['M12 3.2 20.5 8v8L12 20.8 3.5 16V8z', 'M3.5 8 12 12.8 20.5 8', 'M12 12.8v8'],
  play: [
    'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17',
    'm10.2 8.8 5 3.2-5 3.2z',
  ],
  calendar: ['M4 6.5h16v13.5H4z', 'M4 10.5h16', 'M8.5 4v4', 'M15.5 4v4'],
  mapPin: [
    'M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z',
    'M12 7.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2',
  ],
  terminal: [
    'M3.5 6A2 2 0 0 1 5.5 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
    'M7.5 9.5 10.5 12l-3 2.5',
    'M12.5 14.5h4.5',
  ],
  dribbble: [
    'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17',
    'M5 8.5c4 2 9 2.5 13.5 1',
    'M7 17.5c2.5-4 6-6.5 10-7.5',
  ],
  link: [
    'M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4',
    'M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4',
  ],
};

/**
 * Aturan pencocokan ikon.
 * `hosts` dicocokkan persis (atau sebagai subdomain), `keywords` dicocokkan
 * sebagai bagian dari hostname/nama link.
 */
const SITE_ICON_RULES = [
  { icon: 'mail', hosts: ['mail.google.com'], keywords: ['gmail'] },
  { icon: 'drive', hosts: ['drive.google.com'], keywords: ['google drive'] },
  { icon: 'document', hosts: ['docs.google.com'], keywords: ['google docs'] },
  { icon: 'calendar', hosts: ['calendar.google.com'], keywords: ['google calendar'] },
  { icon: 'mapPin', hosts: ['maps.google.com'], keywords: ['google maps'] },
  { icon: 'play', hosts: ['play.google.com'], keywords: ['play store', 'playstore'] },
  { icon: 'search', keywords: ['google', 'yandex', 'duckduckgo', 'bing'] },
  { icon: 'youtube', keywords: ['youtube', 'youtu.be'] },
  { icon: 'github', keywords: ['github', 'gitlab', 'bitbucket', 'codeberg'] },
  { icon: 'chat', keywords: ['openai', 'chatgpt', 'anthropic', 'claude', 'gemini', 'perplexity'] },
  { icon: 'x', hosts: ['x.com', 'twitter.com'], keywords: ['twitter'] },
  { icon: 'facebook', keywords: ['facebook', 'fb.com', 'meta.com'] },
  { icon: 'instagram', keywords: ['instagram'] },
  { icon: 'linkedin', keywords: ['linkedin'] },
  { icon: 'reddit', keywords: ['reddit'] },
  { icon: 'music', keywords: ['tiktok'] },
  { icon: 'telegram', keywords: ['telegram', 't.me'] },
  { icon: 'whatsapp', keywords: ['whatsapp', 'wa.me'] },
  { icon: 'spotify', keywords: ['spotify'] },
  { icon: 'netflix', keywords: ['netflix'] },
  { icon: 'bag', keywords: ['amazon', 'aws'] },
  { icon: 'bagAlt', keywords: ['shopify'] },
  { icon: 'video', keywords: ['zoom.us'] },
  { icon: 'hash', keywords: ['slack'] },
  { icon: 'controller', keywords: ['discord'] },
  { icon: 'shapes', keywords: ['figma'] },
  { icon: 'document', keywords: ['notion'] },
  { icon: 'circles', keywords: ['medium.com'] },
  { icon: 'pin', keywords: ['pinterest'] },
  { icon: 'gamepad', keywords: ['twitch', 'steampowered', 'epicgames'] },
  { icon: 'diamonds', keywords: ['dropbox'] },
  { icon: 'globe', keywords: ['wikipedia', 'wikimedia'] },
  { icon: 'camera', keywords: ['unsplash', 'picsum'] },
  { icon: 'squares', keywords: ['microsoft', 'office.com', 'outlook'] },
  { icon: 'apple', keywords: ['apple.com', 'icloud'] },
  { icon: 'cap', keywords: ['udemy', 'coursera', 'skillacademy'] },
  { icon: 'terminal', keywords: ['stackoverflow', 'codepen', 'dev.to', 'devto', 'replit', 'npmjs', 'vercel', 'netlify'] },
  { icon: 'dribbble', keywords: ['dribbble', 'behance'] },
  { icon: 'cube', keywords: ['tokopedia', 'blibli', 'bukalapak'] },
  { icon: 'bagAlt', keywords: ['shopee'] },
  { icon: 'plane', keywords: ['traveloka', 'airasia', 'garuda'] },
  { icon: 'car', keywords: ['grab.com', 'gojek'] },
];

/** Menentukan nama ikon yang cocok untuk sebuah link. */
const detectSiteIcon = (link) => {
  const host = getHostname(link.url).toLowerCase();
  const name = link.name.toLowerCase();

  for (const rule of SITE_ICON_RULES) {
    if (rule.hosts && rule.hosts.some((item) => host === item || host.endsWith(`.${item}`))) {
      return rule.icon;
    }

    if (
      rule.keywords &&
      rule.keywords.some((keyword) => host.includes(keyword) || name.includes(keyword))
    ) {
      return rule.icon;
    }
  }

  return null;
};

/** Membuat elemen SVG ikon situs (tanpa innerHTML). */
const createSiteIcon = (iconName) => {
  const paths = SITE_ICON_PATHS[iconName];
  if (!paths) {
    return null;
  }

  const svgElement = document.createElementNS(SVG_NAMESPACE, 'svg');
  svgElement.setAttribute('viewBox', '0 0 24 24');
  svgElement.setAttribute('class', 'site-icon');
  svgElement.setAttribute('aria-hidden', 'true');
  svgElement.setAttribute('focusable', 'false');

  paths.forEach((pathData) => {
    const pathElement = document.createElementNS(SVG_NAMESPACE, 'path');
    pathElement.setAttribute('d', pathData);
    svgElement.appendChild(pathElement);
  });

  return svgElement;
};

/** Warna avatar fallback ditentukan dari nama domain agar konsisten. */
const getAvatarHue = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return hash;
};

const renderLinks = () => {
  const fragment = document.createDocumentFragment();

  state.links.forEach((link) => {
    const item = createElement('li', 'link-item');

    const anchor = createElement('a', 'link-anchor');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.title = link.url;

    const avatar = createElement('span', 'link-avatar');
    avatar.setAttribute('aria-hidden', 'true');

    const siteIcon = createSiteIcon(detectSiteIcon(link));
    if (siteIcon) {
      avatar.classList.add('has-icon');
      avatar.appendChild(siteIcon);
    } else {
      const host = getHostname(link.url);
      avatar.textContent = link.name.charAt(0).toUpperCase() || '?';
      avatar.style.setProperty('--avatar-hue', String(getAvatarHue(host)));
    }

    const meta = createElement('span', 'link-meta');
    meta.append(
      createElement('span', 'link-name', link.name),
      createElement('span', 'link-host', getHostname(link.url)),
    );

    anchor.append(avatar, meta);

    const deleteButton = createElement('button', 'icon-btn', 'Hapus');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete-link';
    deleteButton.dataset.id = link.id;
    deleteButton.setAttribute('aria-label', `Hapus link: ${link.name}`);

    item.append(anchor, deleteButton);
    fragment.append(item);
  });

  dom.linkList.replaceChildren(fragment);
  dom.linkEmpty.hidden = state.links.length > 0;
};

const handleAddLink = (event) => {
  event.preventDefault();

  const name = dom.linkName.value.trim().slice(0, MAX_LINK_NAME_LENGTH);
  const rawUrl = dom.linkUrl.value.trim().slice(0, MAX_LINK_URL_LENGTH);

  if (!name) {
    showLinkError('Nama link tidak boleh kosong.', dom.linkName);
    dom.linkName.focus();
    return;
  }

  if (!rawUrl) {
    showLinkError('URL tidak boleh kosong.', dom.linkUrl);
    dom.linkUrl.focus();
    return;
  }

  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) {
    showLinkError('URL tidak valid. Gunakan alamat http:// atau https://.', dom.linkUrl);
    dom.linkUrl.focus();
    dom.linkUrl.select();
    return;
  }

  state.links.push({
    id: createId(),
    name,
    url: normalizedUrl,
  });

  clearLinkError();
  dom.linkForm.reset();
  persistLinks();
  renderLinks();
  dom.linkName.focus();
};

const deleteLink = (linkId) => {
  state.links = state.links.filter((link) => link.id !== linkId);
  clearLinkError();
  persistLinks();
  renderLinks();
};

const handleLinkListClick = (event) => {
  const deleteButton = event.target.closest('button[data-action="delete-link"]');
  if (!deleteButton) {
    return;
  }

  deleteLink(deleteButton.dataset.id);
};

/* ==========================================================================
   10. Initialization & event bindings
   ========================================================================== */
const cacheDomElements = () => {
  Object.assign(dom, {
    app: document.getElementById('app'),
    currentTime: document.getElementById('currentTime'),
    currentDate: document.getElementById('currentDate'),
    greeting: document.getElementById('greeting'),
    editNameBtn: document.getElementById('editNameBtn'),
    nameForm: document.getElementById('nameForm'),
    nameInput: document.getElementById('nameInput'),
    cancelNameBtn: document.getElementById('cancelNameBtn'),
    themeToggle: document.getElementById('themeToggle'),
    themeLabel: document.getElementById('themeLabel'),
    themeIcon: document.getElementById('themeIcon'),

    timerCard: document.getElementById('timerCard'),
    timerText: document.getElementById('timerText'),
    timerProgress: document.getElementById('timerProgress'),
    timerStatus: document.getElementById('timerStatus'),
    timerMessage: document.getElementById('timerMessage'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resetBtn: document.getElementById('resetBtn'),

    todoForm: document.getElementById('todoForm'),
    todoInput: document.getElementById('todoInput'),
    todoError: document.getElementById('todoError'),
    todoList: document.getElementById('todoList'),
    todoEmpty: document.getElementById('todoEmpty'),
    todoCount: document.getElementById('todoCount'),
    clearAllBtn: document.getElementById('clearAllBtn'),

    taskModal: document.getElementById('taskModal'),
    taskEditForm: document.getElementById('taskEditForm'),
    taskEditInput: document.getElementById('taskEditInput'),
    taskEditError: document.getElementById('taskEditError'),
    taskModalClose: document.getElementById('taskModalClose'),
    taskEditCancel: document.getElementById('taskEditCancel'),

    clearAllModal: document.getElementById('clearAllModal'),
    clearAllModalMessage: document.getElementById('clearAllModalMessage'),
    clearAllModalClose: document.getElementById('clearAllModalClose'),
    clearAllCancel: document.getElementById('clearAllCancel'),
    clearAllConfirm: document.getElementById('clearAllConfirm'),

    linkForm: document.getElementById('linkForm'),
    linkName: document.getElementById('linkName'),
    linkUrl: document.getElementById('linkUrl'),
    linkError: document.getElementById('linkError'),
    linkList: document.getElementById('linkList'),
    linkEmpty: document.getElementById('linkEmpty'),
  });
};

const bindEvents = () => {
  // Clock, name & theme
  dom.editNameBtn.addEventListener('click', openNameEditor);
  dom.nameForm.addEventListener('submit', handleNameSubmit);
  dom.cancelNameBtn.addEventListener('click', () => {
    closeNameEditor();
    dom.editNameBtn.focus();
  });
  dom.nameInput.addEventListener('keydown', handleNameKeydown);
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Focus timer
  dom.startBtn.addEventListener('click', startTimer);
  dom.stopBtn.addEventListener('click', stopTimer);
  dom.resetBtn.addEventListener('click', resetTimer);

  // To-do list (event delegation)
  dom.todoForm.addEventListener('submit', handleAddTask);
  dom.todoInput.addEventListener('input', clearTodoError);
  dom.todoList.addEventListener('click', handleTodoListClick);
  dom.todoList.addEventListener('change', handleTodoListChange);
  dom.clearAllBtn.addEventListener('click', openClearAllModal);

  // Modal edit task (overlay)
  dom.taskEditForm.addEventListener('submit', saveTaskFromModal);
  dom.taskEditCancel.addEventListener('click', closeTaskModal);
  dom.taskModalClose.addEventListener('click', closeTaskModal);
  dom.taskEditInput.addEventListener('input', clearTaskEditError);
  dom.taskModal.addEventListener('mousedown', (event) => {
    // Klik pada area gelap (backdrop) menutup modal.
    if (event.target === dom.taskModal) {
      closeTaskModal();
    }
  });

  // Modal konfirmasi hapus semua task (overlay)
  dom.clearAllCancel.addEventListener('click', closeClearAllModal);
  dom.clearAllModalClose.addEventListener('click', closeClearAllModal);
  dom.clearAllConfirm.addEventListener('click', confirmClearAllTasks);
  dom.clearAllModal.addEventListener('mousedown', (event) => {
    if (event.target === dom.clearAllModal) {
      closeClearAllModal();
    }
  });

  // Keyboard: Escape menutup overlay yang aktif, Tab tidak keluar dari overlay.
  document.addEventListener('keydown', (event) => {
    const activeOverlay = getOpenOverlay();
    if (!activeOverlay) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (activeOverlay === dom.taskModal) {
        closeTaskModal();
      } else {
        closeClearAllModal();
      }
      return;
    }

    trapOverlayFocus(activeOverlay, event);
  });

  // Quick links (event delegation)
  dom.linkForm.addEventListener('submit', handleAddLink);
  dom.linkName.addEventListener('input', clearLinkError);
  dom.linkUrl.addEventListener('input', clearLinkError);
  dom.linkList.addEventListener('click', handleLinkListClick);

  // Sinkronkan timer setelah tab kembali aktif (interval bisa di-throttle browser).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.timer.endTimestamp !== null) {
      tickTimer();
    }
  });
};

const init = () => {
  cacheDomElements();

  // Muat data dari Local Storage lalu bersihkan data yang tidak valid.
  state.tasks = loadTasks();
  state.links = loadLinks();

  const storedName = getFromStorage(STORAGE_KEYS.name, '');
  state.name = typeof storedName === 'string' ? storedName.trim().slice(0, MAX_NAME_LENGTH) : '';

  state.theme = setTheme(getInitialTheme());

  bindEvents();

  renderClock();
  renderTimer();
  renderTodos();
  renderLinks();

  // Jam diperbarui setiap detik.
  window.setInterval(renderClock, 1000);
};

document.addEventListener('DOMContentLoaded', init);
````
