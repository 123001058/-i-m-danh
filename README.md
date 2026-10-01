# diem-danh
Điểm danh robocon 2027
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trang Điểm Danh</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f4f4f9; }
        .container { background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        input, button { padding: 10px; margin: 10px; font-size: 16px; width: 80%; }
        button { background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #218838; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Điểm Danh Trực Tuyến</h2>
        <form id="attendanceForm">
            <input type="text" id="studentId" placeholder="Nhập mã sinh viên / tên của bạn" required><br>
            <button type="submit">Xác nhận điểm danh</button>
        </form>
        <p id="message" style="color: green; font-weight: bold;"></p>
    </div>

    <script>
        document.getElementById('attendanceForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const studentId = document.getElementById('studentId').value;
            const time = new Date().toLocaleString();
            
            // Hiện thông báo thành công (Bạn có thể kết nối Google Sheets API ở đây để lưu dữ liệu)
            document.getElementById('message').innerText = `Cảm ơn ${studentId}, điểm danh thành công lúc ${time}!`;
            document.getElementById('studentId').value = '';
        });
    </script>
</body>
</html>
