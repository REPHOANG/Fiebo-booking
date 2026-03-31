import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Copy, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { createOwnerField, getOwnerVenueFields, getVenueSchedule } from "../../services/fieldService";
import { getSportTypes } from "../../services/sportTypeService";
import { getVenueDraft } from "../../services/venueService";
import "./OwnerVenueDetail.css";

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

const isSlotLocked = (slotLike) => {
  const status = String(slotLike?.status ?? slotLike?.Status ?? "").toLowerCase();
  if (status.includes("lock") || status.includes("block") || status.includes("unavailable")) return true;
  return Boolean(
    slotLike?.isLocked ??
      slotLike?.IsLocked ??
      slotLike?.locked ??
      slotLike?.Locked ??
      slotLike?.isBlocked ??
      slotLike?.IsBlocked,
  );
};

const OwnerCreateField = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sportTypes, setSportTypes] = useState([]);
  const [venueFields, setVenueFields] = useState([]);
  const [slotRows, setSlotRows] = useState([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [creatingField, setCreatingField] = useState(false);
  const [venueOpenTime, setVenueOpenTime] = useState(null);
  const [venueCloseTime, setVenueCloseTime] = useState(null);
  const [newField, setNewField] = useState({
    name: "",
    sportTypeId: "",
    description: "",
    images: [],
  });

  const venueSportTypeNames = useMemo(() => {
    const set = new Set(
      (venueFields || [])
        .map((f) => String(f?.sportType ?? f?.SportType ?? "").trim())
        .filter(Boolean),
    );
    return Array.from(set);
  }, [venueFields]);

  const allowedSportTypeOptions = useMemo(() => {
    if (!sportTypes.length) return [];
    if (!venueSportTypeNames.length) return sportTypes;
    const venueTypeKeys = new Set(venueSportTypeNames.map(normalizeText));
    const filtered = sportTypes.filter((s) => venueTypeKeys.has(normalizeText(s.name)));
    return filtered.length ? filtered : sportTypes;
  }, [sportTypes, venueSportTypeNames]);

  const selectedSportTypeName = useMemo(() => {
    const found = allowedSportTypeOptions.find((s) => String(s.id) === String(newField.sportTypeId));
    return found?.name ?? "";
  }, [allowedSportTypeOptions, newField.sportTypeId]);

  const existingFieldsBySelectedType = useMemo(() => {
    if (!selectedSportTypeName) return venueFields;
    const selectedKey = normalizeText(selectedSportTypeName);
    return (venueFields || []).filter(
      (f) => normalizeText(f?.sportType ?? f?.SportType ?? "") === selectedKey,
    );
  }, [venueFields, selectedSportTypeName]);

  const weekDates = useMemo(() => {
    const base = new Date();
    const day = base.getDay(); // 0..6 (Sun..Sat)
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

  const applyCurrentDayToAllOtherDays = () => {
    if (!slotRows.length || !otherDayKeys.length) return;
    const sourceKey = activeDayKey;
    setSlotRows((prev) =>
      prev.map((row) => {
        const raw = row.prices?.[sourceKey];
        const price =
          raw === "" || raw === undefined || raw === null ? 0 : Number(raw);
        const locked = Boolean(row.locks?.[sourceKey]);
        const nextPrices = { ...(row.prices || {}) };
        const nextLocks = { ...(row.locks || {}) };
        otherDayKeys.forEach((k) => {
          nextPrices[k] = price;
          nextLocks[k] = locked;
        });
        return {
          ...row,
          prices: nextPrices,
          locks: nextLocks,
        };
      }),
    );
    toast.success(
      "Đã áp dụng khung giờ (theo từng hàng), giá và trạng thái khóa của ngày này cho các ngày còn lại trong tuần.",
    );
  };

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
        locks: {},
      });
    }
    return rows;
  }, [venueOpenTime, venueCloseTime, slotDuration]);

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
        const daySchedules = await Promise.all(
          weekDates.map((d) => getVenueSchedule(id, toIsoDate(d)).catch(() => null)),
        );
        const matrix = new Map(
          generatedSlots.map((row) => [
            `${row.start}-${row.end}`,
            { ...row, prices: {} },
          ]),
        );
        daySchedules.forEach((schedule, dayIdx) => {
          const allSportTypes = Array.isArray(schedule?.sportTypes) ? schedule.sportTypes : [];
          const source = selectedSportTypeName
            ? allSportTypes.filter(
                (st) =>
                  normalizeText(st?.sportTypeName ?? st?.sportType ?? "") ===
                  normalizeText(selectedSportTypeName),
              )
            : allSportTypes;
          source.forEach((st) => {
            (Array.isArray(st?.slots) ? st.slots : []).forEach((s, idx) => {
              const start = formatTime(s?.startTime ?? s?.StartTime);
              const end = formatTime(s?.endTime ?? s?.EndTime);
              const key = `${start}-${end}`;
              if (!matrix.has(key)) return;
              const row = matrix.get(key);
              row.prices[toIsoDate(weekDates[dayIdx])] = Number(s?.price ?? s?.Price ?? 0);
              row.locks = {
                ...(row.locks || {}),
                [toIsoDate(weekDates[dayIdx])]: isSlotLocked(s),
              };
            });
          });
        });
        const rows = Array.from(matrix.values()).sort((a, b) => parseHour(a.start) - parseHour(b.start));
        if (mounted) setSlotRows(rows);
      } catch {
        if (mounted) setSlotRows(generatedSlots);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, weekDates, selectedSportTypeName, generatedSlots]);

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
    if (!allowedSportTypeOptions.length) return;
    const exists = allowedSportTypeOptions.some(
      (s) => String(s.id) === String(newField.sportTypeId),
    );
    if (!exists) {
      setNewField((prev) => ({
        ...prev,
        sportTypeId: String(allowedSportTypeOptions[0].id),
      }));
    }
  }, [allowedSportTypeOptions, newField.sportTypeId]);

  return (
    <div className="owner-venue-detail">
      <div className="ovd-header">
        <button className="ovd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}`}>
            Chi tiết cơ sở
          </Link>
        </div>
      </div>

      <div className="ovd-card">
        <div className="ovd-title-row">
          <h3 className="ovd-subtitle">
            <Calendar size={18} /> Tạo sân mới
          </h3>
        </div>
        <p className="ovd-muted">
          Giờ hoạt động của cơ sở:{" "}
          <strong>
            {formatTime(venueOpenTime)} - {formatTime(venueCloseTime)}
          </strong>
        </p>
        <div className="ovd-create-grid">
          <label className="ovd-label">
            Tên sân
            <input
              className="ovd-input"
              value={newField.name}
              onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ví dụ: Sân 1"
            />
          </label>
          <label className="ovd-label ovd-full">
            Mô tả
            <textarea
              className="ovd-input"
              rows={3}
              value={newField.description}
              onChange={(e) => setNewField((p) => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả sân (tuỳ chọn)"
            />
          </label>
          <label className="ovd-label ovd-full">
            Ảnh sân
            <input
              className="ovd-input"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setNewField((p) => ({
                  ...p,
                  images: Array.from(e.target.files || []),
                }))
              }
            />
          </label>
        </div>
        <div className="ovd-fields">
          <p className="ovd-muted">
            Sân hiện có ({selectedSportTypeName || "tất cả môn"}):{" "}
            <strong>{existingFieldsBySelectedType.length}</strong>
          </p>
          {existingFieldsBySelectedType.length === 0 ? (
            <p className="ovd-muted">Chưa có sân cho loại môn này.</p>
          ) : (
            existingFieldsBySelectedType.map((f) => {
              const fieldId = f?.fieldId ?? f?.FieldId;
              const fieldName = f?.fieldName ?? f?.FieldName ?? "—";
              const sportName = f?.sportType ?? f?.SportType ?? "—";
              const status = f?.status ?? f?.Status ?? "—";
              const minPrice = f?.minPrice ?? f?.MinPrice;
              const maxPrice = f?.maxPrice ?? f?.MaxPrice;
              const priceLabel =
                minPrice != null && maxPrice != null
                  ? `${Number(minPrice).toLocaleString("vi-VN")} – ${Number(maxPrice).toLocaleString("vi-VN")} đ`
                  : "—";
              return (
                <div key={fieldId ?? fieldName} className="ovd-field-row">
                  <div className="ovd-field-main">
                    <strong className="ovd-field-name">{fieldName}</strong>
                    <span className="ovd-field-meta">{sportName}</span>
                  </div>
                  <div className="ovd-field-right">
                    <span className="ovd-field-price">{priceLabel}</span>
                    <span className="ovd-field-status">{status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="ovd-fields">
          <div className="ovd-schedule-sport-picker">
            <label className="ovd-label">
              Chọn môn thể thao
              <select
                className="ovd-input"
                value={newField.sportTypeId}
                onChange={(e) => setNewField((p) => ({ ...p, sportTypeId: e.target.value }))}
              >
                <option value="">-- Chọn môn thể thao --</option>
                {allowedSportTypeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ovd-title-row">
            <p className="ovd-muted">
              Khung giờ {selectedSportTypeName || "theo môn đã chọn"}
            </p>
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
          {slotRows.length === 0 ? (
            <p className="ovd-muted">Chưa có dữ liệu giá slot cho tuần này.</p>
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
                      <Copy size={15} /> Áp dụng cho tất cả các ngày còn lại
                    </button>
                  </div>
                </div>
                <div className="ovd-week-table-wrap">
                  <table className="ovd-week-table ovd-day-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="ovd-week-side-head">Slot</th>
                        <th>Giá</th>
                        <th>Trạng thái</th>
                        <th>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slotRows.map((row, rowIdx) => {
                        const value = row.prices?.[activeDayKey];
                        const locked = Boolean(row.locks?.[activeDayKey]);
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
                                        i === rowIdx ? { ...r, start: nextStart, id: `${nextStart}-${r.end}` } : r,
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
                                        i === rowIdx ? { ...r, end: nextEnd, id: `${r.start}-${nextEnd}` } : r,
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
                            <td className={locked ? "ovd-week-cell is-locked" : "ovd-week-cell"}>
                              <input
                                type="number"
                                min="0"
                                className="ovd-week-price-input"
                                value={value ?? ""}
                                disabled={locked}
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
                                                r?.prices?.[activeDayKey] === "" ? 0 : r?.prices?.[activeDayKey],
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
                                className={`ovd-week-lock-btn ${locked ? "is-locked" : ""}`}
                                onClick={() => {
                                  setSlotRows((prev) =>
                                    prev.map((r, i) =>
                                      i === rowIdx
                                        ? {
                                            ...r,
                                            locks: {
                                              ...(r.locks || {}),
                                              [activeDayKey]: !Boolean(r.locks?.[activeDayKey]),
                                            },
                                          }
                                        : r,
                                    ),
                                  );
                                }}
                              >
                                {locked ? "Mo khoa" : "Khoa"}
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="ovd-week-delete-btn"
                                onClick={() => {
                                  setSlotRows((prev) => prev.filter((_, i) => i !== rowIdx));
                                }}
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
                          locks: { [activeDayKey]: false },
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
            disabled={creatingField}
            onClick={async () => {
              if (!newField.name.trim()) {
                toast.error("Vui lòng nhập tên sân.");
                return;
              }
              if (!newField.sportTypeId) {
                toast.error("Vui lòng chọn môn thể thao.");
                return;
              }
              setCreatingField(true);
              try {
                await createOwnerField(id, {
                  name: newField.name.trim(),
                  sportTypeId: Number(newField.sportTypeId),
                  description: newField.description?.trim() || undefined,
                  images: newField.images,
                });
                toast.success("Tạo sân thành công.");
                navigate(`/owner/venues/${id}`);
              } catch (e) {
                toast.error(e?.response?.data?.message ?? e?.message ?? "Không tạo được sân.");
              } finally {
                setCreatingField(false);
              }
            }}
          >
            {creatingField ? "Đang tạo..." : "Tạo sân"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerCreateField;
