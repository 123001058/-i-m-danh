// Cấu hình chung
const CONFIG = {
  GOOGLE_SHEET_API: 'https://script.google.com/macros/s/AKfycby6XDYL3besdFVXS6hD0IirL_IAyZbwXGEPakwzPf2I7DGCoifLeLpiT2b7JLjqrf2Xpg/exec',
  BASE_URL: 'https://123001058.github.io/DIEM_DANH',
  CATEGORIES: ['Thiết kế', 'Cơ khí', 'Điện', 'Lập trình']
};

let validStudents = [];

async function loadStudents() {
  try {
    const response = await fetch('./students.json');
    if (!response.ok) throw new Error('Không load được students.json');
    const data = await response.json();
    validStudents = Array.isArray(data.students) ? data.students : [];
    return validStudents;
  } catch (error) {
    console.error('Lỗi load students:', error);
    return [];
  }
}
