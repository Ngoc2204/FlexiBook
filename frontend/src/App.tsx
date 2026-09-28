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
  const [activeTab, setActiveTab] = useState<'booking' | 'tracking'>('booking');
  const [step, setStep] = useState<number>(1);

  // Data states
  const [settings, setSettings] = useState<BusinessSetting | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Booking form states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingNote, setBookingNote] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);
  const [qrInfo, setQrInfo] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Tracking tab
  const [searchCode, setSearchCode] = useState<string>('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const formatVND = (amount: number) => {
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  };

  // 1. Initial Load
  useEffect(() => {
    // Generate today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);

    // Fetch Settings
    fetch('/api/v1/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
          document.title = `${res.data.businessName || 'FlexiBook'} - Đặt Lịch Thông Minh`;
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
        if (res.success && res.data) setServices(res.data);
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

  // 3. Generate 7-day date cards
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

  // Filter services by category
  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.categoryId === selectedCategory;
  });

  // Submit Booking
  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng điền họ tên và số điện thoại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTimeISO = `${selectedDate}T${selectedTime}:00.000Z`;

      // Select assigned staff or fallback to first available
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

        // Fetch VietQR if deposit required
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

  const resetAll = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedTime(null);
    setCustomerName('');
    setCustomerPhone('');
    setBookingNote('');
    setCreatedBooking(null);
    setQrInfo(null);
    setStep(1);
  };

  const staffLabel = settings?.staffLabel || 'Kỹ thuật viên';
  const serviceLabel = settings?.serviceLabel || 'Dịch vụ';
  const businessName = settings?.businessName || 'FlexiBook Studio';

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <a href="/" className="brand-section">
            <div className="brand-badge">
              {businessName[0]?.toUpperCase() || 'F'}
            </div>
            <div>
              <div className="brand-name">{businessName}</div>
              <div className="brand-tagline">Hệ thống đặt lịch thông minh (Modular Engine)</div>
            </div>
          </a>

          <div className="nav-pills">
            <button
              className={`nav-pill-btn ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => setActiveTab('booking')}
            >
              <Calendar size={16} />
              Đặt Lịch Hẹn
            </button>
            <button
              className={`nav-pill-btn ${activeTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracking')}
            >
              <Search size={16} />
              Tra Cứu Lịch
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        {activeTab === 'booking' ? (
          <div>
            {/* Stepper */}
            {step < 5 && (
              <div className="stepper-container">
                <div className="stepper-line" />
                <div
                  className="stepper-progress"
                  style={{ width: `${((step - 1) / 3) * 76}%` }}
                />

                {[
                  { num: 1, label: serviceLabel },
                  { num: 2, label: staffLabel },
                  { num: 3, label: 'Khung giờ' },
                  { num: 4, label: 'Xác nhận' },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`step-node ${step === s.num ? 'active' : ''} ${
                      step > s.num ? 'done' : ''
                    }`}
                    onClick={() => step > s.num && setStep(s.num)}
                  >
                    <div className="step-circle">
                      {step > s.num ? <CheckCircle size={18} /> : s.num}
                    </div>
                    <div className="step-title">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 1: SERVICE SELECTION */}
            {step === 1 && (
              <section className="content-panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    <Scissors size={24} style={{ color: 'var(--primary)' }} />
                    Chọn {serviceLabel} bạn muốn trải nghiệm
                  </h2>
                  <p className="panel-subtitle">
                    Lựa chọn gói dịch vụ để hệ thống chuẩn bị khung giờ phù hợp
                  </p>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="category-bar">
                    <button
                      className={`category-chip ${
                        selectedCategory === 'ALL' ? 'active' : ''
                      }`}
                      onClick={() => setSelectedCategory('ALL')}
                    >
                      Tất cả
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        className={`category-chip ${
                          selectedCategory === c.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedCategory(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Services Grid */}
                <div className="cards-grid">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((srv) => (
                      <div
                        key={srv.id}
                        className={`item-card ${
                          selectedService?.id === srv.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedService(srv)}
                      >
                        <div className="card-heading">{srv.name}</div>
                        <div className="card-description">
                          {srv.description ||
                            'Dịch vụ chuyên nghiệp với tiêu chuẩn chăm sóc cao cấp.'}
                        </div>
                        <div className="card-footer">
                          <span className="pill-badge">
                            <Clock size={14} /> {srv.durationMin} phút
                          </span>
                          <span className="pill-badge pill-price">
                            {formatVND(srv.price)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '40px 0',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Chưa có dịch vụ nào trong danh mục này.
                    </div>
                  )}
                </div>

                <div className="action-row">
                  <div />
                  <button
                    className="btn-cta btn-cta-primary"
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                  >
                    Tiếp tục chọn {staffLabel} <ArrowRight size={18} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 2: STAFF SELECTION */}
            {step === 2 && (
              <section className="content-panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    <User size={24} style={{ color: 'var(--primary)' }} />
                    Chọn {staffLabel} phụ trách
                  </h2>
                  <p className="panel-subtitle">
                    Chọn người có tay nghề bạn tin tưởng hoặc chọn "Bất kỳ ai" để
                    có nhiều giờ trống nhất
                  </p>
                </div>

                <div className="cards-grid">
                  {/* Any Staff option */}
                  <div
                    className={`item-card ${selectedStaff === null ? 'selected' : ''}`}
                    onClick={() => setSelectedStaff(null)}
                  >
                    <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={20} style={{ color: '#F59E0B' }} />
                      Bất kỳ nhân viên khả dụng
                    </div>
                    <div className="card-description">
                      Hệ thống tự động ghép thợ có lịch trống phù hợp nhất với khung
                      giờ của bạn.
                    </div>
                    <div className="card-footer">
                      <span className="pill-badge" style={{ color: '#60A5FA' }}>
                        Linh hoạt thời gian nhất
                      </span>
                    </div>
                  </div>

                  {/* Specific Staff */}
                  {staffList
                    .filter(
                      (st) =>
                        !selectedService ||
                        st.services.some((s) => s.id === selectedService.id),
                    )
                    .map((st) => (
                      <div
                        key={st.id}
                        className={`item-card ${
                          selectedStaff?.id === st.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedStaff(st)}
                      >
                        <div className="card-heading">{st.user.fullName}</div>
                        <div className="card-description">
                          {st.title || 'Chuyên viên kỹ thuật cao cấp'}
                        </div>
                        <div className="card-footer">
                          <span className="pill-badge">
                            {st.services.length} dịch vụ đảm nhiệm
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="action-row">
                  <button
                    className="btn-cta btn-cta-secondary"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={18} /> Quay lại
                  </button>
                  <button
                    className="btn-cta btn-cta-primary"
                    onClick={() => setStep(3)}
                  >
                    Tiếp tục chọn giờ <ArrowRight size={18} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 3: DATE & TIME SELECTION */}
            {step === 3 && (
              <section className="content-panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    <Clock size={24} style={{ color: 'var(--primary)' }} />
                    Chọn Ngày & Khung giờ còn trống
                  </h2>
                  <p className="panel-subtitle">
                    Thuật toán Dynamic Time-Slot Engine tự động loại trừ ca bận
                    và giờ nghỉ
                  </p>
                </div>

                {/* 7-Days Row */}
                <div className="date-selector-row">
                  {next7Days.map((d) => (
                    <div
                      key={d.dateStr}
                      className={`date-pill ${
                        selectedDate === d.dateStr ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedDate(d.dateStr)}
                    >
                      <div className="date-pill-day">{d.label}</div>
                      <div className="date-pill-num">{d.dayNum}</div>
                      <div className="date-pill-month">Thg {d.monthNum}</div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                  Các khung giờ còn trống trong ngày:
                </h3>

                {isLoadingSlots ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '30px 0',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Đang tính toán các khung giờ trống...
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="slots-wrapper">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        className={`time-slot-btn ${
                          selectedTime === slot.time ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedTime(slot.time)}
                      >
                        <Clock size={14} />
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '30px 0',
                      color: 'var(--warning)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={20} />
                    Rất tiếc! Đã hết khung giờ khả dụng cho ngày này. Vui lòng chọn
                    ngày khác.
                  </div>
                )}

                <div className="action-row">
                  <button
                    className="btn-cta btn-cta-secondary"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft size={18} /> Quay lại
                  </button>
                  <button
                    className="btn-cta btn-cta-primary"
                    disabled={!selectedTime}
                    onClick={() => setStep(4)}
                  >
                    Tiếp tục xác nhận <ArrowRight size={18} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 4: CUSTOMER INFO & CONFIRMATION */}
            {step === 4 && selectedService && (
              <section className="content-panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
                    Thông tin khách hàng & Xác nhận
                  </h2>
                  <p className="panel-subtitle">
                    Kiểm tra lại thông tin đơn đặt lịch và cung cấp số điện thoại liên
                    hệ
                  </p>
                </div>

                {/* Summary Card */}
                <div className="booking-summary-card">
                  <div className="summary-item">
                    <span className="summary-key">
                      <Scissors size={16} /> {serviceLabel}:
                    </span>
                    <span>{selectedService.name}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-key">
                      <Clock size={16} /> Thời lượng thực hiện:
                    </span>
                    <span>{selectedService.durationMin} phút</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-key">
                      <User size={16} /> {staffLabel}:
                    </span>
                    <span>
                      {selectedStaff
                        ? selectedStaff.user.fullName
                        : 'Bất kỳ nhân viên'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-key">
                      <Calendar size={16} /> Khung giờ hẹn:
                    </span>
                    <span style={{ fontWeight: 700, color: '#60A5FA' }}>
                      {selectedTime} • {selectedDate}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-key">
                      <Tag size={16} /> Tổng tiền thanh toán:
                    </span>
                    <span>{formatVND(selectedService.price)}</span>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="input-group">
                  <label className="input-label">
                    Họ và tên của bạn <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Số điện thoại liên hệ <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Ví dụ: 0912345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Ghi chú đặc biệt (tùy chọn)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ví dụ: Da nhạy cảm, muốn cắt ngắn..."
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                  />
                </div>

                <div className="action-row">
                  <button
                    className="btn-cta btn-cta-secondary"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft size={18} /> Quay lại
                  </button>
                  <button
                    className="btn-cta btn-cta-primary"
                    disabled={isSubmitting}
                    onClick={handleBookingSubmit}
                  >
                    {isSubmitting ? (
                      'Đang xử lý (Redis Lock)...'
                    ) : (
                      <>
                        Xác nhận đặt lịch ngay <CheckCircle size={18} />
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* STEP 5: SUCCESS & VIETQR */}
            {step === 5 && createdBooking && (
              <section className="content-panel">
                <div className="success-box">
                  <div className="success-icon-badge">
                    <CheckCircle size={44} />
                  </div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399' }}>
                    ĐẶT LỊCH THÀNH CÔNG!
                  </h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                    Cảm ơn quý khách đã tin tưởng trải nghiệm dịch vụ.
                  </p>

                  <div
                    className="code-banner"
                    onClick={() => copyBookingCode(createdBooking.code)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>#{createdBooking.code}</span>
                    <Copy size={18} style={{ opacity: 0.8 }} />
                  </div>
                  {copiedCode && (
                    <div style={{ fontSize: '0.85rem', color: '#34D399' }}>
                      Đã sao chép mã lịch hẹn vào clipboard!
                    </div>
                  )}

                  {/* VietQR if Deposit Required */}
                  {settings?.requireDeposit && qrInfo && (
                    <div className="vietqr-card">
                      <h3
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: '#60A5FA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <QrCode size={20} /> Quét mã VietQR chuyển khoản cọc
                      </h3>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          marginBottom: 16,
                        }}
                      >
                        Webhook SePay sẽ tự động đối soát và chuyển trạng thái sang{' '}
                        <b>CONFIRMED</b> ngay khi nhận tiền!
                      </p>
                      <img
                        src={qrInfo.qrUrl}
                        alt="VietQR code"
                        className="qr-preview"
                      />
                      <div
                        style={{
                          marginTop: 16,
                          textAlign: 'left',
                          fontSize: '0.9rem',
                          background: 'rgba(0,0,0,0.3)',
                          padding: 14,
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          Số tiền cọc:{' '}
                          <b style={{ color: '#34D399' }}>
                            {formatVND(qrInfo.amount)}
                          </b>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          Ngân hàng: <b>{qrInfo.bankCode}</b> - STK:{' '}
                          <b>{qrInfo.accountNumber}</b>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          Nội dung: <b style={{ color: '#60A5FA' }}>{qrInfo.transferContent}</b>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 32 }}>
                    <button className="btn-cta btn-cta-primary" onClick={resetAll}>
                      Đặt thêm lịch hẹn khác
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          /* TAB 2: BOOKING LOOKUP */
          <section className="content-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Search size={24} style={{ color: 'var(--primary)' }} />
                Tra cứu thông tin lịch hẹn
              </h2>
              <p className="panel-subtitle">
                Nhập mã đặt lịch (ví dụ: FB-2026-XXXX) để kiểm tra trạng thái và lịch trình
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Nhập mã đặt lịch (ví dụ: FB-2026-ABCD)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: 1 }}
              />
              <button
                className="btn-cta btn-cta-primary"
                disabled={isSearching}
                onClick={handleSearchBooking}
              >
                {isSearching ? 'Đang tìm...' : 'Tra cứu'}
              </button>
            </div>

            {searchResult && (
              <div className="booking-summary-card">
                <div className="summary-item">
                  <span className="summary-key">Mã lịch hẹn:</span>
                  <span style={{ fontWeight: 800, color: '#60A5FA' }}>
                    #{searchResult.code}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Trạng thái:</span>
                  <span
                    className="pill-badge"
                    style={{
                      background:
                        searchResult.status === 'CONFIRMED'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        searchResult.status === 'CONFIRMED'
                          ? '#34D399'
                          : '#FBBF24',
                      fontWeight: 800,
                    }}
                  >
                    {searchResult.status}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Khách hàng:</span>
                  <span>
                    {searchResult.customer?.fullName} (
                    {searchResult.customer?.phone})
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">{serviceLabel}:</span>
                  <span>{searchResult.service?.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">{staffLabel}:</span>
                  <span>{searchResult.staff?.user?.fullName}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Thời gian hẹn:</span>
                  <span style={{ fontWeight: 700 }}>
                    {new Date(searchResult.startTime).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Tổng tiền:</span>
                  <span>{formatVND(searchResult.totalAmount)}</span>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          <b>FlexiBook Engine</b> • Modular Service Booking System (Spa, Salon,
          Clinic)
        </p>
        <p style={{ marginTop: 6, opacity: 0.7 }}>
          NestJS • PostgreSQL • Redis Mutex Lock • BullMQ • React TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;
