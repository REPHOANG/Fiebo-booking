import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Trash2, Clock, Save, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import { getOwnerVenueFields } from "../../services/fieldService";
import { getSportTypes } from "../../services/sportTypeService";
import { getVenueDraft, getOwnerVenues } from "../../services/venueService";
import {
  getOwnerVenueTimeSlots,
  createOwnerVenueTimeSlot,
  updateOwnerVenueTimeSlot,
  deleteOwnerVenueTimeSlot,
} from "../../services/venueTimeSlotService";
import "./OwnerTimeSlot.css";

const translateFieldStatus = (raw) => {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "active" || s === "1") return { label: "Đang hoạt động", paused: false };
  if (s === "inactive" || s === "draft" || s === "0") return { label: "Tạm dừng", paused: true };
  if (!s || s === "—") return { label: "Đang hoạt động", paused: false };
  return { label: String(raw), paused: /inactive|pause|draft/i.test(s) };
};

const DOTNET_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatTime = (timeSpan) => {
  if (!timeSpan) return "—";
  const parts = String(timeSpan).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(timeSpan);
};

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseHour = (hhmm) => {
  const mins = timeToMinutes(hhmm);
  return mins == null ? 0 : mins;
};

const timeToMinutes = (timeLike) => {
  const s = String(timeLike || "").trim();
  if (!s) return null;
  const parts = s.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const minutesToHHMM = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const buildTimeOptions = (openTime, closeTime) => {
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const fallbackStart = 6 * 60;
  const fallbackEnd = 23 * 60;
  const start = openMin == null ? fallbackStart : openMin;
  const end = closeMin == null ? fallbackEnd : closeMin;
  const options = [];
  for (let cur = start; cur <= end; cur += 30) {
    options.push(minutesToHHMM(cur));
  }
  return options;
};

const toTimeOnly = (hhmm) => {
  const s = String(hhmm || "").trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
};

const mergeApiSlotsIntoRows = (apiSlots, generatedSlots, weekDates) => {
  const dateKeyByDayName = {};
  weekDates.forEach((d) => {
    dateKeyByDayName[DOTNET_DAY_NAMES[d.getDay()]] = toIsoDate(d);
  });

  const base = generatedSlots.map((r) => ({
    ...r,
    prices: { ...(r.prices || {}) },
    slotIds: {},
    isPeak: Boolean(r.isPeak),
  }));

  const findOrAddRow = (start, end) => {
    let row = base.find((x) => x.start === start && x.end === end);
    if (!row) {
      const key = `${start}-${end}`;
      row = { id: key, start, end, prices: {}, slotIds: {}, isPeak: false };
      base.push(row);
    }
    return row;
  };

  for (const s of apiSlots || []) {
    const start = formatTime(s.startTime ?? s.StartTime);
    const end = formatTime(s.endTime ?? s.EndTime);
    const row = findOrAddRow(start, end);
    const dayName = s.dayOfWeek ?? s.DayOfWeek;
    const dk = dateKeyByDayName[dayName];
    if (!dk) continue;
    row.prices[dk] = Number(s.price ?? s.Price ?? 0);
    row.slotIds[dk] = s.id ?? s.Id;
  }

  return base.sort((a, b) => parseHour(a.start) - parseHour(b.start));
};

/** Quản lý time slot theo loại sân (môn) — route `/owner/venues/:id/time-slot` */
const OwnerTimeSlot = () => {
  const { id } = useParams();
  const [sportTypes, setSportTypes] = useState([]);
  const [venueFields, setVenueFields] = useState([]);
  const [slotRows, setSlotRows] = useState([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [venueOpenTime, setVenueOpenTime] = useState(null);
  const [venueCloseTime, setVenueCloseTime] = useState(null);
  const [sportTypeId, setSportTypeId] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerVenuesList, setOwnerVenuesList] = useState([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState(() => new Set());
  const otsPageRef = useRef(null);

  /** Không cho lăn chuột đổi giá trị: ô giá (number), mọi select (giờ, môn, độ dài slot…) */
  useLayoutEffect(() => {
    const root = otsPageRef.current;
    if (!root) return;
    const onWheelCapture = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('input[type="number"], select')) e.preventDefault();
    };
    root.addEventListener("wheel", onWheelCapture, { passive: false, capture: true });
    return () => root.removeEventListener("wheel", onWheelCapture, true);
  }, []);

  /** Tất cả môn trong hệ thống — cho phép cấu hình time slot trước khi có sân thuộc môn đó. */
  const sportTypeOptions = useMemo(
    () =>
      [...sportTypes].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "vi", { sensitivity: "base" }),
      ),
    [sportTypes],
  );

  const selectedSportTypeName = useMemo(() => {
    const found = sportTypeOptions.find((s) => String(s.id) === String(sportTypeId));
    return found?.name ?? "";
  }, [sportTypeOptions, sportTypeId]);

  const existingFieldsBySelectedType = useMemo(() => {
    if (!selectedSportTypeName) return venueFields;
    const selectedKey = normalizeText(selectedSportTypeName);
    return (venueFields || []).filter(
      (f) => normalizeText(f?.sportType ?? f?.SportType ?? "") === selectedKey,
    );
  }, [venueFields, selectedSportTypeName]);

  const fieldIdsKey = useMemo(
    () =>
      existingFieldsBySelectedType
        .map((f) => String(f?.fieldId ?? f?.FieldId ?? ""))
        .filter(Boolean)
        .sort()
        .join("|"),
    [existingFieldsBySelectedType],
  );

  useEffect(() => {
    const ids = existingFieldsBySelectedType
      .map((f) => f?.fieldId ?? f?.FieldId)
      .filter((x) => x != null);
    setSelectedFieldIds(new Set(ids.map((x) => String(x))));
  }, [fieldIdsKey]);

  const weekDates = useMemo(() => {
    const base = new Date();
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return d;
    });
  }, []);

  const weekDayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const activeDayKey = useMemo(() => toIsoDate(weekDates[activeDayIndex]), [weekDates, activeDayIndex]);
  const otherDayKeys = useMemo(
    () => weekDates.map((d) => toIsoDate(d)).filter((k) => k !== activeDayKey),
    [weekDates, activeDayKey],
  );

  /** Gắn thêm trên từng ô giá (một số trình duyệt chỉ chặn ổn định khi listener trên chính input) */
  useEffect(() => {
    const root = otsPageRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll('input[type="number"]');
    const prevent = (e) => e.preventDefault();
    nodes.forEach((el) => el.addEventListener("wheel", prevent, { passive: false }));
    return () => nodes.forEach((el) => el.removeEventListener("wheel", prevent));
  }, [slotRows, activeDayKey, sportTypeId, loadingSlots]);

  const timeOptions = useMemo(() => buildTimeOptions(venueOpenTime, venueCloseTime), [venueOpenTime, venueCloseTime]);

  const generatedSlots = useMemo(() => {
    const openMin = timeToMinutes(venueOpenTime);
    const closeMin = timeToMinutes(venueCloseTime);
    if (openMin == null || closeMin == null || closeMin <= openMin) return [];
    const step = Number(slotDuration) === 30 ? 30 : 60;
    const rows = [];
    for (let cur = openMin; cur + step <= closeMin; cur += step) {
      const start = minutesToHHMM(cur);
      const end = minutesToHHMM(cur + step);
      rows.push({
        id: `${start}-${end}`,
        start,
        end,
        prices: {},
        slotIds: {},
        isPeak: false,
      });
    }
    return rows;
  }, [venueOpenTime, venueCloseTime, slotDuration]);

  const reloadSlots = useCallback(async () => {
    const sid = Number(sportTypeId);
    if (!sid || !generatedSlots.length) {
      setSlotRows(
        generatedSlots.map((r) => ({
          ...r,
          prices: { ...r.prices },
          slotIds: {},
          isPeak: Boolean(r.isPeak),
        })),
      );
      return;
    }
    setLoadingSlots(true);
    try {
      const { timeSlots } = await getOwnerVenueTimeSlots(id, sid);
      setSlotRows(mergeApiSlotsIntoRows(timeSlots, generatedSlots, weekDates));
    } catch {
      toast.error("Không tải được khung giờ từ máy chủ.");
      setSlotRows(
        generatedSlots.map((r) => ({
          ...r,
          prices: { ...r.prices },
          slotIds: {},
          isPeak: Boolean(r.isPeak),
        })),
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [id, sportTypeId, generatedSlots, weekDates]);

  const togglePeakRow = (rowIdx) => {
    setSlotRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, isPeak: !r.isPeak } : r)),
    );
  };

  const toggleFieldCard = (fid) => {
    const key = String(fid ?? "");
    if (!key) return;
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyCurrentDayToAllOtherDays = () => {
    if (!slotRows.length || !otherDayKeys.length) return;
    const sourceKey = activeDayKey;
    setSlotRows((prev) =>
      prev.map((row) => {
        const raw = row.prices?.[sourceKey];
        const price = raw === "" || raw === undefined || raw === null ? 0 : Number(raw);
        const nextPrices = { ...(row.prices || {}) };
        otherDayKeys.forEach((k) => {
          nextPrices[k] = price;
        });
        return {
          ...row,
          prices: nextPrices,
        };
      }),
    );
    toast.success("Đã áp dụng giá của ngày này cho các ngày còn lại trong tuần (lưu để đồng bộ máy chủ).");
  };

  const sortedOwnerVenues = useMemo(() => {
    return [...ownerVenuesList].sort((a, b) => {
      const na = String(a?.name ?? a?.Name ?? "");
      const nb = String(b?.name ?? b?.Name ?? "");
      return na.localeCompare(nb, "vi", { sensitivity: "base" });
    });
  }, [ownerVenuesList]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getOwnerVenues();
        if (mounted) setOwnerVenuesList(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setOwnerVenuesList([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSportTypes();
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: x?.id ?? x?.sportTypeId ?? x?.SportTypeId,
            name: x?.name ?? x?.sportTypeName ?? x?.SportTypeName,
          }))
          .filter((x) => x.id != null && x.name);
        if (mounted) setSportTypes(normalized);
      } catch {
        if (mounted) setSportTypes([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getVenueDraft(id);
        if (!mounted) return;
        setVenueOpenTime(data?.openTime ?? data?.OpenTime ?? null);
        setVenueCloseTime(data?.closeTime ?? data?.CloseTime ?? null);
      } catch {
        if (!mounted) return;
        setVenueOpenTime(null);
        setVenueCloseTime(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getOwnerVenueFields(id);
        if (mounted) setVenueFields(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setVenueFields([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!sportTypeOptions.length) return;
    const exists = sportTypeOptions.some((s) => String(s.id) === String(sportTypeId));
    if (!exists) {
      setSportTypeId(String(sportTypeOptions[0].id));
    }
  }, [sportTypeOptions, sportTypeId]);

  useEffect(() => {
    reloadSlots();
  }, [reloadSlots]);

  const saveSlots = async () => {
    const sid = Number(sportTypeId);
    if (!sid) {
      toast.error("Vui lòng chọn loại sân / môn thể thao.");
      return;
    }
    setSaving(true);
    try {
      for (const row of slotRows) {
        for (const d of weekDates) {
          const dk = toIsoDate(d);
          const dow = DOTNET_DAY_NAMES[d.getDay()];
          const rawPrice = row.prices?.[dk];
          const price =
            rawPrice === "" || rawPrice === undefined || rawPrice === null ? 0 : Number(rawPrice);
          const existingId = row.slotIds?.[dk];
          const startT = toTimeOnly(row.start);
          const endT = toTimeOnly(row.end);

          if (existingId) {
            if (price <= 0) {
              await deleteOwnerVenueTimeSlot(existingId);
            } else {
              await updateOwnerVenueTimeSlot(existingId, {
                startTime: startT,
                endTime: endT,
                price,
              });
            }
          } else if (price > 0) {
            await createOwnerVenueTimeSlot(id, {
              sportTypeId: sid,
              startTime: startT,
              endTime: endT,
              dayOfWeek: dow,
              price,
            });
          }
        }
      }
      toast.success("Đã lưu khung giờ.");
      await reloadSlots();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không lưu được khung giờ.");
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (rowIdx) => {
    const row = slotRows[rowIdx];
    const ids = new Set();
    weekDates.forEach((d) => {
      const sid = row.slotIds?.[toIsoDate(d)];
      if (sid) ids.add(sid);
    });
    if (ids.size === 0) {
      setSlotRows((prev) => prev.filter((_, i) => i !== rowIdx));
      return;
    }
    setSaving(true);
    try {
      for (const slotId of ids) {
        await deleteOwnerVenueTimeSlot(slotId);
      }
      setSlotRows((prev) => prev.filter((_, i) => i !== rowIdx));
      toast.success("Đã xóa khung giờ trên máy chủ.");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không xóa được khung giờ.");
    } finally {
      setSaving(false);
    }
  };

  const applyPriceDisabled =
    saving || !sportTypeId || loadingSlots || !slotRows.length || !otherDayKeys.length;
  const saveDisabled = saving || !sportTypeId || loadingSlots;

  return (
    <div className="ots-page" ref={otsPageRef}>
      <Link to={`/owner/venues/${id}`} className="ots-back-link">
        <ArrowLeft size={16} /> Quay lại chi tiết cơ sở
      </Link>

      <header className="ots-topbar">
        <div className="ots-topbar-main">
          <div>
            <span className="ots-eyebrow">ĐIỀU HÀNH HỆ THỐNG</span>
            <h1 className="ots-page-title">Quản lý Khung giờ</h1>
          </div>
          {sortedOwnerVenues.length > 0 ? (
            <nav className="ots-venue-tabs" aria-label="Chọn cơ sở">
              {sortedOwnerVenues
                .filter((v) => (v?.venueId ?? v?.VenueId ?? v?.id ?? v?.Id) != null)
                .map((v, idx) => {
                  const vid = v?.venueId ?? v?.VenueId ?? v?.id ?? v?.Id;
                  const vname = String(v?.name ?? v?.Name ?? "").trim() || `Cơ sở #${vid}`;
                  const short = vname.length > 28 ? `${vname.slice(0, 26)}…` : vname;
                  const active = String(vid) === String(id);
                  return (
                    <Link
                      key={vid}
                      to={`/owner/venues/${vid}/time-slot`}
                      className={`ots-venue-tab ${active ? "is-active" : ""}`}
                    >
                      CƠ SỞ {idx + 1}: {short.toUpperCase()}
                    </Link>
                  );
                })}
            </nav>
          ) : null}
        </div>
        <div className="ots-top-actions">
          <button
            type="button"
            className="ots-btn-apply"
            disabled={applyPriceDisabled}
            onClick={applyCurrentDayToAllOtherDays}
          >
            ÁP DỤNG GIÁ
          </button>
          <button type="button" className="ots-btn-save" disabled={saveDisabled} onClick={saveSlots}>
            {saving ? "Đang lưu…" : "LƯU THAY ĐỔI"}
          </button>
        </div>
      </header>

      <div className="ots-hero">
        <div className="ots-hero-text">
          <h2>Quản lý time slot theo loại sân</h2>
          <div className="ots-hours">
            <Clock size={18} strokeWidth={2} />
            <span>
              Giờ hoạt động của cơ sở:{" "}
              <strong>
                {formatTime(venueOpenTime)} – {formatTime(venueCloseTime)}
              </strong>
            </span>
          </div>
        </div>
        {sportTypeOptions.length > 0 ? (
          <div className="ots-sport-pills" role="group" aria-label="Chọn môn">
            {sportTypeOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ots-sport-pill ${String(sportTypeId) === String(s.id) ? "is-active" : ""}`}
                onClick={() => setSportTypeId(String(s.id))}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ots-layout">
        <aside className="ots-sidebar">
          <label className="ots-sidebar-label" htmlFor="ots-sport-select">
            CHỌN LOẠI SÂN / MÔN
          </label>
          <select
            id="ots-sport-select"
            className="ots-sidebar-select"
            value={sportTypeId}
            onChange={(e) => setSportTypeId(e.target.value)}
          >
            <option value="">— Chọn môn —</option>
            {sportTypeOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <h3 className="ots-fields-heading">DANH SÁCH CÁC SÂN ÁP DỤNG</h3>
          <div className="ots-field-list">
            {existingFieldsBySelectedType.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ots-muted)", margin: 0 }}>
                Chưa có sân cho môn này — có thể thêm sân trước khi khách đặt.
              </p>
            ) : (
              existingFieldsBySelectedType.map((f) => {
                const fieldId = f?.fieldId ?? f?.FieldId;
                const fieldName = f?.fieldName ?? f?.FieldName ?? "—";
                const st = translateFieldStatus(f?.status ?? f?.Status);
                const fidKey = fieldId != null ? String(fieldId) : fieldName;
                const selected = selectedFieldIds.has(fidKey);
                return (
                  <button
                    key={fidKey}
                    type="button"
                    className={`ots-field-card ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleFieldCard(fidKey)}
                  >
                    <span className="ots-field-check" aria-hidden>
                      {selected ? "✓" : ""}
                    </span>
                    <span className="ots-field-body">
                      <span className="ots-field-name">{fieldName}</span>
                      <span className={`ots-field-status ${st.paused ? "is-paused" : ""}`}>
                        {st.label}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="ots-info">
            <span className="ots-info-icon" aria-hidden>
              i
            </span>
            <div>
              Thay đổi giá tại đây áp dụng chung cho{" "}
              <strong>tất cả sân cùng môn</strong> tại cơ sở (theo hệ thống hiện tại). Danh sách bên
              trái giúp bạn đối chiếu sân đang dùng bảng giá này.
            </div>
          </div>

          <div className="ots-sidebar-links">
            <Link to={`/owner/venues/${id}/add-field`}>+ Thêm sân mới</Link>
            <Link to={`/owner/venues/${id}`}>Chi tiết cơ sở</Link>
          </div>
        </aside>

        <section className="ots-editor">
          <div className="ots-editor-head">
            <div className="ots-day-pills" role="tablist" aria-label="Chọn ngày trong tuần">
              {weekDayLabels.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={activeDayIndex === idx}
                  className={`ots-day-pill ${activeDayIndex === idx ? "is-active" : ""}`}
                  onClick={() => setActiveDayIndex(idx)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ots-apply-days"
              disabled={applyPriceDisabled}
              onClick={applyCurrentDayToAllOtherDays}
            >
              <Sparkles size={15} /> ÁP DỤNG GIÁ CHO CÁC NGÀY CÒN LẠI
            </button>
          </div>

          <div className="ots-slot-toolbar">
            <div className="ots-slot-duration">
              <Calendar size={16} />
              <span>Độ dài khung</span>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value) === 30 ? 30 : 60)}
              >
                <option value={60}>60 phút</option>
                <option value={30}>30 phút</option>
              </select>
            </div>
            <span className="ots-slot-toolbar-day">{weekDayLabels[activeDayIndex]}</span>
          </div>

          {loadingSlots ? (
            <div className="ots-loading">Đang tải khung giờ…</div>
          ) : !sportTypeId ? (
            <div className="ots-muted-block">Chọn môn / loại sân để xem và chỉnh khung giờ.</div>
          ) : slotRows.length === 0 ? (
            <div className="ots-muted-block">
              Chưa có khung giờ (kiểm tra giờ mở cửa cơ sở hoặc độ dài slot).
            </div>
          ) : (
            <>
              <div className="ots-table-head">
                <span>KHUNG GIỜ</span>
                <span>GIÁ NIÊM YẾT (đ)</span>
                <span />
              </div>
              <div className="ots-slot-rows">
                {slotRows.map((row, rowIdx) => {
                  const value = row.prices?.[activeDayKey];
                  return (
                    <div
                      key={`${activeDayKey}-${row.id ?? rowIdx}`}
                      className={`ots-slot-row ${row.isPeak ? "is-peak" : ""}`}
                    >
                      <div className="ots-slot-col ots-slot-col--time">
                        <div className="ots-slot-time">
                          <select
                            value={row.start}
                            aria-label="Giờ bắt đầu"
                            onChange={(e) => {
                              const nextStart = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === rowIdx
                                    ? { ...r, start: nextStart, id: `${nextStart}-${r.end}` }
                                    : r,
                                ),
                              );
                            }}
                          >
                            {timeOptions.map((t) => (
                              <option key={`${row.id}-s-${t}`} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <span>—</span>
                          <select
                            value={row.end}
                            aria-label="Giờ kết thúc"
                            onChange={(e) => {
                              const nextEnd = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === rowIdx
                                    ? { ...r, end: nextEnd, id: `${r.start}-${nextEnd}` }
                                    : r,
                                ),
                              );
                            }}
                          >
                            {timeOptions.map((t) => (
                              <option key={`${row.id}-e-${t}`} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {row.isPeak ? (
                            <span className="ots-peak-badge">GIỜ CAO ĐIỂM</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="ots-slot-peak-toggle"
                          onClick={() => togglePeakRow(rowIdx)}
                        >
                          {row.isPeak ? "Bỏ đánh cao điểm" : "Đánh dấu cao điểm"}
                        </button>
                      </div>
                      <div className="ots-slot-col ots-slot-col--price">
                        <div className="ots-price-wrap">
                          <input
                            className="ots-price-input"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={value ?? ""}
                            onChange={(e) => {
                              const nextRaw = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === rowIdx
                                    ? {
                                        ...r,
                                        prices: {
                                          ...(r.prices || {}),
                                          [activeDayKey]: nextRaw === "" ? "" : Number(nextRaw),
                                        },
                                      }
                                    : r,
                                ),
                              );
                            }}
                            onBlur={() => {
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === rowIdx
                                    ? {
                                        ...r,
                                        prices: {
                                          ...(r.prices || {}),
                                          [activeDayKey]:
                                            r?.prices?.[activeDayKey] === ""
                                              ? 0
                                              : r?.prices?.[activeDayKey],
                                        },
                                      }
                                    : r,
                                ),
                              );
                            }}
                          />
                          <span className="ots-price-suffix">đ</span>
                        </div>
                      </div>
                      <div className="ots-slot-col ots-slot-col--actions">
                        <button
                          type="button"
                          className="ots-del-btn"
                          disabled={saving}
                          title="Xóa khung giờ"
                          onClick={() => removeRow(rowIdx)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="ots-add-row">
                <button
                  type="button"
                  disabled={saving || !sportTypeId}
                  onClick={() => {
                    const step = Number(slotDuration) === 30 ? 30 : 60;
                    const last = slotRows[slotRows.length - 1];
                    const venueCloseMin = timeToMinutes(venueCloseTime);
                    const fallbackStart = venueOpenTime ? formatTime(venueOpenTime) : "06:00";
                    const lastEnd = last?.end ?? fallbackStart;
                    const nextStartMin = timeToMinutes(lastEnd) ?? timeToMinutes(fallbackStart) ?? 360;
                    const nextEndMin = nextStartMin + step;
                    if (venueCloseMin != null && nextEndMin > venueCloseMin) {
                      toast.info("Đã chạm giờ đóng cửa, không thể thêm slot.");
                      return;
                    }
                    const start = minutesToHHMM(nextStartMin);
                    const end = minutesToHHMM(nextEndMin);
                    setSlotRows((prev) => [
                      ...prev,
                      {
                        id: `${start}-${end}`,
                        start,
                        end,
                        prices: { [activeDayKey]: 0 },
                        slotIds: {},
                        isPeak: false,
                      },
                    ]);
                  }}
                >
                  <Plus size={16} /> Thêm khung giờ mới cho {weekDayLabels[activeDayIndex]}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <button
        type="button"
        className="ots-fab"
        disabled={saveDisabled}
        title="Lưu thay đổi"
        onClick={saveSlots}
      >
        <Save size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default OwnerTimeSlot;
