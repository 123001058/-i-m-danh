// Chức năng đăng nhập trang quản lý (index.html)
const ADMIN_PWD = '272005';
function openLogin(){ document.getElementById('modalBg').classList.add('show'); }
function closeLogin(){ document.getElementById('modalBg').classList.remove('show'); }
function submitLogin(){
  if (document.getElementById('pwdInput').value === ADMIN_PWD){
    sessionStorage.setItem('admin_auth', '1');
    location.href = 'admin.html';
  } else { document.getElementById('errBox').innerText = 'Sai mật khẩu!'; }
}
