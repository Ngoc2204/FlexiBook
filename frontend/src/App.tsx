import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  QrCode,
  Tag,
  ShieldCheck,
  AlertCircle,
  Star,
  MapPin,
  Settings,
  ChevronDown,
  Layers,
  Database,
  Cpu,
  HeartHandshake,
  Check,
  X,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';
import './App.css';

interface BusinessSetting {
  id: string;
  businessName: string;
  industry: string;
  staffLabel: string;
  serviceLabel: string;
  bookingLabel: string;
  requireDeposit: boolean;
  depositAmount: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMin: number;
  categoryId?: string;
}

interface ServiceCategory {
  id: string;
  name: string;
}

interface StaffProfile {
  id: string;
  title?: string;
  user: {
    fullName: string;
  };
  services: { id: string }[];
}

interface AvailableSlot {
  time: string;
  availableStaff: { id: string; fullName: string }[];
}

export function App() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'booking' | 'tracking' | 'admin' | 'locations'
  >('home');

  // Booking Wizard Step
  const [step, setStep] = useState<number>(1);

  // Backend Data
  const [settings, setSettings] = useState<BusinessSetting | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Booking Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingNote, setBookingNote] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);
  const [qrInfo, setQrInfo] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Live Slot Hold Timer (5 minutes simulated Redis Mutex hold)
  const [holdTimer, setHoldTimer] = useState<number>(300);

  // Tracking Tab State
  const [searchCode, setSearchCode] = useState<string>('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Quick Home Strip State
  const [quickServiceId, setQuickServiceId] = useState<string>('');
  const [quickDate, setQuickDate] = useState<string>('');

  // Format Currency
  const formatVND = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  };

  // 1. Initial Load & Fetching
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(todayStr);
    setQuickDate(todayStr);

    // Fetch Settings
    fetch('/api/v1/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
          document.title = `${res.data.businessName || 'FlexiBook'} • Đặt Lịch & Quản Lý Dịch Vụ Cao Cấp`;
        }
      })
      .catch(console.warn);

    // Fetch Categories
    fetch('/api/v1/services/categories')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) setCategories(res.data);
      })
      .catch(console.warn);

    // Fetch Services
    fetch('/api/v1/services')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setServices(res.data);
          if (res.data.length > 0) setQuickServiceId(res.data[0].id);
        }
      })
      .catch(console.warn);

    // Fetch Staff
    fetch('/api/v1/staff')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) setStaffList(res.data);
      })
      .catch(console.warn);
  }, []);

  // 2. Fetch Time Slots when service, staff, or date changes
  useEffect(() => {
    if (step === 3 && selectedService && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedTime(null);

      let url = `/api/v1/time-slots/available?serviceId=${selectedService.id}&date=${selectedDate}`;
      if (selectedStaff) {
        url += `&staffId=${selectedStaff.id}`;
      }

      fetch(url)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setTimeSlots(res.data);
          } else {
            setTimeSlots([]);
          }
        })
        .catch(() => setTimeSlots([]))
        .finally(() => setIsLoadingSlots(false));
    }
  }, [step, selectedService, selectedStaff, selectedDate]);

  // 3. Countdown timer when on Step 4 (Holding the slot)
  useEffect(() => {
    let interval: any = null;
    if (step === 4) {
      setHoldTimer(300);
      interval = setInterval(() => {
        setHoldTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  // Generate 7-Day Range
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : daysOfWeek[d.getDay()];
    return {
      dateStr,
      label,
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
    };
  });

  // Filter Services
  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.categoryId === selectedCategory;
  });

  // Handle Quick Booking from Home Page
  const handleQuickBook = () => {
    const srv = services.find((s) => s.id === quickServiceId);
    if (srv) setSelectedService(srv);
    if (quickDate) setSelectedDate(quickDate);
    setActiveTab('booking');
    setStep(2);
  };

  // Select service from showcase and jump to booking
  const handleSelectServiceDirect = (srv: Service) => {
    setSelectedService(srv);
    setActiveTab('booking');
    setStep(2);
  };

  // Select staff and jump to booking
  const handleSelectStaffDirect = (st: StaffProfile) => {
    setSelectedStaff(st);
    setActiveTab('booking');
    setStep(1);
  };

  // Apply Coupon Demo
  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'FLEXI20') {
      setDiscountPercent(20);
      setCouponMessage('Áp dụng mã FLEXI20 thành công! Giảm 20% tổng hóa đơn.');
    } else if (couponCode.trim().toUpperCase() === 'VIP50') {
      setDiscountPercent(50);
      setCouponMessage('Áp dụng voucher VIP50! Giảm 50% chi phí.');
    } else {
      setDiscountPercent(0);
      setCouponMessage('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Submit Booking
  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập họ tên và số điện thoại liên hệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTimeISO = `${selectedDate}T${selectedTime}:00.000Z`;

      let staffId = selectedStaff?.id;
      if (!staffId && staffList.length > 0) {
        const eligible = staffList.find((st) =>
          st.services.some((srv) => srv.id === selectedService.id),
        );
        staffId = eligible ? eligible.id : staffList[0].id;
      }

      const payload = {
        serviceId: selectedService.id,
        staffId,
        startTime: startTimeISO,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: bookingNote.trim() || undefined,
      };

      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setCreatedBooking(result.data);

        // Fetch VietQR code
        if (settings?.requireDeposit) {
          fetch(`/api/v1/payments/vietqr/${result.data.code}`)
            .then((r) => r.json())
            .then((qrRes) => {
              if (qrRes.success) setQrInfo(qrRes.data);
            })
            .catch(console.warn);
        }

        setStep(5);
      } else {
        alert(result.message || 'Khung giờ này vừa có người đặt xong, vui lòng chọn lại!');
      }
    } catch (err: any) {
      alert('Lỗi đặt lịch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search Booking
  const handleSearchBooking = async () => {
    if (!searchCode.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/bookings/code/${searchCode.trim().toUpperCase()}`);
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setSearchResult(result.data);
      } else {
        alert('Không tìm thấy lịch hẹn với mã: ' + searchCode);
        setSearchResult(null);
      }
    } catch (err: any) {
      alert('Lỗi tra cứu: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const copyBookingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const resetBookingForm = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedTime(null);
    setCustomerName('');
    setCustomerPhone('');
    setBookingNote('');
    setCreatedBooking(null);
    setQrInfo(null);
    setDiscountPercent(0);
    setCouponCode('');
    setStep(1);
  };

  // Dynamic Terminology
  const staffLabel = settings?.staffLabel || 'Chuyên viên';
  const serviceLabel = settings?.serviceLabel || 'Dịch vụ';
  const bookingLabel = settings?.bookingLabel || 'Lịch hẹn';
  const businessName = settings?.businessName || 'FlexiBook Luxury Studio';

  // Calculate final total with discount
  const basePrice = selectedService ? selectedService.price : 0;
  const finalPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;

  // Change Industry Setting (Admin Sandbox)
  const applyIndustryPreset = async (preset: {
    industry: string;
    staffLabel: string;
    serviceLabel: string;
    bookingLabel: string;
    businessName: string;
  }) => {
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        alert(`Đã cập nhật hệ thống sang mô hình: ${preset.businessName}`);
      }
    } catch (err: any) {
      alert('Lỗi cập nhật cấu hình: ' + err.message);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* TOP HEADER */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section" onClick={() => setActiveTab('home')}>
            <div className="brand-logo-icon">F</div>
            <div className="brand-title-wrap">
              <span className="brand-title">{businessName}</span>
              <span className="brand-subtitle">Modular Booking Engine • v2.0</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-menu">
            <button
              className={`nav-link-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <Sparkles size={16} />
              Khám Phá
            </button>
            <button
              className={`nav-link-btn ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('booking');
                if (step === 5) setStep(1);
              }}
            >
              <Calendar size={16} />
              {bookingLabel}
            </button>
            <button
              className={`nav-link-btn ${activeTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracking')}
            >
              <Search size={16} />
              Tra Cứu Lịch
            </button>
            <button
              className={`nav-link-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Settings size={16} />
              Cổng Quản Trị
            </button>
            <button
              className={`nav-link-btn ${activeTab === 'locations' ? 'active' : ''}`}
              onClick={() => setActiveTab('locations')}
            >
              <Building size={16} />
              Chi Nhánh
            </button>
          </nav>

          <div className="header-actions">
            <button
              className="quick-book-btn"
              onClick={() => {
                setActiveTab('booking');
                setStep(1);
              }}
            >
              <Scissors size={16} />
              Đặt Chỗ Ngay
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          PAGE 1: HOME & SHOWCASE LANDING
          ======================================================== */}
      {activeTab === 'home' && (
        <div>
          {/* HERO BANNER */}
          <section className="hero-section">
            <img src="/hero.jpg" alt="Luxury Spa & Salon" className="hero-bg-media" />
            <div className="hero-overlay" />

            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={15} />
                NỀN TẢNG ĐẶT LỊCH THẾ HỆ MỚI • DISTRIBUTED REDIS ENGINE
              </div>

              <h1 className="hero-title">
                Trải Nghiệm Dịch Vụ Đẳng Cấp, <span>Không Lo Chờ Đợi</span>
              </h1>

              <p className="hero-description">
                Hệ thống đặt lịch thông minh tích hợp khóa phân tán Redis Mutex Lock, thuật toán
                tính toán slot trống theo thời gian thực (&lt; 30ms) và thanh toán tự động VietQR
                chuẩn NAPAS 247.
              </p>

              <div className="hero-actions">
                <button
                  className="btn-luxury-primary"
                  onClick={() => {
                    setActiveTab('booking');
                    setStep(1);
                  }}
                >
                  <Calendar size={18} /> Đặt Lịch Trực Tuyến Ngay
                </button>
                <button
                  className="btn-luxury-secondary"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Scissors size={18} /> Khám Phá {serviceLabel}
                </button>
                <button
                  className="btn-luxury-secondary"
                  onClick={() => setActiveTab('admin')}
                >
                  <Cpu size={18} /> Test White-Label Sandbox
                </button>
              </div>

              {/* STATS BAR */}
              <div className="hero-stats-grid">
                <div className="stat-card">
                  <div className="stat-number">&lt; 30ms</div>
                  <div className="stat-label">Tốc độ tính toán Slot</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Chống trùng lịch (Redis Lock)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">15,000+</div>
                  <div className="stat-label">Khách hàng phục vụ</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">4.9 / 5.0</div>
                  <div className="stat-label">Đánh giá 5 sao hài lòng</div>
                </div>
              </div>
            </div>
          </section>

          {/* QUICK BOOKING STRIP */}
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
            <div className="quick-strip">
              <div className="quick-field">
                <span className="quick-field-label">
                  <Scissors size={14} /> Chọn {serviceLabel}
                </span>
                <select
                  className="quick-select"
                  value={quickServiceId}
                  onChange={(e) => setQuickServiceId(e.target.value)}
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({formatVND(srv.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="quick-field">
                <span className="quick-field-label">
                  <Calendar size={14} /> Ngày Trải Nghiệm
                </span>
                <input
                  type="date"
                  className="quick-input"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                />
              </div>

              <div className="quick-field">
                <span className="quick-field-label">
                  <MapPin size={14} /> Chi Nhánh Flagship
                </span>
                <select className="quick-select">
                  <option>Hà Nội: Tràng Tiền Plaza, Hoàn Kiếm</option>
                  <option>TP.HCM: Thảo Điền, Quận 2</option>
                </select>
              </div>

              <button className="quick-btn" onClick={handleQuickBook}>
                Tìm Khung Giờ <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* FEATURED SERVICES SHOWCASE */}
          <section id="services-section" className="section-wrapper">
            <div className="section-header">
              <span className="section-tag">
                <Sparkles size={14} /> Danh Mục {serviceLabel} Đẳng Cấp
              </span>
              <h2 className="section-title">Nâng Tầm Phong Cách & Thư Thái Tuyệt Đối</h2>
              <p className="section-subtitle">
                Được thực hiện bởi các chuyên gia tay nghề cao cùng dược mỹ phẩm hữu cơ cao cấp nhập
                khẩu từ Pháp và Nhật Bản.
              </p>
            </div>

            {/* Filter Chips */}
            <div className="category-filter-bar">
              <button
                className={`cat-filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('ALL')}
              >
                Tất Cả {serviceLabel}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`cat-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Services Grid */}
            <div className="services-luxury-grid">
              {filteredServices.map((srv) => (
                <div key={srv.id} className="service-card">
                  <div className="service-card-top">
                    <div className="service-badge-row">
                      <span className="service-badge">Luxury Care</span>
                      <span className="service-duration">
                        <Clock size={14} /> {srv.durationMin} phút
                      </span>
                    </div>
                    <h3 className="service-card-name">{srv.name}</h3>
                    <p className="service-card-desc">
                      {srv.description ||
                        'Quy trình chăm sóc chuyên sâu với các bước phục hồi cấu trúc và thư giãn tối đa.'}
                    </p>
                  </div>

                  <div className="service-price-row">
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Giá niêm yết
                      </div>
                      <div className="service-price-val">{formatVND(srv.price)}</div>
                    </div>
                    <button
                      className="btn-book-service"
                      onClick={() => handleSelectServiceDirect(srv)}
                    >
                      Đặt Gói Này <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* FEATURE SPOTLIGHT BANNER */}
            <div className="spotlight-banner">
              <div className="spotlight-image-wrap">
                <img
                  src="/spa.jpg"
                  alt="Organic Spa Treatment"
                  className="spotlight-img"
                />
              </div>
              <div className="spotlight-text-content">
                <span className="section-tag">
                  <Sparkles size={14} /> Signature Treatment
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '2rem',
                    marginBottom: 16,
                  }}
                >
                  Liệu Trình Dưỡng Sinh & Thư Giãn Tinh Thần Độc Bản
                </h3>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: 24,
                    lineHeight: 1.7,
                  }}
                >
                  Kết hợp giữa thảo mộc thiên nhiên, phương pháp bấm huyệt cổ truyền và âm thanh trị
                  liệu bát pha lê giúp đào thải độc tố, giảm stress và tái tạo năng lượng hoàn hảo.
                </p>
                <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
                  <div>
                    <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.2rem' }}>
                      60 - 90 Phút
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thời lượng</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.2rem' }}>
                      100% Organic
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tinh dầu tự nhiên</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.2rem' }}>
                      VIP Suite
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không gian riêng tư</div>
                  </div>
                </div>
                <button
                  className="btn-luxury-primary"
                  onClick={() => {
                    const spaSrv = services.find((s) => s.name.toLowerCase().includes('gội') || s.name.toLowerCase().includes('spa')) || services[0];
                    if (spaSrv) handleSelectServiceDirect(spaSrv);
                    else {
                      setActiveTab('booking');
                      setStep(1);
                    }
                  }}
                >
                  Đặt Lịch Trải Nghiệm Ngay <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* MASTER EXPERTS SHOWCASE */}
          <section className="section-wrapper" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="section-header">
              <span className="section-tag">
                <User size={14} /> Đội Ngũ {staffLabel}
              </span>
              <h2 className="section-title">Bàn Tay Nghệ Sĩ • Trọn Vẹn Tâm Quyết</h2>
              <p className="section-subtitle">
                Mỗi {staffLabel.toLowerCase()} tại FlexiBook đều sở hữu chứng chỉ quốc tế và nhiều
                năm kinh nghiệm phục vụ khách hàng thượng lưu.
              </p>
            </div>

            <div className="experts-grid">
              <div className="expert-card">
                <div className="expert-avatar-wrap">
                  <img
                    src="/stylist.jpg"
                    alt="Kenjiro Master"
                    className="expert-avatar-img"
                  />
                </div>
                <h3 className="expert-name">Kenjiro Takahashi</h3>
                <div className="expert-title">Master Creative Director</div>
                <p className="expert-specialty">
                  12 năm kinh nghiệm tại Tokyo & Singapore. Chuyên gia tạo mẫu tóc hình học và nhuộm
                  phục hồi ánh sắc.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    color: '#F59E0B',
                    marginBottom: 16,
                  }}
                >
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: 4 }}>
                    5.0 (320+ lượt)
                  </span>
                </div>
                <button
                  className="btn-book-service"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    const st = staffList[0];
                    if (st) handleSelectStaffDirect(st);
                    else {
                      setActiveTab('booking');
                      setStep(1);
                    }
                  }}
                >
                  Đặt Lịch Với Kenjiro
                </button>
              </div>

              {staffList.slice(0, 3).map((st, idx) => (
                <div key={st.id} className="expert-card">
                  <div
                    className="expert-avatar-wrap"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '2rem',
                      fontWeight: 800,
                    }}
                  >
                    {st.user.fullName.split(' ').slice(-1)[0][0]}
                  </div>
                  <h3 className="expert-name">{st.user.fullName}</h3>
                  <div className="expert-title">
                    {st.title || `Chuyên viên cao cấp bậc ${idx + 2}`}
                  </div>
                  <p className="expert-specialty">
                    Phục trách {st.services.length} nhóm liệu trình chuyên sâu. Đạt chứng chỉ chăm sóc
                    chuẩn quốc tế.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      color: '#F59E0B',
                      marginBottom: 16,
                    }}
                  >
                    <Star size={16} fill="#F59E0B" />
                    <Star size={16} fill="#F59E0B" />
                    <Star size={16} fill="#F59E0B" />
                    <Star size={16} fill="#F59E0B" />
                    <Star size={16} fill="#F59E0B" />
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: 4 }}>
                      4.95 (180+ lượt)
                    </span>
                  </div>
                  <button
                    className="btn-book-service"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleSelectStaffDirect(st)}
                  >
                    Đặt Lịch Với {st.user.fullName.split(' ').slice(-1)[0]}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ENTERPRISE ARCHITECTURE HIGHLIGHTS */}
          <section className="section-wrapper">
            <div className="section-header">
              <span className="section-tag">
                <Cpu size={14} /> Kiến Trúc Độc Bản
              </span>
              <h2 className="section-title">Tại Sao FlexiBook Vượt Trội Hơn?</h2>
              <p className="section-subtitle">
                Được xây dựng trên nền tảng NestJS v12 Microservices, PostgreSQL 16 và Redis Lock,
                đảm bảo trải nghiệm tức thì và tin cậy tuyệt đối.
              </p>
            </div>

            <div className="tech-grid">
              <div className="tech-card">
                <div className="tech-icon-wrap">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="tech-card-title">Distributed Mutex Lock</h3>
                <p className="tech-card-desc">
                  Sử dụng Redis Mutex với TTL tự hủy. Dù 1,000 khách cùng bấm đặt cùng một thợ vào một
                  giây, chỉ duy nhất 1 giao dịch hợp lệ được ghi nhận. Không bao giờ xảy ra
                  Double-Booking.
                </p>
              </div>

              <div className="tech-card">
                <div className="tech-icon-wrap" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)' }}>
                  <Clock size={28} />
                </div>
                <h3 className="tech-card-title">Dynamic Slot Engine</h3>
                <p className="tech-card-desc">
                  Thuật toán quét ma trận thời gian thực $O(N)$ trong chưa đầy 30ms, tự động tính toán
                  thời lượng dịch vụ, thời gian nghỉ đệm (Buffer Time) và ca trực riêng biệt của từng
                  nhân sự.
                </p>
              </div>

              <div className="tech-card">
                <div className="tech-icon-wrap" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.15)' }}>
                  <QrCode size={28} />
                </div>
                <h3 className="tech-card-title">Tự Động Sinh VietQR</h3>
                <p className="tech-card-desc">
                  Tích hợp chuẩn NAPAS 247 và SePay Webhook. Tự động sinh mã QR chuyển khoản chính xác
                  từng đồng kèm mã đối soát, tự động kích hoạt trạng thái đơn ngay khi tài khoản báo có.
                </p>
              </div>

              <div className="tech-card">
                <div className="tech-icon-wrap" style={{ color: '#EC4899', background: 'rgba(236, 72, 153, 0.15)' }}>
                  <Database size={28} />
                </div>
                <h3 className="tech-card-title">BullMQ Queue & Telegram</h3>
                <p className="tech-card-desc">
                  Hàng đợi bất đồng bộ xử lý hàng ngàn tác vụ không gây trễ API. Tự động gửi thông báo
                  đến Telegram Bot của quản lý và nhắc hẹn khách hàng trước 2 giờ chống quên lịch.
                </p>
              </div>
            </div>
          </section>

          {/* VIP TESTIMONIALS */}
          <section className="section-wrapper" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="section-header">
              <span className="section-tag">
                <HeartHandshake size={14} /> Trải Nghiệm Khách Hàng
              </span>
              <h2 className="section-title">Những Lời Nhận Xét Quý Giá</h2>
              <p className="section-subtitle">
                Sự hài lòng và tin cậy của hơn 15,000 khách hàng là thước đo giá trị lớn nhất của
                chúng tôi.
              </p>
            </div>

            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div style={{ display: 'flex', gap: 4, color: '#F59E0B', marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill="#F59E0B" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 20 }}>
                  "Giao diện đặt lịch mượt mà đến bất ngờ! Tôi chọn giờ xong là mã VietQR hiện lên
                  ngay, chuyển khoản xong chỉ 3 giây sau là nhận được thông báo xác nhận thành công.
                  Đến nơi không phải chờ một phút nào!"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#d946ef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    TH
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Trần Thanh Hằng</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Doanh nhân • Khách hàng VIP
                    </div>
                  </div>
                </div>
              </div>

              <div className="testimonial-card">
                <div style={{ display: 'flex', gap: 4, color: '#F59E0B', marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill="#F59E0B" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 20 }}>
                  "Mình thích nhất tính năng cho phép chọn đúng Master Kenjiro theo khung giờ trống
                  thực tế. Không còn cảnh đặt thợ quen mà đến nơi thợ bận ca khác. Rất chuyên nghiệp
                  và đẳng cấp!"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    MA
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Nguyễn Minh Anh</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Kiến trúc sư • Khách hàng thân thiết
                    </div>
                  </div>
                </div>
              </div>

              <div className="testimonial-card">
                <div style={{ display: 'flex', gap: 4, color: '#F59E0B', marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill="#F59E0B" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 20 }}>
                  "Không gian sang trọng, âm nhạc du dương, nhân viên phục vụ nước ép hữu cơ ngay khi
                  vừa bước vào. Trải nghiệm dịch vụ 5 sao đúng nghĩa từ lúc đặt trên web đến lúc hoàn
                  thành!"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    QV
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Đặng Quốc Việt</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Giám đốc Sáng tạo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ ACCORDION */}
          <section className="section-wrapper">
            <div className="section-header">
              <span className="section-tag">
                <AlertCircle size={14} /> Giải Đáp Thắc Mắc
              </span>
              <h2 className="section-title">Câu Hỏi Thường Gặp (FAQ)</h2>
              <p className="section-subtitle">
                Mọi thông tin cần biết để trải nghiệm dịch vụ tại FlexiBook một cách trọn vẹn nhất.
              </p>
            </div>

            <div className="faq-list">
              {[
                {
                  q: 'Tôi có thể đổi hoặc hủy lịch hẹn đã đặt không?',
                  a: 'Có, bạn hoàn toàn có thể tra cứu mã đặt lịch tại tab "Tra Cứu Lịch" để kiểm tra trạng thái hoặc liên hệ hotline để đổi khung giờ trước ít nhất 2 tiếng mà không mất phí cọc.',
                },
                {
                  q: 'Khoản tiền đặt cọc có bắt buộc không và được bảo lưu như thế nào?',
                  a: 'Tùy thuộc vào chính sách của từng gói dịch vụ VIP hoặc giờ cao điểm, hệ thống có thể yêu cầu đặt cọc trước (20%). Khoản tiền này sẽ được trừ thẳng vào tổng hóa đơn khi bạn đến làm dịch vụ.',
                },
                {
                  q: 'Nếu khung giờ tôi muốn đặt hiển thị kín chỗ, tôi phải làm sao?',
                  a: 'Bạn có thể chọn tùy chọn "Bất kỳ chuyên viên khả dụng" ở Bước 2 để hệ thống tự động tìm thợ có tay nghề tương đương còn trống ca trực, hoặc chọn ngày kế tiếp.',
                },
                {
                  q: 'Hệ thống có tự động gửi tin nhắn nhắc nhở trước giờ hẹn không?',
                  a: 'Có! Hệ thống tự động kích hoạt bộ lập lịch BullMQ Reminder gửi tin nhắn xác nhận và nhắc nhở trước 2 giờ qua SMS / Zalo / Telegram để quý khách kịp sắp xếp thời gian di chuyển.',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="faq-item"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="faq-question">
                    <span>{item.q}</span>
                    <ChevronDown
                      size={20}
                      style={{
                        transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                      }}
                    />
                  </div>
                  {openFaq === index && <div className="faq-answer">{item.a}</div>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ========================================================
          PAGE 2: INTERACTIVE BOOKING STUDIO (WIZARD)
          ======================================================== */}
      {activeTab === 'booking' && (
        <div className="booking-studio-container">
          {/* STEPPER HEADER */}
          {step < 5 && (
            <div className="stepper-header-box">
              <div className="stepper-track">
                <div className="stepper-bar-bg" />
                <div
                  className="stepper-bar-fill"
                  style={{ width: `${((step - 1) / 3) * 84}%` }}
                />

                {[
                  { num: 1, label: serviceLabel },
                  { num: 2, label: staffLabel },
                  { num: 3, label: 'Khung Giờ' },
                  { num: 4, label: 'Xác Nhận' },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`step-node ${step === s.num ? 'active' : ''} ${
                      step > s.num ? 'done' : ''
                    }`}
                    onClick={() => step > s.num && setStep(s.num)}
                  >
                    <div className="step-circle">
                      {step > s.num ? <Check size={18} /> : s.num}
                    </div>
                    <div className="step-title">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <div className="studio-panel">
              <h2 className="studio-panel-title">
                <Scissors size={26} style={{ color: 'var(--gold)' }} />
                Bước 1: Chọn {serviceLabel} Trải Nghiệm
              </h2>
              <p className="studio-panel-sub">
                Lựa chọn dịch vụ mong muốn để thuật toán tìm khung giờ và nhân sự thích hợp nhất.
              </p>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="category-filter-bar" style={{ justifyContent: 'flex-start' }}>
                  <button
                    className={`cat-filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('ALL')}
                  >
                    Tất cả
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={`cat-filter-btn ${selectedCategory === c.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid of services */}
              <div className="services-luxury-grid" style={{ marginBottom: 30 }}>
                {filteredServices.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      className={`service-card ${isSelected ? 'selected' : ''}`}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--gold)' : undefined,
                        background: isSelected ? 'rgba(243, 199, 124, 0.08)' : undefined,
                      }}
                      onClick={() => setSelectedService(srv)}
                    >
                      <div className="service-card-top">
                        <div className="service-badge-row">
                          <span className="service-badge">
                            {isSelected ? '✓ Đã Chọn' : 'Lựa chọn'}
                          </span>
                          <span className="service-duration">
                            <Clock size={14} /> {srv.durationMin} phút
                          </span>
                        </div>
                        <h3 className="service-card-name">{srv.name}</h3>
                        <p className="service-card-desc">{srv.description}</p>
                      </div>

                      <div className="service-price-row">
                        <span className="service-price-val">{formatVND(srv.price)}</span>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#07090e' : '#fff',
                          }}
                        >
                          {isSelected ? <Check size={16} /> : <ArrowRight size={14} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="studio-actions-row">
                <div />
                <button
                  className="btn-luxury-primary"
                  disabled={!selectedService}
                  style={{ opacity: selectedService ? 1 : 0.5 }}
                  onClick={() => setStep(2)}
                >
                  Tiếp Tục Chọn {staffLabel} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STAFF SELECTION */}
          {step === 2 && (
            <div className="studio-panel">
              <h2 className="studio-panel-title">
                <User size={26} style={{ color: 'var(--gold)' }} />
                Bước 2: Chọn {staffLabel} Phụ Trách
              </h2>
              <p className="studio-panel-sub">
                Bạn có thể chỉ định chuyên gia yêu thích hoặc chọn "Bất kỳ ai khả dụng" để có nhiều
                khung giờ trống nhất.
              </p>

              <div className="experts-grid" style={{ marginBottom: 30 }}>
                {/* Any staff option */}
                <div
                  className={`expert-card ${selectedStaff === null ? 'selected' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedStaff === null ? 'var(--gold)' : undefined,
                    background:
                      selectedStaff === null ? 'rgba(243, 199, 124, 0.08)' : undefined,
                  }}
                  onClick={() => setSelectedStaff(null)}
                >
                  <div
                    className="expert-avatar-wrap"
                    style={{
                      background: 'var(--indigo-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Sparkles size={36} />
                  </div>
                  <h3 className="expert-name">Bất kỳ nhân sự khả dụng</h3>
                  <div className="expert-title">Tối Ưu Thời Gian Nhất</div>
                  <p className="expert-specialty">
                    Hệ thống sẽ tự động ghép người có lịch rảnh khớp nhất với khung giờ bạn muốn đặt.
                  </p>
                  <div
                    style={{
                      color: 'var(--gold)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      marginTop: 10,
                    }}
                  >
                    {selectedStaff === null ? '✓ Đang Lựa Chọn' : 'Bấm Để Chọn'}
                  </div>
                </div>

                {/* Specific Staff */}
                {staffList
                  .filter(
                    (st) =>
                      !selectedService ||
                      st.services.some((s) => s.id === selectedService.id),
                  )
                  .map((st) => {
                    const isSelected = selectedStaff?.id === st.id;
                    return (
                      <div
                        key={st.id}
                        className={`expert-card ${isSelected ? 'selected' : ''}`}
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--gold)' : undefined,
                          background: isSelected ? 'rgba(243, 199, 124, 0.08)' : undefined,
                        }}
                        onClick={() => setSelectedStaff(st)}
                      >
                        <div
                          className="expert-avatar-wrap"
                          style={{
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gold)',
                            fontSize: '1.8rem',
                            fontWeight: 800,
                          }}
                        >
                          {st.user.fullName[0]}
                        </div>
                        <h3 className="expert-name">{st.user.fullName}</h3>
                        <div className="expert-title">{st.title || 'Chuyên viên tay nghề cao'}</div>
                        <p className="expert-specialty">
                          Đảm nhiệm {st.services.length} dịch vụ chuyên nghiệp. Đánh giá 5 sao.
                        </p>
                        <div
                          style={{
                            color: 'var(--gold)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            marginTop: 10,
                          }}
                        >
                          {isSelected ? '✓ Đang Lựa Chọn' : 'Bấm Để Chọn'}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="studio-actions-row">
                <button className="btn-luxury-secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button className="btn-luxury-primary" onClick={() => setStep(3)}>
                  Tiếp Tục Chọn Giờ <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME SELECTION */}
          {step === 3 && (
            <div className="studio-panel">
              <h2 className="studio-panel-title">
                <Clock size={26} style={{ color: 'var(--gold)' }} />
                Bước 3: Chọn Ngày & Giờ Còn Trống
              </h2>
              <p className="studio-panel-sub">
                Thuật toán Dynamic Time-Slot Engine tự động loại bỏ các ca bận và thời gian nghỉ của{' '}
                {selectedStaff ? selectedStaff.user.fullName : 'nhân viên'}.
              </p>

              {/* 7 Days Row */}
              <div className="date-strip-row">
                {next7Days.map((d) => (
                  <div
                    key={d.dateStr}
                    className={`date-pill-card ${
                      selectedDate === d.dateStr ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedDate(d.dateStr)}
                  >
                    <div className="date-pill-day">{d.label}</div>
                    <div className="date-pill-num">{d.dayNum}</div>
                    <div className="date-pill-month">Tháng {d.monthNum}</div>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
                Khung giờ vàng còn trống ngày {selectedDate}:
              </h4>

              {isLoadingSlots ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock
                    size={28}
                    style={{ animation: 'spin 1.5s linear infinite', marginBottom: 10 }}
                  />
                  <div>Đang tính toán các khung giờ khả dụng thời gian thực...</div>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="slots-container">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        className={`slot-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTime(slot.time)}
                      >
                        <Clock size={14} />
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '24px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    color: '#f87171',
                    marginBottom: 30,
                  }}
                >
                  <AlertCircle size={24} style={{ marginBottom: 8 }} />
                  <div>
                    Rất tiếc! Đã kín chỗ cho ngày này với lựa chọn hiện tại. Quý khách vui lòng chọn
                    ngày khác hoặc đổi sang chuyên gia khác.
                  </div>
                </div>
              )}

              <div className="studio-actions-row">
                <button className="btn-luxury-secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button
                  className="btn-luxury-primary"
                  disabled={!selectedTime}
                  style={{ opacity: selectedTime ? 1 : 0.5 }}
                  onClick={() => setStep(4)}
                >
                  Xác Nhận Đặt Chỗ <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS & SLOT HOLDING */}
          {step === 4 && selectedService && (
            <div className="studio-panel">
              <h2 className="studio-panel-title">
                <ShieldCheck size={26} style={{ color: 'var(--gold)' }} />
                Bước 4: Thông Tin Đặt Chỗ & Giữ Chỗ
              </h2>
              <p className="studio-panel-sub">
                Vui lòng điền thông tin để chúng tôi phục vụ chu đáo nhất khi quý khách đến nơi.
              </p>

              {/* LIVE HOLD TIMER ALERT */}
              <div className="reservation-lock-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} />
                  <span>
                    Khung giờ đang được tạm giữ qua <b>Redis Distributed Lock</b>. Vui lòng hoàn tất trong:
                  </span>
                </div>
                <div className="lock-timer-badge">
                  {Math.floor(holdTimer / 60)}:
                  {String(holdTimer % 60).padStart(2, '0')}
                </div>
              </div>

              {/* SUMMARY CARD */}
              <div className="booking-review-card">
                <div className="review-row">
                  <span className="review-label">
                    <Scissors size={15} /> {serviceLabel}:
                  </span>
                  <span className="review-val">{selectedService.name}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">
                    <Clock size={15} /> Thời lượng thực hiện:
                  </span>
                  <span className="review-val">{selectedService.durationMin} phút</span>
                </div>
                <div className="review-row">
                  <span className="review-label">
                    <User size={15} /> {staffLabel} đảm nhiệm:
                  </span>
                  <span className="review-val">
                    {selectedStaff ? selectedStaff.user.fullName : 'Bất kỳ nhân sự khả dụng'}
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-label">
                    <Calendar size={15} /> Lịch hẹn:
                  </span>
                  <span className="review-val" style={{ color: 'var(--gold)' }}>
                    {selectedTime} • {selectedDate}
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-label">
                    <Tag size={15} /> Tổng giá dịch vụ:
                  </span>
                  <span className="review-val">
                    {discountPercent > 0 ? (
                      <span>
                        <s style={{ color: 'var(--text-muted)', marginRight: 8 }}>
                          {formatVND(selectedService.price)}
                        </s>
                        <b style={{ color: '#34d399' }}>{formatVND(finalPrice)}</b>
                      </span>
                    ) : (
                      formatVND(selectedService.price)
                    )}
                  </span>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div className="form-group">
                <label className="form-label">
                  Họ và tên của bạn <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Nguyễn Thảo My"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Số điện thoại di động <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Ví dụ: 0987654321"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              {/* COUPON CODE DEMO */}
              <div className="form-group">
                <label className="form-label">Mã Giảm Giá / Thẻ Hội Viên (Thử: FLEXI20)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nhập mã FLEXI20"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <button
                    className="btn-luxury-secondary"
                    type="button"
                    onClick={applyCoupon}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Áp Dụng
                  </button>
                </div>
                {couponMessage && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      marginTop: 6,
                      color: discountPercent > 0 ? '#34d399' : '#f87171',
                    }}
                  >
                    {couponMessage}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Yêu cầu đặc biệt (tùy chọn)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Đặt phòng VIP, thích massage vai gáy nhẹ nhàng..."
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                />
              </div>

              <div className="studio-actions-row">
                <button className="btn-luxury-secondary" onClick={() => setStep(3)}>
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button
                  className="btn-luxury-primary"
                  disabled={isSubmitting}
                  onClick={handleBookingSubmit}
                >
                  {isSubmitting ? (
                    'Đang xử lý Mutex Lock...'
                  ) : (
                    <>
                      Hoàn Tất Đặt Lịch Ngay <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS & VIETQR */}
          {step === 5 && createdBooking && (
            <div className="studio-panel" style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '2px solid #34d399',
                }}
              >
                <CheckCircle2 size={40} />
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2.2rem',
                  color: '#34d399',
                  marginBottom: 8,
                }}
              >
                ĐẶT LỊCH THÀNH CÔNG!
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Cảm ơn bạn. Đơn đặt chỗ đã được xác nhận vào hệ thống và kích hoạt thông báo
                Telegram.
              </p>

              {/* BOOKING CODE BANNER */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(243, 199, 124, 0.12)',
                  border: '1px solid var(--gold)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: 28,
                }}
                onClick={() => copyBookingCode(createdBooking.code)}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: 'var(--gold)',
                  }}
                >
                  #{createdBooking.code}
                </span>
                <Copy size={18} style={{ color: 'var(--gold)' }} />
              </div>
              {copiedCode && (
                <div style={{ color: '#34d399', fontSize: '0.85rem', marginBottom: 20 }}>
                  Đã sao chép mã đặt chỗ vào bộ nhớ tạm!
                </div>
              )}

              {/* VIETQR CARD IF DEPOSIT REQUIRED */}
              {settings?.requireDeposit && qrInfo && (
                <div
                  style={{
                    background: 'rgba(7, 9, 14, 0.7)',
                    border: '1px solid var(--border-active)',
                    borderRadius: '20px',
                    padding: '24px',
                    maxWidth: 440,
                    margin: '0 auto 30px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: 'var(--gold)',
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    <QrCode size={20} /> Quét Mã VietQR Đặt Cọc
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Hệ thống sẽ tự động cập nhật trạng thái ngay sau 3 giây nhờ SePay Webhook.
                  </p>
                  <img
                    src={qrInfo.qrUrl}
                    alt="VietQR Payment"
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: '12px',
                      background: '#fff',
                      padding: 10,
                      margin: '0 auto 16px',
                    }}
                  />
                  <div
                    style={{
                      textAlign: 'left',
                      fontSize: '0.88rem',
                      background: 'rgba(255,255,255,0.04)',
                      padding: 14,
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      Số tiền cọc: <b style={{ color: '#34d399' }}>{formatVND(qrInfo.amount)}</b>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Ngân hàng: <b>{qrInfo.bankCode}</b> - STK: <b>{qrInfo.accountNumber}</b>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Nội dung CK: <b style={{ color: 'var(--gold)' }}>{qrInfo.transferContent}</b>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                <button className="btn-luxury-primary" onClick={resetBookingForm}>
                  Đặt Thêm Lịch Hẹn Khác
                </button>
                <button
                  className="btn-luxury-secondary"
                  onClick={() => {
                    setSearchCode(createdBooking.code);
                    setActiveTab('tracking');
                    handleSearchBooking();
                  }}
                >
                  <Search size={16} /> Xem Vé Điện Tử
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PAGE 3: BOOKING TRACKER & PASS (DIGITAL TICKET)
          ======================================================== */}
      {activeTab === 'tracking' && (
        <div className="tracker-container">
          <div className="section-header" style={{ marginBottom: 30 }}>
            <span className="section-tag">
              <Search size={14} /> Tra Cứu Trực Tuyến
            </span>
            <h2 className="section-title">Quản Lý & Kiểm Tra Vé Lịch Hẹn</h2>
            <p className="section-subtitle">
              Nhập mã đặt lịch (ví dụ: FB-2026-XXXX) để xem trạng thái đơn, giờ hẹn và hủy/đổi lịch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập mã lịch hẹn (ví dụ: FB-2026-ABCD)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', letterSpacing: 1 }}
            />
            <button
              className="btn-luxury-primary"
              disabled={isSearching}
              onClick={handleSearchBooking}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isSearching ? 'Đang tra cứu...' : 'Tra Cứu Vé'}
            </button>
          </div>

          {searchResult && (
            <div className="boarding-pass">
              <div className="pass-header">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MÃ ĐẶT CHỖ</div>
                  <div className="pass-code">#{searchResult.code}</div>
                </div>
                <div
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    background:
                      searchResult.status === 'CONFIRMED'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color: searchResult.status === 'CONFIRMED' ? '#34d399' : '#fbbf24',
                    border: '1px solid currentColor',
                  }}
                >
                  {searchResult.status}
                </div>
              </div>

              <div className="pass-body">
                {/* Timeline */}
                <div className="pass-timeline">
                  <div className="timeline-step completed">1. Tạo Đơn</div>
                  <div className={`timeline-step ${searchResult.status === 'CONFIRMED' ? 'completed' : ''}`}>
                    2. Đặt Cọc
                  </div>
                  <div className={`timeline-step ${searchResult.status === 'CONFIRMED' ? 'completed' : ''}`}>
                    3. Xác Nhận
                  </div>
                  <div className="timeline-step">4. Hoàn Thành</div>
                </div>

                <div className="booking-review-card" style={{ background: 'transparent' }}>
                  <div className="review-row">
                    <span className="review-label">Khách hàng:</span>
                    <span className="review-val">
                      {searchResult.customer?.fullName} ({searchResult.customer?.phone})
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">{serviceLabel}:</span>
                    <span className="review-val">{searchResult.service?.name}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">{staffLabel}:</span>
                    <span className="review-val">{searchResult.staff?.user?.fullName}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">Thời gian phục vụ:</span>
                    <span className="review-val" style={{ color: 'var(--gold)' }}>
                      {new Date(searchResult.startTime).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">Tổng thanh toán:</span>
                    <span className="review-val">{formatVND(searchResult.totalAmount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    className="btn-luxury-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => {
                      const text = `Lịch hẹn FlexiBook #${searchResult.code}\nDịch vụ: ${searchResult.service?.name}\nThời gian: ${searchResult.startTime}`;
                      navigator.clipboard.writeText(text);
                      alert('Đã sao chép thông tin vé lịch hẹn!');
                    }}
                  >
                    <Copy size={16} /> Sao Chép Chi Tiết
                  </button>
                  <button
                    className="btn-luxury-secondary"
                    style={{ flex: 1, justifyContent: 'center', borderColor: '#ef4444', color: '#f87171' }}
                    onClick={() => {
                      if (confirm('Quý khách có chắc chắn muốn hủy lịch hẹn này không?')) {
                        alert('Yêu cầu hủy đã được ghi nhận. CSKH sẽ liên hệ xác nhận.');
                      }
                    }}
                  >
                    <X size={16} /> Hủy Lịch Hẹn
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PAGE 4: ADMIN & WHITE-LABEL DEMO
          ======================================================== */}
      {activeTab === 'admin' && (
        <div className="admin-container">
          <div className="section-header" style={{ marginBottom: 30 }}>
            <span className="section-tag">
              <Settings size={14} /> White-Label Sandbox
            </span>
            <h2 className="section-title">Trung Tâm Tùy Biến Ngành Nghề</h2>
            <p className="section-subtitle">
              Xem khả năng biến đổi thuật ngữ linh hoạt của FlexiBook dành cho Salon, Spa, Nha khoa
              hoặc Phòng khám.
            </p>
          </div>

          <div className="admin-grid">
            <div className="admin-box">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
                Chuyển Đổi Mô Hình Doanh Nghiệp
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Chọn 1 trong các mô hình bên dưới để xem toàn bộ giao diện tự động đổi nhãn, nút bấm
                và thuật ngữ:
              </p>

              <button
                className="industry-preset-btn"
                onClick={() =>
                  applyIndustryPreset({
                    industry: 'BARBER',
                    staffLabel: 'Thợ cắt tóc',
                    serviceLabel: 'Dịch vụ tóc',
                    bookingLabel: 'Lịch cắt tóc',
                    businessName: 'The Gentleman Barber House',
                  })
                }
              >
                <Scissors size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Hair Salon & Barber House</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Thợ cắt tóc • Dịch vụ tóc • Lịch cắt
                  </div>
                </div>
              </button>

              <button
                className="industry-preset-btn"
                onClick={() =>
                  applyIndustryPreset({
                    industry: 'SPA',
                    staffLabel: 'Kỹ thuật viên',
                    serviceLabel: 'Liệu trình',
                    bookingLabel: 'Lịch trị liệu',
                    businessName: 'Serenity Luxury Spa & Clinic',
                  })
                }
              >
                <Sparkles size={20} style={{ color: '#EC4899' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Luxury Spa & Thẩm Mỹ Viện</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Kỹ thuật viên • Liệu trình • Lịch trị liệu
                  </div>
                </div>
              </button>

              <button
                className="industry-preset-btn"
                onClick={() =>
                  applyIndustryPreset({
                    industry: 'CLINIC',
                    staffLabel: 'Bác sĩ chuyên khoa',
                    serviceLabel: 'Dịch vụ khám',
                    bookingLabel: 'Lịch khám bệnh',
                    businessName: 'Elite Dental & Healthcare',
                  })
                }
              >
                <ShieldCheck size={20} style={{ color: '#10B981' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Nha Khoa & Phòng Khám</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Bác sĩ • Dịch vụ khám • Lịch khám
                  </div>
                </div>
              </button>
            </div>

            <div className="admin-box">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
                Hạ Tầng Kỹ Thuật (Live Telemetry)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Giám sát tình trạng kết nối phân tán của FlexiBook:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 12,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database size={16} /> PostgreSQL Primary:
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>● Connected</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 12,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Cpu size={16} /> Upstash Redis (Mutex Lock):
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>● Healthy (&lt; 15ms)</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 12,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={16} /> BullMQ Notification Workers:
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>● Active</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 12,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={16} /> VietQR & SePay Webhook:
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>● Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PAGE 5: LOCATIONS & CONCIERGE
          ======================================================== */}
      {activeTab === 'locations' && (
        <div className="section-wrapper">
          <div className="section-header">
            <span className="section-tag">
              <Building size={14} /> Hệ Thống Chi Nhánh
            </span>
            <h2 className="section-title">Không Gian Thư Giãn Đẳng Cấp</h2>
            <p className="section-subtitle">
              Tọa lạc tại những vị trí đắc địa nhất tại Hà Nội và TP. Hồ Chí Minh với bãi đỗ xe ô tô
              tiện lợi.
            </p>
          </div>

          <div className="admin-grid">
            <div className="admin-box">
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 8 }}>
                Flagship Studio Hà Nội
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                Tầng 3, Tràng Tiền Plaza, Quận Hoàn Kiếm, Hà Nội
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', marginBottom: 20 }}>
                <div>🕒 Giờ mở cửa: 08:30 - 21:30 (Thứ 2 - Chủ Nhật)</div>
                <div>📞 Hotline VIP: 024.8888.9999</div>
                <div>🚗 Bãi đỗ xe: Miễn phí đỗ xe ô tô tại tầng hầm B1</div>
                <div>🍸 Welcome Drink: Trà thảo mộc & Rượu vang nhẹ</div>
              </div>
              <button
                className="btn-luxury-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setActiveTab('booking');
                  setStep(1);
                }}
              >
                Đặt Lịch Tại Chi Nhánh Này
              </button>
            </div>

            <div className="admin-box">
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 8 }}>
                Luxury Retreat TP. Hồ Chí Minh
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                Số 88 Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức, TP.HCM
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', marginBottom: 20 }}>
                <div>🕒 Giờ mở cửa: 09:00 - 22:00 (Thứ 2 - Chủ Nhật)</div>
                <div>📞 Hotline VIP: 028.7777.6666</div>
                <div>🌿 Không gian: Sân vườn nhiệt đới & Phòng VIP riêng biệt</div>
                <div>💆 Dịch vụ: Spa dưỡng sinh & Trị liệu đầu độc quyền</div>
              </div>
              <button
                className="btn-luxury-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setActiveTab('booking');
                  setStep(1);
                }}
              >
                Đặt Lịch Tại Chi Nhánh Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="brand-logo-icon">F</div>
              <span className="brand-title">{businessName}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Nền tảng đặt lịch thông minh với kiến trúc phân tán tiên tiến. Đảm bảo trải nghiệm
              khách hàng 5 sao và vận hành tối ưu cho các thương hiệu hàng đầu.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Điều Hướng</h4>
            <ul className="footer-links">
              <li>
                <a href="#home" onClick={() => setActiveTab('home')}>
                  Khám Phá
                </a>
              </li>
              <li>
                <a href="#booking" onClick={() => setActiveTab('booking')}>
                  Đặt Lịch Trực Tuyến
                </a>
              </li>
              <li>
                <a href="#tracking" onClick={() => setActiveTab('tracking')}>
                  Tra Cứu Lịch Hẹn
                </a>
              </li>
              <li>
                <a href="#locations" onClick={() => setActiveTab('locations')}>
                  Chi Nhánh
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Công Nghệ</h4>
            <ul className="footer-links">
              <li>
                <a href="#tech">Redis Mutex Lock</a>
              </li>
              <li>
                <a href="#tech">Dynamic Slot Engine</a>
              </li>
              <li>
                <a href="#tech">VietQR & SePay</a>
              </li>
              <li>
                <a href="#tech">BullMQ Notifications</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Liên Hệ Trợ Giúp</h4>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <div>📍 Hà Nội: Tràng Tiền Plaza, Hoàn Kiếm</div>
              <div>📍 TP.HCM: Thảo Điền, Quận 2</div>
              <div>📞 Hotline: 1900 6868 (24/7)</div>
              <div>✉️ contact@flexibook.studio</div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 FlexiBook Engine. All rights reserved. Developed with NestJS & React.</div>
          <div>Bảo Mật • Chuẩn NAPAS 247 • Hiệu Năng Cao</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
