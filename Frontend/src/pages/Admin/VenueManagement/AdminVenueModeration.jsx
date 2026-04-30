import React, { useMemo, useState } from "react";
import {
  CircleDot,
  Download,
  Lock,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  Unlock,
  Volleyball,
  Waves,
  Goal,
  Dumbbell,
} from "lucide-react";
import "../adminPages.css";

const venueMetaById = {
  "VEN-101": {
    sport: "Bóng đá",
    location: "Quận 7, TP.HCM",
    bookings: "12/15",
    rate: "$45.00",
    accent: "football",
  },
  "VEN-102": {
    sport: "Bóng rổ",
    location: "Quận 1, TP.HCM",
    bookings: "0/10",
    rate: "$38.00",
    accent: "basketball",
  },
  "VEN-103": {
    sport: "Tennis",
    location: "TP. Thủ Đức, TP.HCM",
    bookings: "5/8",
    rate: "$25.00",
    accent: "tennis",
  },
};

const fallbackMeta = [
  {
    sport: "Bơi lội",
    location: "Quận 3, TP.HCM",
    bookings: "20/30",
    rate: "$15.00",
    accent: "swimming",
  },
  {
    sport: "Bóng chuyền",
    location: "Quận 10, TP.HCM",
    bookings: "0/12",
    rate: "$30.00",
    accent: "volleyball",
  },
  {
    sport: "Bóng đá",
    location: "Quận Gò Vấp, TP.HCM",
    bookings: "8/10",
    rate: "$40.00",
    accent: "football",
  },
];

const sportOptions = ["Tất cả sân", "Bóng đá", "Bóng rổ", "Tennis", "Bóng chuyền", "Bơi lội"];

const sportIcons = {
  "Bóng đá": Goal,
  "Bóng rổ": CircleDot,
  Tennis: Dumbbell,
  "Bóng chuyền": Volleyball,
  "Bơi lội": Waves,
};

const AdminVenueModeration = () => {
  const [venues, setVenues] = useState();
  const [activeSport, setActiveSport] = useState("Tất cả sân");

  const enrichedVenues = useMemo(
    () =>
      venues.map((item, index) => ({
        ...item,
        ...venueMetaById[item.id],
        ...(venueMetaById[item.id] ? null : fallbackMeta[index % fallbackMeta.length]),
      })),
    [venues],
  );

  const visibleVenues = useMemo(() => {
    if (activeSport === "Tất cả sân") return enrichedVenues;
    return enrichedVenues.filter((item) => item.sport === activeSport);
  }, [activeSport, enrichedVenues]);

  const venueSummary = useMemo(() => {
    const openCount = enrichedVenues.filter((item) => item.status === "Đang mở").length;
    const lockedCount = enrichedVenues.length - openCount;
    return { openCount, lockedCount };
  }, [enrichedVenues]);

  const toggleLock = (venueId) => {
    setVenues((prev) =>
      prev.map((item) =>
        item.id === venueId
          ? { ...item, status: item.status === "Đã khóa" ? "Đang mở" : "Đã khóa" }
          : item,
      ),
    );
  };

  const exportVenueReport = () => {
    const csvRows = [
      ["Mã sân", "Tên sân", "Chủ sân", "Môn thể thao", "Địa điểm", "Trạng thái"],
      ...enrichedVenues.map((item) => [item.id, item.name, item.owner, item.sport, item.location, item.status]),
    ];

    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bao-cao-quan-ly-san.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-page admin-venue-page">
      <div className="admin-venue-toolbar">
        <div>
          <h2 className="admin-title">Quản lý sân</h2>
          <p className="admin-subtitle">Theo dõi và kiểm soát trạng thái vận hành của toàn bộ cơ sở thể thao đã đăng ký.</p>
        </div>

        <div className="admin-venue-toolbar__actions">
          <button type="button" className="admin-btn admin-btn-soft" onClick={exportVenueReport}>
            <Download size={16} />
            <span>Xuất báo cáo</span>
          </button>
          <button type="button" className="admin-btn admin-btn-primary">
            <Plus size={16} />
            <span>Thêm sân</span>
          </button>
        </div>
      </div>

      <div className="admin-venue-filters">
        {sportOptions.map((sport) => {
          const Icon = sportIcons[sport.replace("Tất cả sân", "")] || ShieldCheck;
          const isActive = sport === activeSport;

          return (
            <button
              key={sport}
              type="button"
              className={`admin-venue-filter${isActive ? " is-active" : ""}`}
              onClick={() => setActiveSport(sport)}
            >
              <Icon size={14} />
              <span>{sport}</span>
            </button>
          );
        })}
      </div>

      <div className="admin-venue-grid">
        {visibleVenues.map((item) => {
          const isLocked = item.status === "Đã khóa";

          return (
            <article key={item.id} className="admin-venue-card">
              <div className={`admin-venue-card__cover admin-venue-card__cover--${item.accent}`}>
                <span className="admin-venue-card__sport-chip">{item.sport}</span>
                {item.id === enrichedVenues[enrichedVenues.length - 1]?.id && (
                  <div className="admin-venue-card__footer-stats">
                    <span><i className="dot dot--green" /> {venueSummary.openCount} sân đang mở</span>
                    <span><i className="dot dot--red" /> {venueSummary.lockedCount} sân đã khóa</span>
                  </div>
                )}
              </div>

              <div className="admin-venue-card__body">
                <div className="admin-venue-card__heading-row">
                  <h3>{item.name}</h3>
                  <span className={`admin-venue-card__status ${isLocked ? "is-locked" : "is-open"}`}>
                    {item.status}
                  </span>
                </div>

                <p className="admin-venue-card__location">
                  <MapPin size={14} />
                  <span>{item.location}</span>
                </p>

                <div className="admin-venue-card__metrics">
                  <div>
                    <span>LƯỢT ĐẶT / NGÀY</span>
                    <strong>{item.bookings}</strong>
                  </div>
                  <div>
                    <span>GIÁ / GIỜ</span>
                    <strong>{item.rate}</strong>
                  </div>
                </div>

                <div className="admin-venue-card__actions">
                  <button
                    type="button"
                    className={`admin-venue-card__toggle ${isLocked ? "is-open" : "is-lock"}`}
                    onClick={() => toggleLock(item.id)}
                  >
                    {isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                    <span>{isLocked ? "Mở sân" : "Khóa sân"}</span>
                  </button>

                  <button type="button" className="admin-venue-card__settings" aria-label={`Cài đặt cho ${item.name}`}>
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AdminVenueModeration;
