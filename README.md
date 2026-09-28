# FlexiBook Engine 🚀
### Enterprise Service Booking & Appointment Engine (Modular Clean Architecture)

> **Mục tiêu:** Hệ thống đặt lịch hẹn dịch vụ động (Dynamic Terminology & White-label) phục vụ các cơ sở Spa, Salon tóc, Nha khoa, Phòng khám tại Việt Nam. Xử lý triệt để bài toán **Double-booking (Race Condition)** bằng **Redis Distributed Lock**, kiến trúc hướng sự kiện với **BullMQ** và tích hợp thanh toán tự động qua **VietQR / SePay Webhook**.

---

## 🛠 Tech Stack
* **Runtime & Framework:** Node.js (v24 LTS) + NestJS (v12)
* **Ngôn ngữ:** TypeScript 5+ (Strict Mode: `strict: true`)
* **Cơ sở dữ liệu:** PostgreSQL 16 (Transactions, ACID, JSONB)
* **ORM:** Prisma ORM v6
* **Bộ nhớ đệm & Queue:** Redis 7 + BullMQ
* **Tài liệu API:** Swagger / OpenAPI (`@nestjs/swagger`)
* **Bảo mật:** JWT Passport, BCrypt password hashing, RBAC Guards, Validation Pipes, Unified Exception Filter
* **Tích hợp bên thứ ba:**
  * **Telegram Bot API:** Gửi thông báo tức thì khi có lịch hẹn mới / tiền cọc.
  * **VietQR / SePay Webhook:** Tự động đối soát và xác thực tiền cọc qua biến động số dư ngân hàng.

---

## 🏛 Kiến trúc thư mục (Clean Modular Architecture)

```
src/
├── common/
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── filters/          # HttpExceptionFilter (Chuẩn hóa format lỗi)
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── interceptors/     # TransformResponseInterceptor, LoggingInterceptor
│   ├── prisma/           # PrismaService & PrismaModule (Global)
│   └── redis/            # RedisService (Distributed Lock Mutex) & RedisModule (Global)
├── config/               # Configuration factory & Biến môi trường
├── modules/
│   ├── auth/             # Xác thực JWT, đăng ký, đăng nhập, phân quyền RBAC
│   ├── settings/         # Quản lý White-label config & Dynamic Terminology
│   ├── services/         # CRUD danh mục, dịch vụ, quản lý giá và thời lượng
│   ├── staff/            # Quản lý thợ/bác sĩ, thiết lập ca làm việc hàng tuần
│   ├── time-slots/       # Dynamic Time-slot Engine tính khung giờ trống O(N) < 30ms
│   ├── bookings/         # Xử lý đặt lịch + Redis Mutex Lock chống Double-booking
│   ├── payments/         # VietQR & SePay Webhook đối soát cọc tự động
│   └── notifications/    # BullMQ Queues + Telegram Worker tự động retry 3 lần
├── app.module.ts
└── main.ts
```

---

## ⚡ Điểm nhấn kỹ thuật nổi bật (CV Highlights)

### 1. Thuật toán Dynamic Time-Slot Engine ($O(N) < 30ms$)
* Tự động phân tích ca làm việc theo ngày trong tuần của nhân viên (`StaffSchedule`).
* Chia nhỏ thời gian làm việc thành các slot phù hợp với `durationMin` của dịch vụ và bước nhảy `slotInterval` (15, 30, 45, 60 phút) của từng cơ sở.
* Loại bỏ tất cả khung giờ trùng với các lịch hẹn đang hoạt động (`status != CANCELLED`).
* Lọc bỏ các khung giờ trong quá khứ nếu đặt trong ngày hiện tại.

### 2. Xử lý Trùng lịch (Concurrency / Double-Booking Prevention)
* Khi nhiều khách hàng cùng thao tác đặt 1 slot cùng lúc, hệ thống sử dụng **Redis Distributed Lock (Mutex)** với mã token nguyên tử:
  `lockKey = lock:booking:${dto.staffId}:${dto.startTime}`
* Kết hợp **Database Transaction (Prisma $transaction)** để double-check tính sẵn sàng của slot trước khi tạo bản ghi.
* Giải phóng lock an toàn bằng Lua Script nguyên tử.

### 3. Background Jobs tách biệt I/O với BullMQ
* Request đặt lịch và webhook thanh toán phản hồi ngay lập tức trong **< 50ms**.
* Các tác vụ gửi tin nhắn Telegram, tạo QR được đẩy vào Queue `notifications`.
* Worker tự động thử lại 3 lần (`exponential backoff`) nếu gặp sự cố mạng hoặc Telegram Rate Limiting.

---

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
* Node.js v20+ hoặc v24+
* Docker & Docker Compose (cho PostgreSQL & Redis)

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Sao chép file `.env.example` thành `.env` và điều chỉnh thông số:
```bash
cp .env.example .env
```

### 4. Khởi động PostgreSQL & Redis với Docker
```bash
docker compose up -d
```

### 5. Sinh Prisma Client & Migration
```bash
# Sinh mã type-safe Prisma Client
npx prisma generate

# Tạo migration cơ sở dữ liệu (khi PostgreSQL đã chạy)
npx prisma migrate dev --name init
```

### 6. Khởi chạy ứng dụng
```bash
# Chế độ phát triển (Hot-reload)
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

### 7. Chạy kiểm thử (Unit tests)
```bash
npm test
```

---

## 📑 Tài liệu API (Swagger OpenAPI)

Sau khi khởi chạy ứng dụng, truy cập vào đường dẫn sau để xem tài liệu Swagger tương tác trực tiếp:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

Tất cả các API trả về theo chuẩn format:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-10-01T09:00:00.000Z"
}
```
