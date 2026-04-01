import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Copy, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { getOwnerVenueFields } from "../../services/fieldService";
import { getSportTypes } from "../../services/sportTypeService";
import { getVenueDraft } from "../../services/venueService";
import {
  getOwnerVenueTimeSlots,
  createOwnerVenueTimeSlot,
  updateOwnerVenueTimeSlot,
  deleteOwnerVenueTimeSlot,
} from "../../services/venueTimeSlotService";
import "./OwnerVenueDetail.css";

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
  }));

  const findOrAddRow = (start, end) => {
    let row = base.find((x) => x.start === start && x.end === end);
    if (!row) {
      const key = `${start}-${end}`;
      row = { id: key, start, end, prices: {}, slotIds: {} };
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

/** Quản lý time slot theo loại sân (môn) — route `/owner/venues/:id/create-field` */
const OwnerCreateField = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      });
    }
    return rows;
  }, [venueOpenTime, venueCloseTime, slotDuration]);

  const reloadSlots = useCallback(async () => {
    const sid = Number(sportTypeId);
    if (!sid || !generatedSlots.length) {
      setSlotRows(generatedSlots.map((r) => ({ ...r, prices: { ...r.prices }, slotIds: {} })));
      return;
    }
    setLoadingSlots(true);
    try {
      const { timeSlots } = await getOwnerVenueTimeSlots(id, sid);
      setSlotRows(mergeApiSlotsIntoRows(timeSlots, generatedSlots, weekDates));
    } catch {
      toast.error("Không tải được khung giờ từ máy chủ.");
      setSlotRows(generatedSlots.map((r) => ({ ...r, prices: { ...r.prices }, slotIds: {} })));
    } finally {
      setLoadingSlots(false);
    }
  }, [id, sportTypeId, generatedSlots, weekDates]);

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

  return (
    <div className="owner-venue-detail">
      <div className="ovd-header">
        <button className="ovd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}/add-field`}>
            + Thêm sân
          </Link>
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}`}>
            Chi tiết cơ sở
          </Link>
        </div>
      </div>

      <div className="ovd-card">
        <div className="ovd-title-row">
          <h3 className="ovd-subtitle">
            <Calendar size={18} /> Quản lý time slot theo loại sân
          </h3>
        </div>
        <p className="ovd-muted">
          Giờ hoạt động của cơ sở:{" "}
          <strong>
            {formatTime(venueOpenTime)} - {formatTime(venueCloseTime)}
          </strong>
          . Chọn loại sân (môn) để chỉnh giá theo từng khung giờ trong tuần. Có thể chọn{" "}
          <strong>bất kỳ môn nào</strong> trong hệ thống (không bị giới hạn bởi sân đã tạo).
        </p>

        <div className="ovd-fields">
          {sportTypeOptions.length > 0 ? (
            <div className="ovd-sport-chips" role="group" aria-label="Chọn môn nhanh">
              {sportTypeOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ovd-sport-chip ${String(sportTypeId) === String(s.id) ? "is-active" : ""}`}
                  onClick={() => setSportTypeId(String(s.id))}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="ovd-schedule-sport-picker">
            <label className="ovd-label">
              Loại sân / môn thể thao
              <select
                className="ovd-input"
                value={sportTypeId}
                onChange={(e) => setSportTypeId(e.target.value)}
              >
                <option value="">-- Chọn môn --</option>
                {sportTypeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="ovd-muted">
            Sân thuộc loại này ({selectedSportTypeName || "—"}):{" "}
            <strong>{existingFieldsBySelectedType.length}</strong>
            {existingFieldsBySelectedType.length === 0 ? (
              <span> — có thể thêm sân trước khi khách đặt.</span>
            ) : null}
          </p>
          {existingFieldsBySelectedType.length > 0 ? (
            <div className="ovd-fields" style={{ marginTop: 8 }}>
              {existingFieldsBySelectedType.slice(0, 5).map((f) => {
                const fieldId = f?.fieldId ?? f?.FieldId;
                const fieldName = f?.fieldName ?? f?.FieldName ?? "—";
                return (
                  <div key={fieldId ?? fieldName} className="ovd-field-row">
                    <div className="ovd-field-main">
                      <strong className="ovd-field-name">{fieldName}</strong>
                    </div>
                  </div>
                );
              })}
              {existingFieldsBySelectedType.length > 5 ? (
                <p className="ovd-muted">… và {existingFieldsBySelectedType.length - 5} sân khác.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ovd-fields">
          <div className="ovd-title-row">
            <p className="ovd-muted">Khung giờ · {selectedSportTypeName || "chọn môn"}</p>
            <div className="ovd-week-controls">
              <select
                className="ovd-input"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value) === 30 ? 30 : 60)}
                style={{ maxWidth: 170 }}
              >
                <option value={60}>1 tiếng / slot</option>
                <option value={30}>30 phút / slot</option>
              </select>
            </div>
          </div>

          {loadingSlots ? (
            <p className="ovd-muted">Đang tải khung giờ…</p>
          ) : !sportTypeId ? (
            <p className="ovd-muted">Chọn loại sân / môn để xem và chỉnh khung giờ.</p>
          ) : slotRows.length === 0 ? (
            <p className="ovd-muted">
              Chưa có khung giờ nào (kiểm tra giờ mở cửa cơ sở hoặc chọn độ dài slot khác).
            </p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDayKey}
                className="ovd-day-card"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="ovd-day-card-head">
                  <div className="ovd-day-head-nav">
                    <button
                      type="button"
                      className="ovd-day-nav-btn"
                      disabled={activeDayIndex === 0}
                      onClick={() => setActiveDayIndex((prev) => Math.max(0, prev - 1))}
                    >
                      {"<"}
                    </button>
                    <span>{weekDayLabels[activeDayIndex]}</span>
                    <button
                      type="button"
                      className="ovd-day-nav-btn"
                      disabled={activeDayIndex === 6}
                      onClick={() => setActiveDayIndex((prev) => Math.min(6, prev + 1))}
                    >
                      {">"}
                    </button>
                  </div>
                  <div className="ovd-day-apply-all-wrap">
                    <button
                      type="button"
                      className="ovd-btn ovd-btn--secondary ovd-apply-all-days-btn"
                      onClick={applyCurrentDayToAllOtherDays}
                    >
                      <Copy size={15} /> Áp dụng giá cho các ngày còn lại
                    </button>
                  </div>
                </div>
                <div className="ovd-week-table-wrap">
                  <table className="ovd-week-table ovd-day-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="ovd-week-side-head">Khung giờ</th>
                        <th>Giá (đ)</th>
                        <th>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slotRows.map((row, rowIdx) => {
                        const value = row.prices?.[activeDayKey];
                        return (
                          <tr key={`${activeDayKey}-${row.id ?? rowIdx}`}>
                            <td>{rowIdx + 1}</td>
                            <td className="ovd-week-slot ovd-slot-edit-cell">
                              <div className="ovd-slot-edit-inline">
                                <select
                                  className="ovd-week-time-select"
                                  value={row.start}
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
                                    <option key={`${row.id}-start-${t}`} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                                <span>-</span>
                                <select
                                  className="ovd-week-time-select"
                                  value={row.end}
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
                                    <option key={`${row.id}-end-${t}`} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="ovd-week-cell">
                              <input
                                type="number"
                                min="0"
                                className="ovd-week-price-input"
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
                            </td>
                            <td>
                              <button
                                type="button"
                                className="ovd-week-delete-btn"
                                disabled={saving}
                                onClick={() => removeRow(rowIdx)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="ovd-add-slot-wrap">
                  <button
                    type="button"
                    className="ovd-add-slot-btn"
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
                        },
                      ]);
                    }}
                  >
                    <Plus size={16} /> Thêm khung giờ
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="ovd-create-actions">
          <button
            type="button"
            className="ovd-btn ovd-btn--primary"
            disabled={saving || !sportTypeId || loadingSlots}
            onClick={saveSlots}
          >
            {saving ? "Đang lưu…" : "Lưu khung giờ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerCreateField;
