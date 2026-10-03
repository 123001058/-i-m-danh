(function(){
  if (typeof window === 'undefined') return;
  const loc = window.location;
  const path = loc.pathname.substring(0, loc.pathname.lastIndexOf('/'));
  window.__DETECTED_BASE_URL__ = loc.origin + path;
})();

const CONFIG = {
  GOOGLE_SHEET_API: 'https://script.google.com/macros/s/AKfycbxPVBGjgRKEHEEVneZCswxfvWn0cx_UGmfEAgc0WQMwhUXq2FCdlTBZRXEf23MSUINRHw/exec',
  BASE_URL: window.__DETECTED_BASE_URL__,
  CATEGORIES: ['Thiết kế', 'Cơ khí', 'Điện', 'Lập trình'],
  FETCH_TIMEOUT: 10000
};

let validStudents = [];

async function fetchWithTimeout(url, opts = {}, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || CONFIG.FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', ...(opts.headers || {}) }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function loadStudents() {
  try {
    const res = await fetchWithTimeout('./students.json?t=' + Date.now() + '&_r=' + Math.random());
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
    const res = await fetchWithTimeout(
      `${CONFIG.GOOGLE_SHEET_API}?action=getStatus&t=${Date.now()}&_r=${Math.random()}`
    );
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
    const url = `${CONFIG.GOOGLE_SHEET_API}?action=getAttendance&phien=${encodeURIComponent(sessionName)}&t=${Date.now()}&_r=${Math.random()}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return Array.isArray(data.records) ? data.records : [];
  } catch (e) {
    console.warn('[fetchAttendance]', e);
    return [];
  }
}

async function postToGAS(payload) {
  const params = new URLSearchParams();
  params.set('data', JSON.stringify(payload));
  params.set('_r', Date.now() + '_' + Math.random());

  const url = CONFIG.GOOGLE_SHEET_API + '?' + params.toString();
  const res = await fetchWithTimeout(url, {}, 15000);

  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}
