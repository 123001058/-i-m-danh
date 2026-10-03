// Chức năng trang quản lý (admin.html)
let classStudents = [];
let recentCheckins = [];
let progressInterval = null, sessionTimer = null;
let secondsRemaining = 20, currentSessionId = null, isOpen = false, lastToken = null;

async function initAdmin(){
    if (sessionStorage.getItem('admin_auth') !== '1') location.replace('index.html');
    await loadStudents();
    classStudents = validStudents.map(s => ({ mssv: s.mssv, name: s.name, status: 'Chưa điểm danh', time: '-' }));

    refreshSessionStatus();

    // REALTIME: Tự cập nhật khi có bản ghi mới vào bảng attendance
    supabase.channel('changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, () => {
        if (isOpen && currentSessionId) pollAttendance();
    }).subscribe();
}

async function refreshSessionStatus(){
    // Khi vừa mở trang admin: nếu phiên cũ còn MỞ trong DB (vd lần trước tắt trình duyệt
    // mà quên bấm "Đóng phiên") thì tự đóng lại. Mỗi lần mở trang admin đều bắt đầu
    // phiên MỚI, không bao giờ hiện lại phiên cũ.
    const { data: openSession } = await supabase.from('sessions')
        .select('id').eq('is_open', true).limit(1).maybeSingle();
    if (openSession) {
        await supabase.from('sessions').update({ is_open: false }).eq('id', openSession.id);
    }
    stopSessionUI();
}

async function turnOn(){
    const name = document.getElementById('sessionName').value.trim();
    const refresh = Number(document.getElementById('qrRefreshTime').value);
    const duration = Number(document.getElementById('sessionDuration').value);
    if (!name) return alert('Nhập tên phiên!');
    if (isOpen) return alert('Đã có phiên đang mở. Bấm "Đóng phiên" trước khi mở phiên mới.');

    // Đóng mọi phiên cũ còn mở để tránh xung đột
    await supabase.from('sessions').update({ is_open: false }).eq('is_open', true);

    // Luôn TẠO MỚI một dòng session: mỗi phiên có id riêng,
    // danh sách điểm danh của phiên cũ sẽ không lẫn sang phiên mới
    const { data, error } = await supabase.from('sessions').insert({
        session_name: name, is_open: true, refresh_time: refresh, duration_min: duration, started_at: new Date().toISOString()
    }).select().single();

    if (error) {
        alert('Lỗi: ' + error.message + '\n\nKiểm tra bảng "sessions" trong Supabase: cột id phải tự sinh (uuid mặc định hoặc bigint identity).');
        return;
    }
    currentSessionId = data.id;
    startSessionUI(data);
}

async function turnOff(auto){
    if (!auto && !confirm('Đóng phiên?')) return;
    if (currentSessionId) await supabase.from('sessions').update({ is_open: false }).eq('id', currentSessionId);
    stopSessionUI();
}

function startSessionUI(st){
    isOpen = true;
    document.getElementById('dashboardArea').classList.add('show');
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('statusIndicator').className = 'status-badge status-on';
    document.getElementById('statusIndicator').innerHTML = '<span class="pulse"></span><span>Trạng thái: MỞ — ' + st.session_name + '</span>';

    const refresh = st.refresh_time || 20;
    const startedMs = new Date(st.started_at).getTime();
    const endsAt = startedMs + (st.duration_min * 60 * 1000);

    renderQR(refresh);
    pollAttendance();

    progressInterval = setInterval(() => {
        const now = Date.now();
        const cycleMs = refresh * 1000;
        const cycleEnd = (Math.floor(now / cycleMs) + 1) * cycleMs;
        secondsRemaining = Math.max(1, Math.ceil((cycleEnd - now) / 1000));
        if (Math.floor(now/cycleMs) !== lastToken) { lastToken = Math.floor(now/cycleMs); renderQR(refresh); }
        document.getElementById('secondsLeft').innerText = secondsRemaining + 's';
        document.getElementById('progressFill').style.width = (((cycleEnd - now)/cycleMs)*100) + '%';
    }, 250);

    sessionTimer = setInterval(() => {
        const left = Math.max(0, Math.floor((endsAt - Date.now())/1000));
        document.getElementById('sessionCountdown').innerText = fmtTime(left);
        if (left <= 0) turnOff(true);
    }, 1000);
}

function stopSessionUI(){
    isOpen = false;
    document.getElementById('dashboardArea').classList.remove('show');
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('statusIndicator').className = 'status-badge status-off';
    document.getElementById('statusIndicator').innerHTML = '<span>Trạng thái: ĐÓNG</span>';
    clearInterval(progressInterval); clearInterval(sessionTimer);
}

function renderQR(refresh){
    const token = Math.floor(Date.now() / (refresh * 1000));
    // QR phải chứa URL tuyệt đối vì camera điện thoại không mở được đường dẫn tương đối
    const base = window.__DETECTED_BASE_URL__ || window.location.origin;
    const url = `${base}/checkin.html?s=${currentSessionId}&t=${token}`;
    document.getElementById('qrCanvas').innerHTML = '';
    new QRCode(document.getElementById('qrCanvas'), { text: url, width: 220, height: 220 });
}

async function pollAttendance(){
    if (!currentSessionId) return;
    const { data: records } = await supabase.from('attendance').select('*').eq('session_id', currentSessionId).order('created_at', { ascending: false });
    if (!records) return;
    classStudents.forEach(s => { s.status = 'Chưa điểm danh'; s.time = '-'; });
    recentCheckins = [];
    records.forEach(r => {
        const st = classStudents.find(s => s.mssv === r.mssv);
        if (st) { st.status = 'Đã điểm danh'; st.time = new Date(r.created_at).toLocaleTimeString('vi-VN'); }
        recentCheckins.push({ name: r.full_name, time: new Date(r.created_at).toLocaleTimeString('vi-VN') });
    });
    renderStudents(); renderRecent(); updateStats();
}

function renderStudents(){
    document.getElementById('studentList').innerHTML = classStudents.map(s => `
        <tr>
            <td><div class="student-cell"><div class="avatar">${s.name[0]}</div><div>${s.name}</div></div></td>
            <td>${s.mssv}</td>
            <td>${s.status === 'Đã điểm danh' ? '<span style="color:#4e7a46;font-weight:700">✓ Xong</span>' : '<span style="color:#a44a44">— Chưa</span>'}</td>
            <td>${s.time}</td>
        </tr>`).join('');
}

function renderRecent(){
    document.getElementById('recentList').innerHTML = recentCheckins.slice(0,10).map(r => `
        <div class="recent-item"><div class="avatar">${r.name[0]}</div><div class="info"><div class="name">${r.name}</div><div class="time">${r.time}</div></div></div>
    `).join('') || '<div class="recent-empty">Chưa có ai điểm danh</div>';
}

function updateStats(){
    const total = classStudents.length;
    const present = classStudents.filter(s => s.status === 'Đã điểm danh').length;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('presentCount').innerText = present;
    document.getElementById('absentCount').innerText = total - present;
    const pct = total ? Math.round((present/total)*100) : 0;
    document.getElementById('ratePercent').innerText = pct + '%';
    document.getElementById('rateBar').style.width = pct + '%';
}

function filterTable(){
    const q = document.getElementById('searchStudent').value.toLowerCase();
    document.querySelectorAll('#studentList tr').forEach(tr => tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none');
}

function fmtTime(s){ return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function logout(){ sessionStorage.removeItem('admin_auth'); location.href = 'index.html'; }
function exportToExcel(){ alert('Hãy vào Supabase Table Editor -> Export CSV để lấy file chính xác nhất!'); }

initAdmin();
