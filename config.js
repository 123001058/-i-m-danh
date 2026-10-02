const CONFIG = {
  GOOGLE_SHEET_API: 'https://script.google.com/macros/s/AKfycbyYiq-_SwAcTPj2JJGVwGxf9T8K-RnYXtaLMkSxw5UHlCyrH9qLwR1cfizBB_88WyapLg/exec',
  BASE_URL: 'https://123001058.github.io/DIEM_DANH',
  CATEGORIES: ['Thiết kế', 'Cơ khí', 'Điện', 'Lập trình'],
  FETCH_TIMEOUT: 8000,
  POST_TIMEOUT: 12000
};

let validStudents = [];

/* ---------- Fetch có timeout ---------- */
async function fetchWithTimeout(url, opts = {}, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || CONFIG.FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Load sinh viên ---------- */
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

/* ---------- Đọc trạng thái phiên ---------- */
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

/* ---------- Lấy danh sách đã điểm danh ---------- */
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

/* ---------- POST qua iframe — đọc được response thật ---------- */
function postToGAS(payload) {
  return new Promise((resolve, reject) => {
    const iframeName = 'gas_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = CONFIG.GOOGLE_SHEET_API + '?source=iframe';
    form.target = iframeName;
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(payload);
    form.appendChild(input);
    document.body.appendChild(form);

    let done = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      setTimeout(() => {
        try { form.remove(); } catch(e) {}
        try { iframe.remove(); } catch(e) {}
      }, 500);
    };

    const onMessage = (e) => {
      if (done) return;
      try {
        const result = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (result && result.status) {
          done = true;
          cleanup();
          resolve(result);
        }
      } catch (err) {}
    };

    window.addEventListener('message', onMessage);
    form.submit();

    setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        reject(new Error('GAS timeout'));
      }
    }, CONFIG.POST_TIMEOUT);
  });
}
