# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & LỘ TRÌNH DỰ ÁN (NESTJS + TYPESCRIPT)

**Tên dự án đề xuất:** `FlexiBook Engine` (Modular Service Booking & Appointment System)  
**Mục tiêu kép:** 
1. **Thương mại hóa:** Đóng gói bán/cho thuê cho các cơ sở Spa, Salon tóc, Nha khoa, Phòng khám tại Việt Nam.
2. **Nâng tầm CV:** Dự án chuẩn mực về kiến trúc NestJS, xử lý Concurrency (Chống trùng lịch), Event-driven với BullMQ và Distributed Lock.

---

## PHẦN 1: TECH STACK & KIẾN TRÚC HỆ THỐNG

### 1. Công nghệ sử dụng
* **Runtime & Framework:** Node.js (v20+ LTS) + NestJS (v10+).
* **Ngôn ngữ:** TypeScript 5+ (Strict mode: `strict: true`).
* **Database:** PostgreSQL 16 (Hỗ trợ tốt JSONB, Transactions, ACID).
* **ORM:** Prisma ORM (Type-safe, migration mượt mà, query sạch).
* **Caching & Queue:** Redis (v7+) + BullMQ (Quản lý background jobs/queues).
* **API Documentation:** Swagger / OpenAPI (`@nestjs/swagger`).
* **Third-party Integrations:**
  * **Telegram Bot API:** Gửi thông báo tức thì cho Chủ tiệm/Kỹ thuật viên.
  * **VietQR / SePay Webhook:** Xác nhận thanh toán đặt cọc tự động qua tài khoản ngân hàng.
  * **Zalo ZNS / Webhook:** Gửi nhắc lịch tự động.

---

## PHẦN 2: THIẾT KẾ CƠ SỞ DỮ LIỆU (PRISMA SCHEMA)

Hệ thống được thiết kế theo hướng **Dynamic Terminology** (Động hóa cấu hình để dùng được cho mọi ngành nghề):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  STAFF
  CUSTOMER
}

enum BookingStatus {
  PENDING_DEPOSIT // Chờ cọc
  CONFIRMED       // Đã xác nhận / Đã cọc
  IN_PROGRESS     // Đang thực hiện
  COMPLETED       // Hoàn thành
  CANCELLED       // Đã hủy
  NO_SHOW         // Khách bùng hẹn
}

enum IndustryType {
  BARBER
  SPA
  CLINIC
  GENERAL
}

// Cấu hình linh hoạt cho từng cơ sở (White-label)
model BusinessSetting {
  id              String       @id @default(uuid())
  businessName    String
  industry        IndustryType @default(GENERAL)
  logoUrl         String?
  primaryColor    String       @default("#3B82F6")
  
  // Dynamic Terminology
  staffLabel      String       @default("Nhân viên") // Thợ cắt tóc / Kỹ thuật viên / Bác sĩ
  serviceLabel    String       @default("Dịch vụ")   // Mẫu tóc / Gói trị liệu / Gói khám
  bookingLabel    String       @default("Lịch hẹn")  // Lịch cắt / Lịch khám
  
  // Telegram & Configs
  telegramBotToken String?
  telegramChatId   String?
  requireDeposit   Boolean      @default(false)
  depositAmount    Decimal      @default(0) @db.Decimal(10, 2)
  
  openTime        String       @default("08:00")
  closeTime       String       @default("21:00")
  slotInterval    Int          @default(30) // Bước nhảy thời gian (phút): 15, 30, 60
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model User {
  id           String    @id @default(uuid())
  phone        String    @unique
  fullName     String
  passwordHash String?
  role         Role      @default(CUSTOMER)
  
  staffProfile StaffProfile?
  bookings     Booking[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model StaffProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String?  // Master Stylist, Bác sĩ CKI...
  avatarUrl   String?
  bio         String?
  isActive    Boolean  @default(true)
  
  // Ca làm việc & Dịch vụ phụ trách
  services    Service[] @relation("StaffServices")
  bookings    Booking[]
  schedules   StaffSchedule[]
}

model StaffSchedule {
  id          String       @id @default(uuid())
  staffId     String
  staff       StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)
  dayOfWeek   Int          // 0: Chủ nhật, 1: Thứ 2, ..., 6: Thứ 7
  startTime   String       // "08:00"
  endTime     String       // "18:00"
  isDayOff    Boolean      @default(false)
}

model ServiceCategory {
  id          String    @id @default(uuid())
  name        String
  services    Service[]
}

model Service {
  id          String          @id @default(uuid())
  categoryId  String?
  category    ServiceCategory? @relation(fields: [categoryId], references: [id])
  name        String
  description String?
  price       Decimal         @db.Decimal(10, 2)
  durationMin Int             // Thời gian làm: 30, 45, 60 phút
  imageUrl    String?
  isActive    Boolean         @default(true)
  
  staffs      StaffProfile[]  @relation("StaffServices")
  bookings    Booking[]
}

model Booking {
  id              String        @id @default(uuid())
  code            String        @unique // Mã đặt lịch: FB-2026-XXXX
  customerId      String
  customer        User          @relation(fields: [customerId], references: [id])
  staffId         String
  staff           StaffProfile  @relation(fields: [staffId], references: [id])
  serviceId       String
  service         Service       @relation(fields: [serviceId], references: [id])
  
  startTime       DateTime      // Thời gian bắt đầu
  endTime         DateTime      // = startTime + service.durationMin
  status          BookingStatus @default(PENDING_DEPOSIT)
  note            String?
  
  // Thông tin thanh toán / Cọc
  totalAmount     Decimal       @db.Decimal(10, 2)
  depositAmount   Decimal       @default(0) @db.Decimal(10, 2)
  isPaidDeposit   Boolean       @default(false)
  transactionRef  String?       // Mã giao dịch ngân hàng
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([staffId, startTime, endTime])
  @@index([status])
}
```

---

## PHẦN 3: KIẾN TRÚC MODULE & CÁC TÍNH NĂNG "ĐẮT GIÁ" TRÊN CV

```
src/
├── common/
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── filters/          # Global Exception Filter (Chuẩn hóa format lỗi)
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── interceptors/     # TransformResponseInterceptor, LoggingInterceptor
│   └── redis/            # RedisModule & Distributed Lock Service
├── config/               # Biến môi trường validation (Joi/Zod)
├── modules/
│   ├── auth/             # Xác thực JWT, OTP qua SĐT
│   ├── settings/         # Quản lý White-label config
│   ├── services/         # CRUD danh mục, dịch vụ
│   ├── staff/            # Quản lý thợ, ca làm việc
│   ├── time-slots/       # Thuật toán tính toán khung giờ trống
│   ├── bookings/         # Xử lý đặt lịch + Concurrency Lock
│   ├── payments/         # VietQR Webhook (SePay)
│   └── notifications/    # BullMQ Queues + Telegram/Zalo Workers
└── main.ts
```

### 1. Thuật toán tính toán Time-Slot (Time-Slots Engine)
* **Input:** `serviceId`, `staffId` (optional), `date` (YYYY-MM-DD).
* **Quy trình:**
  1. Lấy ca làm việc của thợ theo ngày trong tuần (`StaffSchedule`).
  2. Chia khung giờ làm việc thành các slot nhỏ dựa trên `slotInterval` và `service.durationMin`.
  3. Lấy tất cả `Booking` của thợ đó trong ngày có status khác `CANCELLED`.
  4. Trừ đi các khung giờ bận -> Trả về danh sách các slot khả dụng: `["09:00", "09:45", "10:30", ...]`.

### 2. Xử lý Trùng lịch (Concurrency / Double-Booking Prevention)
> **Điểm vàng khi phỏng vấn:** Khoe cách bạn giải quyết Race Condition khi 2 người cùng đặt 1 slot.
* **Giải pháp:** Sử dụng **Redis Lock (Distributed Mutex)** trước khi tạo Booking.
```typescript
// Pseudocode trong BookingsService:
async createBooking(dto: CreateBookingDto) {
  const lockKey = `lock:booking:${dto.staffId}:${dto.startTime}`;
  const acquired = await this.redisService.acquireLock(lockKey, 5000); // Khóa 5 giây
  
  if (!acquired) {
    throw new ConflictException('Khung giờ này đang có người khác thao tác đặt, vui lòng chọn lại!');
  }
  
  try {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Double check xem slot đã bị đặt chưa trong DB
      const existing = await tx.booking.findFirst({
        where: {
          staffId: dto.staffId,
          status: { not: BookingStatus.CANCELLED },
          OR: [
            { startTime: { lte: dto.startTime }, endTime: { gt: dto.startTime } },
            { startTime: { lt: dto.endTime }, endTime: { gte: dto.endTime } },
          ],
        },
      });
      if (existing) throw new ConflictException('Khung giờ này vừa có người đặt xong.');

      // 2. Tạo Booking
      const booking = await tx.booking.create({ /* data */ });

      // 3. Đẩy Event vào BullMQ Queue để xử lý ngầm (gửi thông báo, tạo QR)
      await this.notificationQueue.add('send_booking_notification', { bookingId: booking.id });

      return booking;
    });
  } finally {
    await this.redisService.releaseLock(lockKey);
  }
}
```

### 3. Background Job với BullMQ
* Tách biệt hoàn toàn việc gửi tin Telegram/Zalo ra khỏi request đặt lịch.
* API tạo lịch trả về ngay trong `< 50ms`.
* Worker của BullMQ tự động retry 3 lần nếu mạng gặp lỗi hoặc API Telegram bị giới hạn (rate limit).

---

## PHẦN 4: LỘ TRÌNH 4 TUẦN THỰC HIỆN (DÀNH CHO DEV LÀM NGOÀI GIỜ)

Quỹ thời gian: **1.5 – 2 tiếng mỗi tối + 4–5 tiếng cuối tuần**.

### 📅 TUẦN 1: NỀN MÓNG & HỆ THỐNG DỮ LIỆU (Foundation)
* [ ] **Ngày 1-2:** Khởi tạo dự án NestJS với TypeScript Strict, cấu hình ESLint, Prettier, Docker Compose (Postgres + Redis).
* [ ] **Ngày 3-4:** Viết Prisma Schema, chạy migration, cấu hình Prisma Client Service.
* [ ] **Ngày 5-6:** Module `Settings` & `Services` (CRUD dịch vụ, danh mục, cấu hình White-label động).
* [ ] **Ngày 7:** Viết Global Filters, Interceptor chuẩn hóa response format `{ success: true, data, message }`.

### 📅 TUẦN 2: QUẢN LÝ NHÂN SỰ & THUẬT TOÁN TIME-SLOT (Core Domain)
* [ ] **Ngày 8-9:** Module `Staff` & `StaffSchedule` (Quản lý ca làm việc, ngày nghỉ).
* [ ] **Ngày 10-12:** Xây dựng thuật toán tính toán Time-slots khả dụng (`TimeSlotsService`). Viết Unit Test cho thuật toán này.
* [ ] **Ngày 13-14:** Viết Swagger Documentation cho các API đã hoàn thành.

### 📅 TUẦN 3: ĐẶT LỊCH, DISTRIBUTED LOCK & QUEUES (Advanced Architecture)
* [ ] **Ngày 15-16:** Module `Bookings` cơ bản với Prisma Transaction.
* [ ] **Ngày 17-18:** Tích hợp Redis Lock chống Race Condition (Double-booking).
* [ ] **Ngày 19-20:** Cài đặt BullMQ, viết `NotificationProcessor` gọi Telegram Bot API khi có booking mới.
* [ ] **Ngày 21:** Cấu hình Cronjob quét lịch hẹn trước 2 tiếng để tự động kích hoạt queue nhắc hẹn.

### 📅 TUẦN 4: THANH TOÁN VIETQR, DEPLOY & HOÀN THIỆN CV (Ship & Showcase)
* [ ] **Ngày 22-23:** Tích hợp Webhook VietQR (SePay / Casso) tự động cập nhật trạng thái `CONFIRMED`.
* [ ] **Ngày 24-25:** Viết 1 giao diện Booking tối giản bằng Next.js hoặc Vue/Tailwind (hoặc làm UI dạng Wizard đơn giản để demo).
* [ ] **Ngày 26:** Deploy backend lên VPS (hoặc Render / Railway) + Docker Compose, trỏ domain thật.
* [ ] **Ngày 27:** Viết README GitHub chuẩn xịn (có System Architecture Diagram, sơ đồ ERD, hướng dẫn chạy Docker).
* [ ] **Ngày 28:** Cập nhật dự án vào CV & chuẩn bị kịch bản trả lời phỏng vấn.

---

## PHẦN 5: CÁCH TRÌNH BÀY DỰ ÁN NÀY VÀO CV (KÈM MẪU SẴN)

### 📌 Mục Projects trong CV:
**FlexiBook – Enterprise Service Booking & Appointment Engine**  
*Role: Backend Developer (Solo Project)* | *Tech: NestJS, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, Docker*  
*Link Live Demo: [https://flexibook-demo.yourdomain.com]* | *GitHub: [https://github.com/your-username/flexibook-engine]*

* **Bối cảnh & Giải pháp:** Xây dựng backend hệ thống đặt lịch hẹn dịch vụ (SaaS/White-label) giải quyết triệt để vấn đề quá tải và xung đột ca làm việc trong ngành F&B, Spa và Y tế.
* **Thành tựu kỹ thuật chính:**
  * Thiết kế kiến trúc **Modular Clean Architecture** trên NestJS với 100% type-safety (TypeScript strict mode).
  * Giải quyết triệt để lỗi **Double-booking (Race Condition)** bằng kỹ thuật **Distributed Lock trên Redis** kết hợp Database Transaction.
  * Tối ưu thuật toán tính toán Time-slot động (Dynamic Slot Engine) với độ phức tạp $O(N)$, phản hồi dưới **30ms**.
  * Ứng dụng **BullMQ + Redis** phân tách tác vụ I/O nặng (gửi tin Telegram, Zalo nhắc hẹn, Webhook ngân hàng), giúp API đặt lịch phản hồi dưới **60ms**.
  * Tích hợp Webhook VietQR tự động hóa quy trình xác thực tiền cọc, giảm thiểu tỷ lệ bùng lịch thực tế.
