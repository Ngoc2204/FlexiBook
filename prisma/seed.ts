import { PrismaClient, Role, IndustryType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Business Settings
  const setting = await prisma.businessSetting.upsert({
    where: { id: 'default-setting-id' },
    update: {},
    create: {
      id: 'default-setting-id',
      businessName: 'FlexiBook Barber & Spa Studio',
      industry: IndustryType.BARBER,
      staffLabel: 'Kỹ thuật viên',
      serviceLabel: 'Gói dịch vụ',
      bookingLabel: 'Lịch hẹn',
      requireDeposit: true,
      depositAmount: 50000,
      openTime: '08:00',
      closeTime: '21:00',
      slotInterval: 30,
    },
  });
  console.log(`✓ Business settings initialized: ${setting.businessName}`);

  // 2. Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '0988888888' },
    update: {},
    create: {
      phone: '0988888888',
      fullName: 'Quản trị viên Hệ thống',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin user created: ${admin.phone}`);

  // 3. Staff Users & Profiles
  const staff1User = await prisma.user.upsert({
    where: { phone: '0911223344' },
    update: {},
    create: {
      phone: '0911223344',
      fullName: 'Trần Hoàng Nam',
      passwordHash,
      role: Role.STAFF,
    },
  });

  const staff1 = await prisma.staffProfile.upsert({
    where: { userId: staff1User.id },
    update: {},
    create: {
      userId: staff1User.id,
      title: 'Master Stylist (8 năm kinh nghiệm)',
      bio: 'Chuyên gia tạo mẫu tóc nam nữ, am hiểu xu hướng và định hình phong cách cá nhân.',
      isActive: true,
    },
  });

  const staff2User = await prisma.user.upsert({
    where: { phone: '0922334455' },
    update: {},
    create: {
      phone: '0922334455',
      fullName: 'Lê Thảo My',
      passwordHash,
      role: Role.STAFF,
    },
  });

  const staff2 = await prisma.staffProfile.upsert({
    where: { userId: staff2User.id },
    update: {},
    create: {
      userId: staff2User.id,
      title: 'Senior Therapist & Skin Care',
      bio: 'Chuyên gia trị liệu da liễu và phục hồi chuyên sâu, kỹ thuật massage thư giãn chuẩn spa.',
      isActive: true,
    },
  });

  // Staff Schedules (Mon - Sun, 08:00 - 20:00)
  for (let day = 0; day <= 6; day++) {
    await prisma.staffSchedule.createMany({
      data: [
        {
          staffId: staff1.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '20:00',
          isDayOff: day === 1, // Thứ 2 nghỉ
        },
        {
          staffId: staff2.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '21:00',
          isDayOff: day === 2, // Thứ 3 nghỉ
        },
      ],
      skipDuplicates: true,
    });
  }
  console.log('✓ Staff profiles & weekly schedules initialized.');

  // 4. Categories & Services
  let catHair = await prisma.serviceCategory.findFirst({ where: { name: 'Cắt & Tạo kiểu tóc' } });
  if (!catHair) {
    catHair = await prisma.serviceCategory.create({ data: { name: 'Cắt & Tạo kiểu tóc' } });
  }

  let catSpa = await prisma.serviceCategory.findFirst({ where: { name: 'Chăm sóc & Phục hồi' } });
  if (!catSpa) {
    catSpa = await prisma.serviceCategory.create({ data: { name: 'Chăm sóc & Phục hồi' } });
  }

  let catVIP = await prisma.serviceCategory.findFirst({ where: { name: 'Combo Trải Nghiệm VIP' } });
  if (!catVIP) {
    catVIP = await prisma.serviceCategory.create({ data: { name: 'Combo Trải Nghiệm VIP' } });
  }

  // Check if services already exist
  const existingServiceCount = await prisma.service.count();
  if (existingServiceCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          categoryId: catHair.id,
          name: 'Combo Cắt Tóc + Gội Massage Thư Giãn',
          description: 'Tư vấn dáng tóc, cắt gội tạo kiểu chuẩn phong cách với tinh dầu cao cấp.',
          price: 120000,
          durationMin: 45,
          isActive: true,
        },
        {
          categoryId: catHair.id,
          name: 'Uốn / Nhuộm Xu Hướng Thời Thượng',
          description: 'Công nghệ uốn sóng lơi hoặc nhuộm phục hồi không xơ rối, giữ màu bền lâu.',
          price: 350000,
          durationMin: 60,
          isActive: true,
        },
        {
          categoryId: catSpa.id,
          name: 'Gói Trị Liệu & Massage Cổ Vai Gáy Chuyên Sâu',
          description: 'Đả thông kinh lạc, giảm nhức mỏi văn phòng kết hợp chườm thảo dược.',
          price: 220000,
          durationMin: 45,
          isActive: true,
        },
        {
          categoryId: catVIP.id,
          name: 'Gói Chăm Sóc VIP All-In-One Hoàng Gia',
          description: 'Trọn gói: Cắt gội tạo kiểu + Chăm sóc da mặt chuyên sâu + Massage thư giãn toàn thân.',
          price: 490000,
          durationMin: 90,
          isActive: true,
        },
      ],
    });

    // Connect all services to staff1 and staff2
    const allServices = await prisma.service.findMany();
    for (const s of allServices) {
      await prisma.staffProfile.update({
        where: { id: staff1.id },
        data: { services: { connect: { id: s.id } } },
      });
      await prisma.staffProfile.update({
        where: { id: staff2.id },
        data: { services: { connect: { id: s.id } } },
      });
    }
  }

  console.log('✓ Categories & Services seeded and connected to staff.');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
