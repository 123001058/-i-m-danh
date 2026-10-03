// Chức năng trang điểm danh sinh viên (checkin.html)
let currentSessionId = '';
let currentRefresh = 20;
let sessionToken = null;
let deviceId = '';
let sessionStatus = { is_open: false };

function getDeviceId(){
  let id = localStorage.getItem('device_id');
  if (!id){
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('device_id', id);
  }
  return id;
}
function showBadge(type, text){
  const b = document.getElementById('badge');
  b.className = 'badge show ' + type;
  b.innerHTML = text;
}
function hideBadge(){ document.getElementById('badge').className = 'badge'; }
function showLoader(v){ document.getElementById('loader').classList.toggle('show', !!v); }
function setBtnDisabled(v){ document.getElementById('btnCheckin').disabled = !!v; }

async function init(){
  deviceId = getDeviceId();

  const catSel = document.getElementById('category');
  (CONFIG.CATEGORIES || []).forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });

  const url = new URL(location.href);
  const qrSession = url.searchParams.get('s');
  const qrToken = url.searchParams.get('t');

  if (qrToken) sessionToken = Number(qrToken);
  if (qrSession) currentSessionId = qrSession;

  await loadStudents();
  await refreshStatus();
  setInterval(refreshStatus, 10000);
}

async function refreshStatus(){
  // Chỉ lấy phiên ĐANG MỞ mới nhất, bỏ qua mọi phiên cũ đã đóng
  const { data, error } = await supabase.from('sessions')
      .select('*').eq('is_open', true)
      .order('started_at', { ascending: false }).limit(1).maybeSingle();
  const box = document.getElementById('sessionInfo');
  if (error) {
      console.error('[refreshStatus]', error);
      box.innerHTML = 'Lỗi kết nối server: ' + error.message;
      return;
  }
  if (!data) {
      sessionStatus = { is_open: false };
      box.innerHTML = '<b>Chưa có phiên điểm danh nào đang mở.</b>';
      return;
  }
  // Nếu sinh viên mở bằng mã QR của phiên cũ (đã đóng) => từ chối
  if (currentSessionId && String(data.id) !== String(currentSessionId)) {
      sessionStatus = { is_open: false };
      box.innerHTML = '<b>Phiên trong mã QR đã kết thúc.</b><br>Vui lòng quét lại mã mới nhất.';
      return;
  }
  currentSessionId = String(data.id);
  sessionStatus = data;
  currentRefresh = data.refresh_time || 20;
  box.innerHTML = `<b>Phiên đang mở:</b> ${data.session_name}<br>QR đổi mỗi <b>${currentRefresh}s</b>`;
}

async function doCheckin(){
  hideBadge();

  if (!sessionStatus.is_open){
    showBadge('err', 'Phiên điểm danh hiện đang ĐÓNG. Vui lòng quét lại mã QR.');
    return;
  }

  const mssv = document.getElementById('mssv').value.trim();
  const category = document.getElementById('category').value;

  if (!mssv){
    showBadge('err', 'Vui lòng nhập MSSV!');
    document.getElementById('mssv').focus();
    return;
  }
  if (!category){
    showBadge('err', 'Vui lòng chọn Lĩnh vực!');
    document.getElementById('category').focus();
    return;
  }

  const stu = validStudents.find(s => String(s.mssv).trim() === mssv);
  if (!stu){
    showBadge('err', 'MSSV không có trong danh sách lớp!');
    return;
  }

  // Check token chống gian lận
  if (sessionToken !== null && !isNaN(sessionToken)){
    const cycleMs = currentRefresh * 1000;
    const nowMs = Date.now();
    const tokenStartMs = sessionToken * cycleMs;
    const tokenEndMs = tokenStartMs + cycleMs;
    const TOL = 60000; // 60s dung sai

    if (nowMs < tokenStartMs - TOL || nowMs > tokenEndMs + TOL){
      showBadge('err', 'Mã QR đã hết hạn, vui lòng quét lại mã mới nhất');
      return;
    }
  }

  setBtnDisabled(true);
  showLoader(true);

  try {
    // 1. Kiểm tra trùng MSSV trong phiên này
    const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', currentSessionId)
        .eq('mssv', mssv)
        .maybeSingle();

    if (existing) {
        showLoader(false);
        setBtnDisabled(false);
        showBadge('info', 'Bạn đã điểm danh phiên này rồi.');
        return;
    }

    // 2. Kiểm tra trùng thiết bị (Anti-cheat)
    const { data: deviceUsed } = await supabase
        .from('attendance')
        .select('mssv')
        .eq('session_id', currentSessionId)
        .eq('device_id', deviceId)
        .maybeSingle();

    if (deviceUsed) {
        showLoader(false);
        setBtnDisabled(false);
        showBadge('err', `Thiết bị này đã được dùng để điểm danh cho MSSV ${deviceUsed.mssv}`);
        return;
    }

    // 3. Lưu vào Supabase
    const { error: insertError } = await supabase
        .from('attendance')
        .insert([
            {
                session_id: currentSessionId,
                mssv: mssv,
                full_name: stu.name,
                category: category,
                note: document.getElementById('note').value.trim(),
                device_id: deviceId
            }
        ]);

    showLoader(false);
    setBtnDisabled(false);

    if (insertError) {
        showBadge('err', 'Lỗi: ' + insertError.message);
    } else {
        showBadge('ok', `✓ Điểm danh thành công!<br>${stu.name} — ${mssv}`);
        document.getElementById('mssv').value = '';
        document.getElementById('note').value = '';
    }

  } catch (e){
    showLoader(false);
    setBtnDisabled(false);
    showBadge('err', 'Lỗi kết nối: ' + e.message);
  }
}

init();
