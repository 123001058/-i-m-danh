const CONFIG = {
  GOOGLE_SHEET_API: 'https://script.google.com/macros/s/AKfycbxMN3KfzmnVNggqR6MVwQ4bsxc7MRrov1uj9XWqTVhOkQvCimLcQU7CkxFXu4JcYRsE/exec',
  BASE_URL: 'https://123001058.github.io/DIEM_DANH',
  CATEGORIES: ['Thiết kế', 'Cơ khí', 'Điện', 'Lập trình'],
  FETCH_TIMEOUT: 10000
};

let validStudents = [];

async function fetchWithTimeout(url, opts = {}, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || CONFIG.FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadStudents() {
  try {
    const res = await fetchWithTimeout('./students.json?t=' + Date.now());
    if (!res.ok) throw new Error('Không load được students.json');
    const data = await res.json();
    validStudents = Array.isArray(data.students) ? data.students : [];
    return validStudents;
  } catch (e) {
    console.error('[loadStudents]', e);
    validStudents = [];
    return [];
  }
}

async function loadSessionStatus() {
  try {
    const res = await fetchWithTimeout(`${CONFIG.GOOGLE_SHEET_API}?action=getStatus&t=${Date.now()}`);
    const data = await res.json();
    return {
      isOpen: !!data.isOpen,
      session: data.session || '',
      refresh: data.refresh || 20,
      startedAt: data.startedAt || null,
      durationMin: data.durationMin || 5
    };
  } catch (e) {
    console.warn('[loadSessionStatus]', e);
    return { isOpen: false, session: '', refresh: 20, startedAt: null, durationMin: 5 };
  }
}

async function fetchAttendance(sessionName) {
  try {
    const url = `${CONFIG.GOOGLE_SHEET_API}?action=getAttendance&phien=${encodeURIComponent(sessionName)}&t=${Date.now()}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return Array.isArray(data.records) ? data.records : [];
  } catch (e) {
    console.warn('[fetchAttendance]', e);
    return [];
  }
}

/* ============ POST QUA GET — ĐƠN GIẢN & TIN CẬY ============ */
async function postToGAS(payload) {
  const params = new URLSearchParams();
  params.set('data', JSON.stringify(payload));
  const url = CONFIG.GOOGLE_SHEET_API + '?' + params.toString();

  console.log('[postToGAS] URL length:', url.length);

  const res = await fetchWithTimeout(url, {}, 15000);
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const data = await res.json();
  console.log('[postToGAS] Response:', data);
  return data;
}
