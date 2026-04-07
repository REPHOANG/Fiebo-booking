import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Trash2, Clock, Save, Sparkles, Pencil } from "lucide-react";
import { toast } from "react-toastify";
// import { getOwnerVenueFields } from "../../../services/fieldService";
import { getSportTypes, normalizeSportTypeList } from "../../../services/sportTypeService";
import { getVenueDraft, getOwnerVenueSelectOptions } from "../../../services/venueService";
import {
  getOwnerVenueTimeSlots,
  createOwnerVenueTimeSlot,
  updateOwnerVenueTimeSlot,
  deleteOwnerVenueTimeSlot,
} from "../../../services/venueTimeSlotService";
import "./OwnerTimeSlot.css";

// const translateFieldStatus = (raw) => {
//   const s = String(raw ?? "")
//     .trim()
//     .toLowerCase();
//   if (s === "active" || s === "1") return { label: "Đang hoạt động", paused: false };
//   if (s === "inactive" || s === "draft" || s === "0") return { label: "Tạm dừng", paused: true };
//   if (!s || s === "—") return { label: "Đang hoạt động", paused: false };
//   return { label: String(raw), paused: /inactive|pause|draft/i.test(s) };
// };

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

// const normalizeText = (value) =>
//   String(value ?? "")
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .trim();

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
const MANUAL_INSERT_STEP_MINUTES = 30;
const INSERT_DURATION_OPTIONS = [30, 60, 90];

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

/** Chỉ các khung giờ đang có trong DB (gộp theo start–end, giá/slotId theo ngày). */
const rowsFromApiOnly = (apiSlots, weekDates) => {
  const dateKeyByDayName = {};
  weekDates.forEach((d) => {
    dateKeyByDayName[DOTNET_DAY_NAMES[d.getDay()]] = toIsoDate(d);
  });

  const byKey = new Map();
  for (const s of apiSlots || []) {
    const start = formatTime(s.startTime ?? s.StartTime);
    const end = formatTime(s.endTime ?? s.EndTime);
    const key = `${start}|${end}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        id: `${start}-${end}`,
        start,
        end,
        prices: {},
        slotIds: {},
        isPeak: Boolean(s.isPeak ?? s.IsPeak),
      };
      byKey.set(key, row);
    }
    const dayName = s.dayOfWeek ?? s.DayOfWeek;
    const dk = dateKeyByDayName[dayName];
    if (!dk) continue;
    row.prices[dk] = Number(s.price ?? s.Price ?? 0);
    row.slotIds[dk] = s.id ?? s.Id;
    if (s.isPeak ?? s.IsPeak) row.isPeak = true;
  }

  return Array.from(byKey.values()).sort((a, b) => parseHour(a.start) - parseHour(b.start));
};

/**
 * Giữ lại các dòng local chưa lưu khi vừa reload từ API
 * (tránh mất các dòng "nháp" khi bấm Lưu 1 dòng).
 */
const mergeServerRowsWithLocalDrafts = (serverRows, localRows) => {
  const next = Array.isArray(serverRows) ? [...serverRows] : [];
  const byKey = new Map(
    next.map((r) => [`${String(r.start)}|${String(r.end)}`, r]),
  );

  (localRows || []).forEach((row) => {
    const key = `${String(row?.start)}|${String(row?.end)}`;
    const target = byKey.get(key);
    const localPrices = row?.prices || {};
    const localSlotIds = row?.slotIds || {};

    if (!target) {
      // Chỉ giữ dòng local khi chưa có slot id nào (hoàn toàn là nháp).
      const hasAnyPersistedId = Object.values(localSlotIds).some(
        (v) => v != null && String(v).trim() !== "",
      );
      if (!hasAnyPersistedId) {
        const hasAnyDraftValue = Object.values(localPrices).some((v) => v !== undefined);
        if (hasAnyDraftValue) next.push({ ...row });
      }
      return;
    }

    // Đã có dòng từ server: ghép thêm những giá local ở ngày chưa có slotId.
    const mergedPrices = { ...(target.prices || {}) };
    Object.entries(localPrices).forEach(([dk, p]) => {
      const hasServerSlotThatDay =
        target.slotIds?.[dk] != null && String(target.slotIds[dk]).trim() !== "";
      if (!hasServerSlotThatDay && p !== undefined) {
        mergedPrices[dk] = p;
      }
    });
    target.prices = mergedPrices;
    if (row?.isPeak) target.isPeak = true;
  });

  return next.sort((a, b) => parseHour(a.start) - parseHour(b.start));
};

/** Quản lý time slot theo loại sân (môn) — route `/owner/venues/:id/time-slot` */
const OwnerTimeSlot = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sportTypes, setSportTypes] = useState([]);
  // const [venueFields, setVenueFields] = useState([]);
  const [slotRows, setSlotRows] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [venueOpenTime, setVenueOpenTime] = useState(null);
  const [venueCloseTime, setVenueCloseTime] = useState(null);
  const [sportTypeId, setSportTypeId] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerVenuesList, setOwnerVenuesList] = useState([]);
  /** Chỉ một dòng đang sửa (theo index trong `slotRows`); slot đã lưu trên máy chủ mặc định khóa cho đến khi bấm Sửa. */
  const [editingRowIdx, setEditingRowIdx] = useState(null);
  const editSnapshotRef = useRef(null);
  const editingRowIdxRef = useRef(null);
  // const [selectedFieldIds, setSelectedFieldIds] = useState(() => new Set());
  const otsPageRef = useRef(null);

  useEffect(() => {
    editingRowIdxRef.current = editingRowIdx;
  }, [editingRowIdx]);

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

  // const selectedSportTypeName = useMemo(() => {
  //   const found = sportTypeOptions.find((s) => String(s.id) === String(sportTypeId));
  //   return found?.name ?? "";
  // }, [sportTypeOptions, sportTypeId]);

  // const existingFieldsBySelectedType = useMemo(() => {
  //   if (!selectedSportTypeName) return venueFields;
  //   const selectedKey = normalizeText(selectedSportTypeName);
  //   return (venueFields || []).filter(
  //     (f) => normalizeText(f?.sportType ?? f?.SportType ?? "") === selectedKey,
  //   );
  // }, [venueFields, selectedSportTypeName]);

  // const fieldIdsKey = useMemo(
  //   () =>
  //     existingFieldsBySelectedType
  //       .map((f) => String(f?.fieldId ?? f?.FieldId ?? ""))
  //       .filter(Boolean)
  //       .sort()
  //       .join("|"),
  //   [existingFieldsBySelectedType],
  // );

  // useEffect(() => {
  //   const ids = existingFieldsBySelectedType
  //     .map((f) => f?.fieldId ?? f?.FieldId)
  //     .filter((x) => x != null);
  //   setSelectedFieldIds(new Set(ids.map((x) => String(x))));
  // }, [fieldIdsKey]);

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

  /** Chỉ dòng có slot/giá cho ngày đang chọn — mỗi ngày có thể khác nhau. */
  const rowsForActiveDay = useMemo(() => {
    const dk = activeDayKey;
    return slotRows
      .map((row, idx) => ({ row, idx }))
      .filter(
        ({ row }) =>
          row.slotIds?.[dk] != null ||
          row.prices?.[dk] !== undefined,
      );
  }, [slotRows, activeDayKey]);

  const activeDayTimeRanges = useMemo(
    () =>
      rowsForActiveDay
        .map(({ row }) => {
          const s = timeToMinutes(row.start);
          const e = timeToMinutes(row.end);
          if (s == null || e == null || e <= s) return null;
          return { start: s, end: e };
        })
        .filter(Boolean),
    [rowsForActiveDay],
  );

  const daysHavingAnySlot = useMemo(() => {
    const byDay = {};
    weekDates.forEach((d) => {
      const dk = toIsoDate(d);
      byDay[dk] = slotRows.some(
        (row) => row.slotIds?.[dk] != null || row.prices?.[dk] !== undefined,
      );
    });
    return byDay;
  }, [slotRows, weekDates]);

  const activeDayHasAnySlot = Boolean(daysHavingAnySlot[activeDayKey]);
  const canUseDurationTemplate =
    !saving && !loadingSlots && !!sportTypeId && !activeDayHasAnySlot;
  const allowedDurations = useMemo(() => new Set([30, 60, 90]), []);
  const parsedDuration = Number(slotDuration);
  const normalizedDuration = allowedDurations.has(parsedDuration) ? parsedDuration : 60;
  const slotDurationLabel = useMemo(() => {
    if (normalizedDuration === 90) return "1h30p";
    if (normalizedDuration === 60) return "1h";
    return "30p";
  }, [normalizedDuration]);

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

  const reloadSlots = useCallback(async (opts = {}) => {
    const { preserveLocalDrafts = false, localRowsSnapshot = [] } = opts;
    const sid = Number(sportTypeId);
    if (!sid) {
      setSlotRows([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const { timeSlots } = await getOwnerVenueTimeSlots(id, sid);
      const serverRows = rowsFromApiOnly(timeSlots, weekDates);
      setSlotRows(
        preserveLocalDrafts
          ? mergeServerRowsWithLocalDrafts(serverRows, localRowsSnapshot)
          : serverRows,
      );
    } catch {
      toast.error("Không tải được khung giờ từ máy chủ.");
      setSlotRows([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [id, sportTypeId, weekDates]);

  const togglePeakRow = (rowIdx) => {
    setSlotRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, isPeak: !r.isPeak } : r)),
    );
  };

  // const toggleFieldCard = (fid) => {
  //   const key = String(fid ?? "");
  //   if (!key) return;
  //   setSelectedFieldIds((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(key)) next.delete(key);
  //     else next.add(key);
  //     return next;
  //   });
  // };

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
    toast.success(
      "Đã áp dụng giá trong bảng cho các ngày còn lại. Nhấn Lưu trên từng ngày (tab) để đồng bộ máy chủ.",
    );
  };

  const addSlotForActiveDay = useCallback(
    (startHHMM, endHHMM) => {
      const endM = timeToMinutes(endHHMM);
      const venueCloseMin = timeToMinutes(venueCloseTime);
      if (venueCloseMin != null && endM != null && endM > venueCloseMin) {
        toast.info("Đã chạm giờ đóng cửa, không thể thêm slot.");
        return;
      }
      setSlotRows((prev) => {
        const dup = prev.some((r) => r.start === startHHMM && r.end === endHHMM);
        if (dup) {
          return prev.map((r) =>
            r.start === startHHMM && r.end === endHHMM
              ? {
                  ...r,
                  prices: { ...(r.prices || {}), [activeDayKey]: r.prices?.[activeDayKey] ?? 0 },
                }
              : r,
          );
        }
        const next = [
          ...prev,
          {
            id: `${startHHMM}-${endHHMM}`,
            start: startHHMM,
            end: endHHMM,
            prices: { [activeDayKey]: 0 },
            slotIds: {},
            isPeak: false,
          },
        ];
        return next.sort((a, b) => parseHour(a.start) - parseHour(b.start));
      });
    },
    [activeDayKey, venueCloseTime],
  );

  const autoGenerateSlotsForActiveDay = useCallback(() => {
    if (!canUseDurationTemplate) return;
    const openMin = timeToMinutes(venueOpenTime ? formatTime(venueOpenTime) : null);
    const closeMin = timeToMinutes(venueCloseTime ? formatTime(venueCloseTime) : null);
    if (openMin == null || closeMin == null || closeMin <= openMin) {
      toast.error("Không xác định được giờ mở/đóng hợp lệ để tạo tự động.");
      return;
    }

    const generated = [];
    for (let start = openMin; start + normalizedDuration <= closeMin; start += normalizedDuration) {
      generated.push({
        start: minutesToHHMM(start),
        end: minutesToHHMM(start + normalizedDuration),
      });
    }
    if (!generated.length) {
      toast.info("Không có khung giờ phù hợp trong khoảng mở cửa.");
      return;
    }

    setSlotRows((prev) => {
      let next = [...prev];
      generated.forEach(({ start, end }) => {
        const foundIdx = next.findIndex((r) => r.start === start && r.end === end);
        if (foundIdx >= 0) {
          const row = next[foundIdx];
          next[foundIdx] = {
            ...row,
            prices: { ...(row.prices || {}), [activeDayKey]: row.prices?.[activeDayKey] ?? 0 },
          };
        } else {
          next.push({
            id: `${start}-${end}`,
            start,
            end,
            prices: { [activeDayKey]: 0 },
            slotIds: {},
            isPeak: false,
          });
        }
      });
      return next.sort((a, b) => parseHour(a.start) - parseHour(b.start));
    });

    // toast.success(`Đã tạo tự động ${generated.length} khung (${slotDurationLabel}) cho ${weekDayLabels[activeDayIndex]}.`);
  }, [
    canUseDurationTemplate,
    venueOpenTime,
    venueCloseTime,
    normalizedDuration,
    activeDayKey,
    slotDurationLabel,
    weekDayLabels,
    activeDayIndex,
  ]);

  const sortedOwnerVenues = useMemo(() => {
    return [...ownerVenuesList].sort((a, b) => {
      const na = String(a?.name ?? a?.Name ?? "");
      const nb = String(b?.name ?? b?.Name ?? "");
      return na.localeCompare(nb, "vi", { sensitivity: "base" });
    });
  }, [ownerVenuesList]);

  const ownerVenueOptions = useMemo(
    () =>
      sortedOwnerVenues
        .map((v) => {
          const vid = v?.venueId ?? v?.VenueId ?? v?.id ?? v?.Id;
          if (vid == null) return null;
          const name = String(v?.name ?? v?.Name ?? "").trim() || `Cơ sở #${vid}`;
          return { vid: String(vid), name };
        })
        .filter(Boolean)
        .map((o, i) => ({ ...o, order: i + 1 })),
    [sortedOwnerVenues],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getOwnerVenueSelectOptions();
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
        if (mounted) setSportTypes(normalizeSportTypeList(list));
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

  // useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     try {
  //       const list = await getOwnerVenueFields(id);
  //       if (mounted) setVenueFields(Array.isArray(list) ? list : []);
  //     } catch {
  //       if (mounted) setVenueFields([]);
  //     }
  //   })();
  //   return () => {
  //     mounted = false;
  //   };
  // }, [id]);

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

  useEffect(() => {
    setEditingRowIdx(null);
    editSnapshotRef.current = null;
  }, [sportTypeId]);

  /** Đổi tab ngày → hủy sửa dòng (khôi phục snapshot). */
  useEffect(() => {
    const idx = editingRowIdxRef.current;
    if (idx == null) return;
    const snap = editSnapshotRef.current;
    if (snap) {
      setSlotRows((prev) => prev.map((r, i) => (i === idx ? snap : r)));
    }
    editSnapshotRef.current = null;
    setEditingRowIdx(null);
  }, [activeDayIndex]);

  const beginEditRow = useCallback((originalIdx) => {
    const prevEditing = editingRowIdxRef.current;
    setSlotRows((prev) => {
      let base = prev;
      if (prevEditing != null && prevEditing !== originalIdx && editSnapshotRef.current) {
        base = prev.map((r, i) => (i === prevEditing ? editSnapshotRef.current : r));
      }
      const row = base[originalIdx];
      editSnapshotRef.current = row ? JSON.parse(JSON.stringify(row)) : null;
      return base;
    });
    setEditingRowIdx(originalIdx);
  }, []);

  const cancelRowEdit = useCallback(() => {
    const idx = editingRowIdxRef.current;
    if (idx == null) {
      setEditingRowIdx(null);
      return;
    }
    const snap = editSnapshotRef.current;
    if (snap) {
      setSlotRows((prev) => prev.map((r, i) => (i === idx ? snap : r)));
    }
    editSnapshotRef.current = null;
    setEditingRowIdx(null);
  }, []);

  const saveSingleRow = async (originalIdx) => {
    const sid = Number(sportTypeId);
    if (!sid) {
      toast.error("Vui lòng chọn loại sân / môn thể thao.");
      return;
    }
    const row = slotRows[originalIdx];
    if (!row) return;
    const dk = activeDayKey;
    const d = weekDates[activeDayIndex];
    const dow = DOTNET_DAY_NAMES[d.getDay()];
    const rawPrice = row.prices?.[dk];
    const price =
      rawPrice === "" || rawPrice === undefined || rawPrice === null ? 0 : Number(rawPrice);
    const existingId = row.slotIds?.[dk];
    const startT = toTimeOnly(row.start);
    const endT = toTimeOnly(row.end);
    const startM = timeToMinutes(row.start);
    const endM = timeToMinutes(row.end);
    if (startM == null || endM == null || endM <= startM) {
      toast.error("Khung giờ không hợp lệ (bắt đầu phải trước kết thúc).");
      return;
    }

    setSaving(true);
    try {
      if (existingId) {
        if (price <= 0) {
          await deleteOwnerVenueTimeSlot(existingId);
          toast.success("Đã xóa slot (giá ≤ 0).");
        } else {
          await updateOwnerVenueTimeSlot(existingId, {
            startTime: startT,
            endTime: endT,
            price,
          });
          toast.success("Đã cập nhật khung giờ.");
        }
      } else if (price > 0) {
        await createOwnerVenueTimeSlot(id, {
          sportTypeId: sid,
          startTime: startT,
          endTime: endT,
          dayOfWeek: dow,
          price,
        });
        toast.success("Đã tạo khung giờ cho ngày này.");
      } else {
        toast.info("Nhập giá lớn hơn 0 để tạo slot mới.");
        setSaving(false);
        return;
      }
      editSnapshotRef.current = null;
      setEditingRowIdx(null);
      await reloadSlots({
        preserveLocalDrafts: true,
        localRowsSnapshot: slotRows,
      });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không lưu được khung giờ.");
    } finally {
      setSaving(false);
    }
  };

  /** Chỉ đồng bộ ngày đang xem — tránh lặp 7× số dòng (mỗi ngày một loạt create/update/delete). */
  const saveSlots = async () => {
    const sid = Number(sportTypeId);
    if (!sid) {
      toast.error("Vui lòng chọn loại sân / môn thể thao.");
      return;
    }
    setSaving(true);
    try {
      const d = weekDates[activeDayIndex];
      const dk = toIsoDate(d);
      const dow = DOTNET_DAY_NAMES[d.getDay()];

      for (const row of slotRows) {
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
      editSnapshotRef.current = null;
      setEditingRowIdx(null);
      toast.success(`Đã lưu khung giờ cho ${weekDayLabels[activeDayIndex]}.`);
      await reloadSlots();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không lưu được khung giờ.");
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (rowIdx) => {
    const dk = activeDayKey;

    const stripDayFromRow = (r) => {
      const prices = { ...(r?.prices || {}) };
      const slotIds = { ...(r?.slotIds || {}) };
      delete prices[dk];
      delete slotIds[dk];
      return { ...r, prices, slotIds };
    };

    const rowStillHasData = (r) =>
      weekDates.some((d) => {
        const k = toIsoDate(d);
        if (r.slotIds?.[k] != null && r.slotIds[k] !== "") return true;
        const p = r.prices?.[k];
        return p !== undefined && p !== "" && Number(p) > 0;
      });

    const applyStrip = (prev) => {
      const cur = prev[rowIdx];
      if (!cur) return prev;
      const next = stripDayFromRow(cur);
      if (!rowStillHasData(next)) return prev.filter((_, i) => i !== rowIdx);
      return prev.map((x, i) => (i === rowIdx ? next : x));
    };

    const row = slotRows[rowIdx];
    if (!row) return;
    if (rowIdx === editingRowIdx) {
      setEditingRowIdx(null);
      editSnapshotRef.current = null;
    }
    const slotId = row.slotIds?.[dk];

    if (!slotId) {
      setSlotRows((prev) => applyStrip(prev));
      return;
    }

    setSaving(true);
    try {
      await deleteOwnerVenueTimeSlot(slotId);
      setSlotRows((prev) => applyStrip(prev));
      toast.success(`Đã xóa slot (${weekDayLabels[activeDayIndex]}).`);
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
          {ownerVenueOptions.length > 0 ? (
            <div className="ots-venue-select-wrap">
              <label htmlFor="ots-venue-select" className="ots-venue-select-label">
                Chọn cơ sở
              </label>
              <select
                id="ots-venue-select"
                className="ots-venue-select"
                aria-label="Chọn cơ sở để quản lý khung giờ"
                value={String(id)}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && next !== String(id)) {
                    navigate(`/owner/venues/${next}/time-slot`);
                  }
                }}
              >
                {ownerVenueOptions.map((o) => (
                  <option key={o.vid} value={o.vid}>
                    Cơ sở {o.order}: {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="ots-top-actions">
          <button type="button" className="ots-btn-save" disabled={saveDisabled} onClick={saveSlots}>
            {saving ? "Đang lưu…" : `LƯU ${weekDayLabels[activeDayIndex].toUpperCase()}`}
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

          {/*
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
          */}

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
                  className={`ots-day-pill ${activeDayIndex === idx ? "is-active" : ""}${daysHavingAnySlot[toIsoDate(weekDates[idx])] ? " is-day-has-slots" : ""}`}
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
            <span className="ots-slot-toolbar-day">{weekDayLabels[activeDayIndex]}</span>
            <label
              className={`ots-slot-duration${canUseDurationTemplate ? "" : " is-disabled"}`}
              title={
                activeDayHasAnySlot
                  ? "Ngày này đã có slot, không đổi mẫu tạo khung giờ."
                  : "Chọn độ dài khung khi tạo mới"
              }
            >
              Tạo khung theo:
              <select
                value={slotDuration}
                disabled={!canUseDurationTemplate}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
              >
                <option value={30}>30 phút</option>
                <option value={60}>1 giờ</option>
                <option value={90}>1 giờ 30 phút</option>
              </select>
            </label>
            <button
              type="button"
              className="ots-auto-generate-btn"
              disabled={!canUseDurationTemplate}
              onClick={autoGenerateSlotsForActiveDay}
              title={
                activeDayHasAnySlot
                  ? "Ngày này đã có slot nên không tạo tự động."
                  : "Tạo tự động từ giờ mở đến giờ đóng"
              }
            >
              <Calendar size={14} /> Tạo tự động cả ngày
            </button>
          </div>

          {loadingSlots ? (
            <div className="ots-loading">Đang tải khung giờ…</div>
          ) : !sportTypeId ? (
            <div className="ots-muted-block">Chọn môn / loại sân để xem và chỉnh khung giờ.</div>
          ) : (
            <>
              {slotRows.length === 0 ? (
                <div className="ots-muted-block">
                  Chưa có khung giờ nào trên máy chủ cho môn này. Thêm khung bên dưới sẽ chỉ tạo cho{" "}
                  <strong>{weekDayLabels[activeDayIndex]}</strong> (sau khi lưu).
                </div>
              ) : rowsForActiveDay.length === 0 ? (
                <div className="ots-muted-block">
                  <strong>{weekDayLabels[activeDayIndex]}</strong> hiện chưa có slot — có thể khác các
                  ngày khác. Thêm khung bên dưới chỉ áp dụng cho ngày này.
                </div>
              ) : null}
              {rowsForActiveDay.length > 0 ? (
                <>
              <div className="ots-table-head">
                <span>KHUNG GIỜ</span>
                <span>GIÁ NIÊM YẾT (đ)</span>
                <span className="ots-table-head-actions">THAO TÁC</span>
              </div>
              <div className="ots-slot-rows">
                {rowsForActiveDay.map(({ row, idx: originalIdx }, visIdx) => {
                  const openMin =
                    timeToMinutes(venueOpenTime ? formatTime(venueOpenTime) : null) ?? 6 * 60;
                  const closeMin =
                    timeToMinutes(venueCloseTime ? formatTime(venueCloseTime) : null) ?? 23 * 60;
                  const hasOverlap = (startM, endM) =>
                    activeDayTimeRanges.some((r) => startM < r.end && endM > r.start);
                  const renderInsertOptions = (startMin, keySeed) => {
                    if (startMin == null || !Number.isFinite(startMin)) return null;
                    const options = INSERT_DURATION_OPTIONS
                      .map((duration) => {
                        const endMin = startMin + duration;
                        if (endMin > closeMin) return null;
                        if (hasOverlap(startMin, endMin)) return null;
                        return {
                          key: `${keySeed}-${duration}`,
                          start: minutesToHHMM(startMin),
                          end: minutesToHHMM(endMin),
                          duration,
                        };
                      })
                      .filter(Boolean);
                    if (!options.length) return null;
                    return (
                      <div className="ots-row-insert-zone" key={`zone-${keySeed}`}>
                        <span className="ots-row-insert-line" aria-hidden />
                        <div className="ots-row-insert-label">
                          {options.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              className="ots-row-insert-option"
                              aria-label={`Thêm khung ${opt.start} – ${opt.end}`}
                              onClick={() => addSlotForActiveDay(opt.start, opt.end)}
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              {opt.start} – {opt.end}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  };
                  let insertBefore = null;
                  if (visIdx === 0) {
                    const firstStart = timeToMinutes(row.start);
                    if (firstStart != null && firstStart > openMin) {
                      insertBefore = renderInsertOptions(openMin, `ins-open-${openMin}`);
                    }
                  }
                  let insertBetween = null;
                  if (visIdx > 0) {
                    const prevR = rowsForActiveDay[visIdx - 1].row;
                    const prevEnd = timeToMinutes(prevR.end);
                    const curStart = timeToMinutes(row.start);
                    if (
                      prevEnd != null &&
                      curStart != null &&
                      curStart > prevEnd
                    ) {
                      insertBetween = renderInsertOptions(prevEnd, `ins-${prevEnd}-${originalIdx}`);
                    }
                  }
                  const value = row.prices?.[activeDayKey];
                  const persistedSlotId = row.slotIds?.[activeDayKey];
                  const hasPersistedSlot =
                    persistedSlotId != null && String(persistedSlotId).trim() !== "";
                  const rowInputsLocked = saving || (hasPersistedSlot && editingRowIdx !== originalIdx);
                  return (
                    <React.Fragment key={`${activeDayKey}-${row.id ?? originalIdx}-${originalIdx}`}>
                      {insertBefore}
                      {insertBetween}
                    <div
                      className={`ots-slot-row ${row.isPeak ? "is-peak" : ""}${rowInputsLocked ? " is-row-locked" : ""}${editingRowIdx === originalIdx && hasPersistedSlot ? " is-row-editing" : ""}`}
                    >
                      <div className="ots-slot-col ots-slot-col--time">
                        <div className="ots-slot-time">
                          <select
                            className="ots-time-select"
                            value={row.start}
                            aria-label="Giờ bắt đầu"
                            disabled={rowInputsLocked}
                            onChange={(e) => {
                              const nextStart = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === originalIdx
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
                          <span className="ots-time-sep">đến</span>
                          <select
                            className="ots-time-select"
                            value={row.end}
                            aria-label="Giờ kết thúc"
                            disabled={rowInputsLocked}
                            onChange={(e) => {
                              const nextEnd = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === originalIdx
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
                        <div className="ots-peak-row">
                          <button
                            type="button"
                            className={`ots-peak-switch${row.isPeak ? " is-on" : ""}`}
                            disabled={rowInputsLocked}
                            aria-pressed={row.isPeak}
                            aria-label={row.isPeak ? "Tắt đánh dấu cao điểm" : "Bật cao điểm"}
                            onClick={() => togglePeakRow(originalIdx)}
                          >
                            <span className="ots-peak-switch-track" aria-hidden>
                              <span className="ots-peak-switch-knob" />
                            </span>
                          </button>
                          <span className="ots-peak-label">
                            {row.isPeak ? "Giờ cao điểm" : "Khung thường"}
                          </span>
                        </div>
                      </div>
                      <div className="ots-slot-col ots-slot-col--price">
                        <div className="ots-price-wrap">
                          <input
                            className="ots-price-input"
                            type="number"
                            min="0"
                            placeholder="0"
                            disabled={rowInputsLocked}
                            value={value ?? ""}
                            onChange={(e) => {
                              const nextRaw = e.target.value;
                              setSlotRows((prev) =>
                                prev.map((r, i) =>
                                  i === originalIdx
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
                                  i === originalIdx
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
                        <div className="ots-row-actions">
                          {hasPersistedSlot ? (
                            editingRowIdx === originalIdx ? (
                              <>
                                <button
                                  type="button"
                                  className="ots-row-text-btn ots-row-text-btn--save"
                                  disabled={saving}
                                  onClick={() => saveSingleRow(originalIdx)}
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  className="ots-row-text-btn ots-row-text-btn--ghost"
                                  disabled={saving}
                                  onClick={cancelRowEdit}
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="ots-edit-btn"
                                disabled={saving}
                                title="Chỉnh khung giờ rồi bấm Lưu (PUT /api/owner/time-slots/{id})"
                                onClick={() => beginEditRow(originalIdx)}
                              >
                                <Pencil size={17} strokeWidth={2.2} />
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              className="ots-row-text-btn ots-row-text-btn--save"
                              disabled={saving}
                              title="Tạo slot cho ngày này trên máy chủ"
                              onClick={() => saveSingleRow(originalIdx)}
                            >
                              Lưu dòng
                            </button>
                          )}
                          <button
                            type="button"
                            className="ots-del-btn"
                            disabled={saving}
                            title={`Xóa slot ngày ${weekDayLabels[activeDayIndex]} (một slot id)`}
                            onClick={() => removeRow(originalIdx)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
                </>
              ) : null}

              <div className="ots-add-row">
                <button
                  type="button"
                  disabled={saving || !sportTypeId}
                  onClick={() => {
                    const step = MANUAL_INSERT_STEP_MINUTES;
                    const visibleEnds = rowsForActiveDay.map(({ row }) => timeToMinutes(row.end) ?? 0);
                    const lastInDay =
                      rowsForActiveDay.length > 0
                        ? Math.max(...visibleEnds)
                        : null;
                    const fallbackStart = venueOpenTime ? formatTime(venueOpenTime) : "06:00";
                    const baseMin =
                      lastInDay != null && Number.isFinite(lastInDay)
                        ? lastInDay
                        : (timeToMinutes(fallbackStart) ?? 360);
                    const nextStartMin = baseMin;
                    const nextEndMin = nextStartMin + step;
                    const start = minutesToHHMM(nextStartMin);
                    const end = minutesToHHMM(nextEndMin);
                    addSlotForActiveDay(start, end);
                  }}
                >
                  <Plus size={16} />{" "}
                  {`Thêm khung (30p · chỉ ${weekDayLabels[activeDayIndex]})`}
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
        title={`Lưu khung giờ — chỉ ${weekDayLabels[activeDayIndex]}`}
        onClick={saveSlots}
      >
        <Save size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default OwnerTimeSlot;
