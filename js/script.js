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
