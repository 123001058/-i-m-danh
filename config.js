const CONFIG = {
  GOOGLE_SHEET_API: 'https://script.google.com/macros/s/AKfycbwaUmtVH48hopG7Go17aAYkKrzl0MZpJfuNmZRFdKRtOwNm0drqZ-SQ6Y5J7n0NWxhtXg/exec',
  BASE_URL: 'https://123001058.github.io/DIEM_DANH',
  CATEGORIES: ['Thiết kế', 'Cơ khí', 'Điện', 'Lập trình']
};

let validStudents = [];

async function loadStudents() {
  try {
    const res = await fetch('./students.json?t=' + Date.now());
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
    const res = await fetch(`${CONFIG.GOOGLE_SHEET_API}?action=getStatus&t=${Date.now()}`);
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

async function saveSessionStatus(status) {
  try {
    await fetch(CONFIG.GOOGLE_SHEET_API, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'updateStatus', ...status })
    });
  } catch (e) {
    console.warn('[saveSessionStatus]', e);
  }
}

async function fetchAttendance(sessionName) {
  try {
    const url = `${CONFIG.GOOGLE_SHEET_API}?action=getAttendance&phien=${encodeURIComponent(sessionName)}&t=${Date.now()}`;
    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data.records) ? data.records : [];
  } catch (e) {
    console.warn('[fetchAttendance]', e);
    return [];
  }
}
