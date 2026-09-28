# FLEXIBOOK ENGINE - BỘ KỊCH BẢN TRẢ LỜI PHỎNG VẤN & MẪU CV CHUYÊN SÂU

> **Dành cho:** Ứng viên Backend Developer (Node.js / NestJS / TypeScript).  
> **Mục tiêu:** Giúp bạn tự tin giải trình mọi quyết định kiến trúc, "flex" kỹ thuật giải quyết Race Condition, Background Queues và Database Optimization trước nhà tuyển dụng.

---

## 📌 MẪU TRÌNH BÀY DỰ ÁN TRONG CV (RESUME BULLETS)

### **FlexiBook – Enterprise Service Booking & Appointment Engine**
* **Vai trò:** Backend Developer (Solo Project)
* **Tech Stack:** Node.js, NestJS, TypeScript, PostgreSQL, Prisma ORM, Redis, BullMQ, ReactJS, Docker.
* **Live Demo:** `https://flexibook-api.onrender.com` | **API Docs:** `https://flexibook-api.onrender.com/api/docs`
* **GitHub:** `https://github.com/Ngoc2204/FlexiBook`

#### Thành tựu kỹ thuật chính:
* Thiết kế kiến trúc **Modular Clean Architecture** trên NestJS 12 với 100% type-safety (TypeScript strict mode) và phục vụ kiến trúc đa ngành (White-label & Dynamic Terminology: Spa, Salon, Clinic).
* Giải quyết triệt để vấn đề **Race Condition / Double-booking** bằng kỹ thuật **Distributed Mutex Lock trên Redis** kết hợp **Database Transaction (ACID)**, đảm bảo không thể xảy ra trùng ca làm việc khi hàng trăm request tới đồng thời.
* Xây dựng thuật toán **Dynamic Time-Slot Engine ($O(N) < 30ms$)** tự động đối chiếu ca làm việc theo tuần (`StaffSchedule`), độ dài dịch vụ (`durationMin`) và loại trừ lịch bận trong thời gian thực.
* Tách biệt tác vụ I/O nặng (thông báo Telegram, nhắc lịch tự động) qua **BullMQ + Redis**, giúp API đặt lịch phản hồi siêu tốc dưới **50ms** kèm cơ chế retry 3 lần (`exponential backoff`).
* Triển khai **Cronjob Idempotent** quét tự động các lịch hẹn trước 2 giờ để kích hoạt thông báo nhắc hẹn, giảm tỷ lệ bùng lịch thực tế.
* Tích hợp Webhook **VietQR / SePay** tự động quét mã booking `FB-YYYY-XXXX` từ biến động số dư ngân hàng và chuyển trạng thái sang `CONFIRMED` tự động 100%.

---

## 🎤 TOP 5 CÂU HỎI PHỎNG VẤN HÓC BÚA & KỊCH BẢN TRẢ LỜI "ĂN ĐIỂM"

### ❓ Câu 1: "Em giải quyết bài toán Race Condition (Double-booking) khi 2 khách hàng cùng bấm đặt 1 khung giờ cùng lúc như thế nào?"
> **💡 Kịch bản trả lời:**
> "Dạ, trong các hệ thống đặt lịch hẹn, nếu chỉ dùng `SELECT` kiểm tra rồi mới `INSERT`, hệ thống sẽ gặp lỗi Race Condition khi 2 request đến gần như cùng một mili-giây (cả 2 đều thấy slot trống và cùng tạo 2 đơn trùng giờ cho 1 kỹ thuật viên).
> 
> Để xử lý triệt để, em áp dụng cơ chế **2 lớp bảo vệ (Two-layer Defense)**:
> 1. **Lớp 1 - Distributed Lock với Redis Mutex:**  
>    Trước khi thao tác DB, em tạo một lock key theo nhân viên và thời gian: `lock:booking:${staffId}:${startTime}` bằng lệnh nguyên tử `SET NX PX 5000` kèm một UUID token ngẫu nhiên. Nếu có request khác đang chiếm lock, request sau sẽ lập tức nhận lỗi `409 Conflict` thân thiện và không gây nghẽn database.
> 2. **Lớp 2 - Database Transaction ($transaction) & Double-check:**  
>    Sau khi lấy được lock, trong transaction em thực hiện double-check một lần nữa trong PostgreSQL để đảm bảo tính toàn vẹn tuyệt đối trước khi gọi `create()`.
> 3. **Giải phóng lock an toàn:**  
>    Em sử dụng **Lua Script** nguyên tử để giải phóng lock: Chỉ xóa key khi giá trị trong Redis đúng bằng UUID token của request đó, tránh trường hợp request chạy lâu làm hết hạn lock rồi vô tình xóa nhầm lock của request khác."

---

### ❓ Câu 2: "Tại sao em lại dùng BullMQ + Redis mà không gọi API Telegram trực tiếp ngay trong Controller?"
> **💡 Kịch bản trả lời:**
> "Dạ, việc gọi API bên thứ ba (như Telegram Bot API hay Zalo ZNS) là tác vụ mạng phụ thuộc vào đường truyền ngoài và có thể mất từ 300ms đến 2 giây, thậm chí bị Rate Limit (429 Too Many Requests). Nếu gọi đồng bộ:
> - Người dùng sẽ phải chờ xoay vòng trên màn hình rất lâu mới nhận được phản hồi đặt lịch.
> - Nếu mạng Telegram gặp sự cố, request đặt lịch của khách có thể bị lỗi oan trong khi đơn trong database đã được tạo.
> 
> Vì vậy, em áp dụng mô hình **Event-driven với BullMQ**:
> - Controller sau khi tạo booking trong DB chỉ mất **< 50ms** để trả về kết quả thành công cho người dùng.
> - Việc gửi tin nhắn được đóng gói thành Job đẩy vào hàng đợi `notifications`.
> - Worker của BullMQ chạy nền độc lập, có cấu hình **tự động thử lại 3 lần với exponential backoff** (thử lại sau 2s, 4s, 8s) nếu gặp lỗi mạng, đảm bảo thông báo luôn được gửi đến chủ tiệm mà không làm nghẽn luồng chính."

---

### ❓ Câu 3: "Thuật toán tính toán Time-Slot Engine của em tối ưu thế nào để đạt độ trễ dưới 30ms?"
> **💡 Kịch bản trả lời:**
> "Dạ, để tính các khung giờ trống linh hoạt cho nhiều ngành:
> 1. Em chuẩn hóa toàn bộ giờ làm việc (`startTime`, `endTime` của thợ) và thời gian hẹn về đơn vị **số phút trong ngày (Minutes from midnight, từ 0 đến 1440)** để tính toán bằng số nguyên thay vì thao tác đối tượng Date phức tạp.
> 2. Em lấy các đơn đặt lịch trong ngày của thợ đó (chỉ lấy các đơn `status != CANCELLED`), biến đổi thành các khoảng bận `[startMin, endMin]`.
> 3. Em cho một vòng lặp chạy từ giờ mở ca đến hết ca với bước nhảy `slotInterval` (15, 30 hoặc 60 phút). Tại mỗi slot tiềm năng `[t, t + duration]`, em kiểm tra va chạm bằng điều kiện:  
>    `Math.max(t, booked.start) < Math.min(t + duration, booked.end)`
> 4. Nhờ thao tác mảng trên bộ nhớ RAM với độ phức tạp $O(N)$ (trong đó N là số booking trong ngày, thường chỉ 10-30 đơn/thợ), thuật toán thực thi cực nhanh chỉ trong khoảng 15-25ms."

---

### ❓ Câu 4: "Kiến trúc Dynamic Terminology & White-label của hệ thống được em tổ chức ra sao?"
> **💡 Kịch bản trả lời:**
> "Dạ, để phần mềm có thể bán/cho thuê cho nhiều ngành khác nhau (Barber, Spa chăm sóc da, Nha khoa, Phòng khám) mà không phải sửa code core:
> - Em thiết kế model `BusinessSetting` lưu các nhãn động: `staffLabel` (Thợ cắt tóc / Kỹ thuật viên / Bác sĩ), `serviceLabel` (Mẫu tóc / Gói trị liệu / Gói khám), `bookingLabel`, cùng các cấu hình tiền cọc và bước nhảy thời gian.
> - Toàn bộ các thông báo gửi qua Telegram/Zalo, thông tin trả về trên API và giao diện ReactJS đều tự động ánh xạ theo các nhãn này.
> - Khi một cơ sở Spa đăng ký, họ chỉ cần đổi `industry` và nhãn hiển thị là toàn bộ hệ thống biến đổi ngôn ngữ theo chuyên ngành của họ ngay lập tức."

---

### ❓ Câu 5: "Làm thế nào để Cronjob nhắc lịch tự động trước 2 tiếng không gửi tin nhắn trùng lặp (Idempotency)?"
> **💡 Kịch bản trả lời:**
> "Dạ, Cronjob của em được thiết lập chạy định kỳ mỗi 10 phút để quét các đơn có `status = CONFIRMED` và `startTime` nằm trong cửa sổ thời gian `[now + 1h50m, now + 2h10m]`.
> 
> Để đảm bảo tính **Idempotent (không bao giờ nhắc 2 lần cho cùng 1 đơn)**:
> - Trước khi đẩy job vào queue, em kiểm tra trên Redis key: `reminder:sent:2h:${booking.id}`.
> - Nếu key chưa tồn tại, em ghi key đó lên Redis với TTL là 4 tiếng (`EX 14400`) rồi mới bắn job nhắc hẹn vào BullMQ.
> - Nếu trong lần quét tiếp theo sau 10 phút, đơn đó vẫn còn nằm trong dải thời gian quét, Redis đã có key nên hệ thống sẽ tự động bỏ qua, bảo đảm khách hàng không bao giờ bị spam tin nhắn."
