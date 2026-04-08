import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getVenueDetail, getVenueSchedule } from "../../../services/fieldService";
import { getOwnerVenueSelectOptions } from "../../../services/venueService";
import { createEvent, getEventList } from "../../../services/eventService";
import "./CreateEvent.css";

const createEventFormSchema = yup.object({
  venueId: yup.string().required("Vui lòng chọn cơ sở."),
  eventDate: yup.string().required("Vui lòng chọn ngày."),
  pricePerPerson: yup
    .number()
    .transform((v, o) => (o === "" || o == null || Number.isNaN(v) ? undefined : v))
    .typeError("Nhập phí hợp lệ")
    .required("Nhập phí tham gia")
    .positive("Phí tham gia phải lớn hơn 0"),
  minPlayer: yup
    .number()
    .transform((v, o) => (o === "" || o == null || Number.isNaN(v) ? undefined : v))
    .typeError("Nhập số hợp lệ")
    .min(1, "Số người tối thiểu phải lớn hơn 0")
    .required(),
  maxPlayer: yup
    .number()
    .transform((v, o) => (o === "" || o == null || Number.isNaN(v) ? undefined : v))
    .typeError("Nhập số hợp lệ")
    .min(1, "Số người tối đa không hợp lệ")
    .required()
    .test("max-ge-min", "Số người tối đa phải ≥ số tối thiểu", function maxTest(max) {
      const min = this.parent.minPlayer;
      if (min == null || max == null) return true;
      return max >= min;
    }),
  description: yup.string().optional(),
});

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

/** Chuẩn hóa thời gian từ API (e.g. "18:00:00" hoặc "18:00") thành "HH:mm" */
const normalizeTime = (t) => {
  if (!t) return "";
  const s = String(t).trim();
  const part = s.split(":")[0] + ":" + (s.split(":")[1] || "00");
  return part.length === 5 ? part : part.slice(0, 5);
};

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

/** Ghép ngày (YYYY-MM-DD) + giờ bắt đầu slot → Date theo giờ máy người dùng */
function parseLocalSlotStart(isoDate, startTime) {
  const dateStr = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = normalizeTime(startTime);
  if (!t) return null;
  const [hh, mm] = t.split(":").map((n) => Number(n));
  return new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0);
}

/** Slot đã bắt đầu hoặc đã hết (so với hiện tại) → không cho tạo sự kiện */
function isSlotStartInPast(eventDateStr, startTime) {
  const slotStart = parseLocalSlotStart(eventDateStr, startTime);
  if (!slotStart || Number.isNaN(slotStart.getTime())) return false;
  return slotStart.getTime() <= Date.now();
}

/** Set các key "fieldName_startTime" đang bị chiếm bởi sự kiện (từ danh sách event theo venue+ngày) */
function getEventOccupiedKeys(eventList, venueName, dateStr) {
  const keys = new Set();
  const venueNorm = String(venueName || "").trim().toLowerCase();
  const dateNorm = String(dateStr || "").slice(0, 10);
  for (const e of eventList || []) {
    if (dateNorm && String(e?.eventDate || "").slice(0, 10) !== dateNorm) continue;
    if (venueNorm && String(e?.venueName || "").trim().toLowerCase() !== venueNorm) continue;
    for (const s of e?.slots || []) {
      const name = String(s?.fieldName || "").trim();
      const start = normalizeTime(s?.startTime);
      if (name && start) keys.add(`${name}_${start}`);
    }
  }
  return keys;
}

/**
 * Trả về tất cả slot theo từng sân, mỗi slot có status: 'available' | 'booked' | 'event' | 'past'
 * - booked: từ schedule field.unavailableSlots (đã có người đặt sân)
 * - event: từ danh sách sự kiện cùng venue+ngày (slot đã nằm trong sự kiện khác)
 * - past: khung giờ đã qua (so với thời điểm hiện tại, cùng ngày hoặc ngày trong quá khứ)
 */
function getSlotsByFieldWithStatus(schedule, eventOccupiedKeys, eventDateStr) {
  const groups = [];
  if (!schedule?.sportTypes?.length) return groups;
  const dateKey = String(eventDateStr || "").slice(0, 10);
  for (const st of schedule.sportTypes) {
    const sportTypeName =
      pick(st, "sportTypeName", "SportTypeName") ??
      pick(st, "sportType", "SportType") ??
      pick(st, "sportName", "SportName") ??
      "";
    const slots = st.slots || [];
    const fields = st.fields || [];
    for (const field of fields) {
      const fieldId = field.fieldId ?? field.id;
      const fieldName = field.fieldName ?? field.name ?? "Sân";
      const unavailableSet = new Set((field.unavailableSlots || []).map((u) => u.slotId));
      const list = [];
      for (const slot of slots) {
        const slotId = slot.slotId ?? slot.id;
        const startTime = slot.startTime;
        const endTime = slot.endTime;
        const timeKey = `${fieldName}_${normalizeTime(startTime)}`;
        let status = "available";
        if (unavailableSet.has(slotId)) status = "booked";
        else if (eventOccupiedKeys.has(timeKey)) status = "event";
        else if (dateKey && isSlotStartInPast(dateKey, startTime)) status = "past";
        list.push({
          fieldId,
          slotId,
          fieldName,
          startTime,
          endTime,
          status,
        });
      }
      groups.push({ fieldId, fieldName, sportTypeName, slots: list });
    }
  }
  return groups.sort((a, b) => (a.fieldName || "").localeCompare(b.fieldName || ""));
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createEventFormSchema),
    mode: "onSubmit",
    defaultValues: {
      venueId: "",
      eventDate: "",
      pricePerPerson: "",
      minPlayer: "4",
      maxPlayer: "10",
      description: "",
    },
  });

  const venueId = watch("venueId");
  const eventDate = watch("eventDate");

  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [venue, setVenue] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [eventListForDate, setEventListForDate] = useState([]);
  const [loadingVenue, setLoadingVenue] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState([]); // [{ fieldId, slotId }]
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [slotSelectionError, setSlotSelectionError] = useState(false);
  const [expandedFieldId, setExpandedFieldId] = useState(null);
  /** "" = tất cả loại sân; khác thì lọc theo sportTypeName */
  const [sportTypeFilter, setSportTypeFilter] = useState("");
  /** Làm mới trạng thái "đã qua" khi đang xem ngày hôm nay (mỗi 30s) */
  const [pastSlotsTick, setPastSlotsTick] = useState(0);

  const venueDisplayName =
    venue?.name ?? venue?.venueName ?? venue?.Name ?? venue?.VenueName;

  /** Slot bị chiếm bởi sự kiện khác (key = fieldName_startTime) */
  const eventOccupiedKeys = useMemo(
    () =>
      getEventOccupiedKeys(eventListForDate, venueDisplayName, eventDate),
    [eventListForDate, venueDisplayName, eventDate],
  );

  /** Tất cả slot theo sân, mỗi slot có status: available | booked | event | past */
  const slotsByFieldWithStatus = useMemo(
    () => getSlotsByFieldWithStatus(schedule, eventOccupiedKeys, eventDate),
    [schedule, eventOccupiedKeys, eventDate, pastSlotsTick],
  );

  /** Chỉ các slot available (để submit) */
  const availableSlots = useMemo(() => {
    const out = [];
    for (const group of slotsByFieldWithStatus) {
      for (const s of group.slots) {
        if (s.status === "available") out.push(s);
      }
    }
    return out;
  }, [slotsByFieldWithStatus]);

  const sportTypeOptions = useMemo(() => {
    const set = new Set();
    for (const g of slotsByFieldWithStatus) {
      const n = String(g.sportTypeName || "").trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [slotsByFieldWithStatus]);

  const filteredSlotsByField = useMemo(() => {
    if (!sportTypeFilter) return slotsByFieldWithStatus;
    return slotsByFieldWithStatus.filter(
      (g) => String(g.sportTypeName || "").trim() === sportTypeFilter,
    );
  }, [slotsByFieldWithStatus, sportTypeFilter]);

  const loadVenues = async () => {
    setLoadingVenues(true);
    setError("");
    try {
      const list = await getOwnerVenueSelectOptions();
      setVenues(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được danh sách cơ sở.");
      setVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadVenues();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVenueSelect = (nextVenueId) => {
    setError("");
    setSchedule(null);
    setEventListForDate([]);
    setSelectedDetails([]);
    setExpandedFieldId(null);
    setSportTypeFilter("");
    const id = Number(nextVenueId);
    if (!id) {
      setVenue(null);
      return;
    }
    const match = venues.find((v) => Number(pick(v, "venueId", "VenueId", "id")) === id);
    if (!match) {
      setVenue(null);
      return;
    }
    const normalizedName =
      pick(match, "name", "Name", "venueName", "VenueName") ?? `Cơ sở #${id}`;
    setVenue({ ...match, name: normalizedName });
  };

  const loadVenue = async () => {
    const id = Number(venueId);
    if (!id) {
      setError("Vui lòng chọn cơ sở.");
      return;
    }
    setError("");
    setLoadingVenue(true);
    setVenue(null);
    setSchedule(null);
    setSelectedDetails([]);
    setExpandedFieldId(null);
    setSportTypeFilter("");
    try {
      const v = await getVenueDetail(id);
      setVenue(v ?? null);
      if (!v) setError("Không tìm thấy cơ sở.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được thông tin cơ sở.");
    } finally {
      setLoadingVenue(false);
    }
  };

  const loadSchedule = async () => {
    const id = Number(venueId);
    if (!id || !eventDate) {
      setError("Vui lòng chọn cơ sở và ngày sự kiện.");
      return;
    }
    setError("");
    setLoadingSchedule(true);
    setSchedule(null);
    setEventListForDate([]);
    setSelectedDetails([]);
    setExpandedFieldId(null);
    setSportTypeFilter("");
    try {
      const dateStr = eventDate.slice(0, 10);
      const s = await getVenueSchedule(id, dateStr);
      setSchedule(s ?? null);
      if (!s?.sportTypes?.length) setError("Không có khung giờ cho ngày này.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được lịch.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  /** Khi đã có schedule + venue + ngày → lấy danh sách sự kiện để đánh dấu slot "sự kiện" */
  useEffect(() => {
    if (!schedule?.sportTypes?.length || !venue || !eventDate) {
      setEventListForDate([]);
      return;
    }
    let mounted = true;
    getEventList()
      .then((list) => {
        if (mounted && Array.isArray(list)) setEventListForDate(list);
      })
      .catch(() => {
        if (mounted) setEventListForDate([]);
      });
    return () => { mounted = false; };
  }, [schedule, venue, eventDate]);

  /** Cập nhật khóa slot "đã qua" theo thời gian thực khi chọn đúng ngày hôm nay */
  useEffect(() => {
    const dateStr = String(eventDate || "").slice(0, 10);
    if (!dateStr || !schedule?.sportTypes?.length) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (dateStr !== todayStr) return;
    const id = setInterval(() => setPastSlotsTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [eventDate, schedule]);

  /** Bỏ chọn các khung vừa chuyển sang trạng thái không còn chọn được (vd. đã qua) */
  useEffect(() => {
    const allowed = new Set(
      availableSlots.map((s) => `${s.fieldId}-${s.slotId}`),
    );
    setSelectedDetails((prev) => {
      const next = prev.filter((d) => allowed.has(`${d.fieldId}-${d.slotId}`));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSlots]);

  /** Sân đang mở "Phóng to" không còn trong danh sách sau khi lọc → thu gọn */
  useEffect(() => {
    if (expandedFieldId == null) return;
    const visible = filteredSlotsByField.some((g) => g.fieldId === expandedFieldId);
    if (!visible) setExpandedFieldId(null);
  }, [expandedFieldId, filteredSlotsByField]);

  const toggleSlot = (item) => {
    if (item.status !== "available") return;
    const key = `${item.fieldId}-${item.slotId}`;
    setSelectedDetails((prev) => {
      const has = prev.some((d) => `${d.fieldId}-${d.slotId}` === key);
      if (has) return prev.filter((d) => `${d.fieldId}-${d.slotId}` !== key);
      const mixed = prev.some((d) => d.fieldId !== item.fieldId);
      const base = mixed ? prev.filter((d) => d.fieldId === item.fieldId) : prev;
      return [...base, { fieldId: item.fieldId, slotId: item.slotId }];
    });
    setSlotSelectionError(false);
  };

  const isSelected = (item) =>
    selectedDetails.some((d) => d.fieldId === item.fieldId && d.slotId === item.slotId);

  const onCreateSubmit = async (values) => {
    const id = Number(values.venueId);
    if (!id || !values.eventDate) {
      setError("Vui lòng chọn cơ sở và ngày.");
      return;
    }
    if (selectedDetails.length === 0) {
      setError("Vui lòng chọn ít nhất một khung giờ.");
      setSlotSelectionError(true);
      return;
    }

    setError("");
    setSlotSelectionError(false);
    setSubmitLoading(true);
    try {
      const payload = {
        eventDate: values.eventDate.slice(0, 10),
        details: selectedDetails.map((d) => ({ fieldId: d.fieldId, slotId: d.slotId })),
        pricePerPerson: values.pricePerPerson,
        minPlayer: values.minPlayer,
        maxPlayer: values.maxPlayer,
        description: values.description?.trim() || null,
      };
      const res = await createEvent(payload);
      const eventId = res?.eventId ?? res?.EventId;
      if (eventId) {
        navigate(`/owner/events/${eventId}`);
      } else {
        navigate("/owner/events");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Tạo sự kiện thất bại.";
      setError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="owner-home create-event-page">
      <div className="owner-home-header">
        <h1>Tạo sự kiện</h1>
        <Link to="/owner/events" className="oh-create-btn">
          Danh sách
        </Link>
      </div>

      <div className="owner-home-content">
        <form className="create-event-form" onSubmit={handleSubmit(onCreateSubmit)} noValidate>
          {error && (
            <div className="ce-error" role="alert">
              {error}
            </div>
          )}

          <div className="ce-section">
            <h3>Cơ sở &amp; ngày</h3>
            <div className="ce-row">
              <label>
                Cơ sở (Venue)
                <Controller
                  name="venueId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={errors.venueId ? "ce-input-error" : ""}
                      onChange={(e) => {
                        field.onChange(e);
                        handleVenueSelect(e.target.value);
                      }}
                      disabled={loadingVenues || venues.length === 0}
                    >
                      <option value="">{loadingVenues ? "Đang tải..." : "Chọn cơ sở"}</option>
                      {venues.map((v) => {
                        const vid = pick(v, "venueId", "VenueId", "id");
                        if (!vid) return null;
                        const name = pick(v, "name", "Name", "venueName", "VenueName") ?? `Cơ sở #${vid}`;
                        return (
                          <option key={vid} value={String(vid)}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                />
                {errors.venueId && <span className="ce-field-error">{errors.venueId.message}</span>}
              </label>
              <button
                type="button"
                className="ce-btn secondary"
                onClick={loadVenue}
                disabled={loadingVenue || !venueId}
              >
                {loadingVenue ? "Đang tải…" : "Tải thông tin"}
              </button>
            </div>
            {venue && (
              <p className="ce-venue-name">
                Cơ sở: <strong>{venueDisplayName}</strong>
              </p>
            )}
            <div className="ce-row">
              <label>
                Ngày sự kiện
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className={errors.eventDate ? "ce-input-error" : ""}
                  {...register("eventDate")}
                />
                {errors.eventDate && <span className="ce-field-error">{errors.eventDate.message}</span>}
              </label>
              <button
                type="button"
                className="ce-btn secondary"
                onClick={loadSchedule}
                disabled={loadingSchedule || !venueId || !eventDate}
              >
                {loadingSchedule ? "Đang tải…" : "Tải khung giờ"}
              </button>
            </div>
          </div>

          {slotsByFieldWithStatus.length > 0 && (
            <div className="ce-section">
              <h3>Chọn khung giờ (ít nhất 1)</h3>
              <p className="ce-single-field-hint">
                Một sự kiện chỉ dùng slot trên một sân. Phóng to sân khác sẽ bỏ chọn slot ở sân trước.
              </p>
              {sportTypeOptions.length > 0 && (
                <div className="ce-row ce-sport-filter-row">
                  <label>
                    Loại sân
                    <select
                      value={sportTypeFilter}
                      onChange={(e) => setSportTypeFilter(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {sportTypeOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="ce-legend">
                <span className="ce-legend-item available">Trống</span>
                <span className="ce-legend-item past">Đã qua</span>
                <span className="ce-legend-item booked">Đã đặt</span>
                <span className="ce-legend-item event">Sự kiện</span>
              </div>
              <div className={`ce-slots-by-field${slotSelectionError ? " ce-slots-by-field-error" : ""}`}>
                {filteredSlotsByField.map((group) => (
                  <div key={group.fieldId} className="ce-field-block">
                    <div className="ce-field-head">
                      <div className="ce-field-left">
                        {group.sportTypeName ? (
                          <div className="ce-field-sport">{group.sportTypeName}</div>
                        ) : null}
                        <h4 className="ce-field-title">{group.fieldName}</h4>
                      </div>
                      <div className="ce-field-right">
                        <span className="ce-field-meta">
                          {group.slots.filter((s) => s.status === "available").length} trống /{" "}
                          {group.slots.length} tổng
                        </span>
                        <button
                          type="button"
                          className="ce-field-toggle"
                          onClick={() => {
                            const prev = expandedFieldId;
                            const fid = group.fieldId;
                            const next = prev === fid ? null : fid;
                            setExpandedFieldId(next);
                            if (next !== null && next !== prev) {
                              setSelectedDetails((details) =>
                                details.filter((d) => d.fieldId === next),
                              );
                            }
                          }}
                        >
                          {expandedFieldId === group.fieldId ? "Thu nhỏ" : "Phóng to"}
                        </button>
                      </div>
                    </div>

                    {expandedFieldId === group.fieldId ? (
                      <div className="ce-compact-grid">
                        {group.slots.map((item) => {
                          const disabled = item.status !== "available";
                          const selected = !disabled && isSelected(item);
                          return (
                            <button
                              key={`${item.fieldId}-${item.slotId}`}
                              type="button"
                              className={`ce-compact-chip ce-slot-${item.status}${selected ? " selected" : ""}`}
                              onClick={() => !disabled && toggleSlot(item)}
                              disabled={disabled}
                              title={
                                item.status === "past"
                                  ? "Khung giờ đã qua, không thể tạo sự kiện"
                                  : item.status === "booked"
                                  ? "Đã có người đặt sân"
                                  : item.status === "event"
                                  ? "Đã nằm trong sự kiện khác"
                                  : undefined
                              }
                            >
                              <span className="ce-compact-time">
                                {normalizeTime(item.startTime)} - {normalizeTime(item.endTime)}
                              </span>
                              {item.status === "past" && <span className="ce-compact-tag">Đã qua</span>}
                              {item.status === "booked" && <span className="ce-compact-tag">Đã đặt</span>}
                              {item.status === "event" && <span className="ce-compact-tag">Sự kiện</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="ce-collapsed-note">Bấm "Phóng to" để xem và chọn khung giờ.</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="ce-hint">Đã chọn: {selectedDetails.length} khung</p>
            </div>
          )}

          <div className="ce-section">
            <h3>Thông tin sự kiện</h3>
            <div className="ce-row">
              <label>
                Phí tham gia (VNĐ/người)
                <input
                  type="number"
                  min={1}
                  placeholder="50000"
                  className={errors.pricePerPerson ? "ce-input-error" : ""}
                  {...register("pricePerPerson")}
                />
                {errors.pricePerPerson && (
                  <span className="ce-field-error">{errors.pricePerPerson.message}</span>
                )}
              </label>
            </div>
            <div className="ce-row two-cols">
              <label>
                Số người tối thiểu
                <input
                  type="number"
                  min={1}
                  className={errors.minPlayer ? "ce-input-error" : ""}
                  {...register("minPlayer")}
                />
                {errors.minPlayer && <span className="ce-field-error">{errors.minPlayer.message}</span>}
              </label>
              <label>
                Số người tối đa
                <input
                  type="number"
                  min={1}
                  className={errors.maxPlayer ? "ce-input-error" : ""}
                  {...register("maxPlayer")}
                />
                {errors.maxPlayer && <span className="ce-field-error">{errors.maxPlayer.message}</span>}
              </label>
            </div>
            <label className="ce-full">
              Mô tả (tuỳ chọn)
              <textarea
                className={errors.description ? "ce-input-error" : ""}
                {...register("description")}
                placeholder="VD: Bóng đá 5 người, giao lưu cuối tuần"
                rows={3}
              />
            </label>
          </div>

          <div className="ce-actions">
            <button
              type="submit"
              className="ce-btn primary"
              disabled={submitLoading}
            >
              {submitLoading ? "Đang tạo…" : "Tạo sự kiện"}
            </button>
            <Link to="/owner/events" className="ce-btn link">
              Huỷ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
