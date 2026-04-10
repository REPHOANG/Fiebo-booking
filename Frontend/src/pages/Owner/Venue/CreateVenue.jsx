import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import {
  addVenueDocuments,
  createVenue,
  getVenueDraft,
  submitVenue,
  updateOwnerVenueInfo,
} from "../../../services/venueService";
import { getDistrictsByProvince, getProvinces } from "../../../services/addressService";
import CreateVenueStepBasic from "../CreateVenueSteps/CreateVenueStepBasic";
import CreateVenueStepDocuments from "../CreateVenueSteps/CreateVenueStepDocuments";
import CreateVenueStepReview from "../CreateVenueSteps/CreateVenueStepReview";
import "./CreateVenue.css";

// ── Yup Validation (Step 1: Create Venue draft) ──
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .min(3, "Tên cơ sở ít nhất 3 ký tự")
    .required("Vui lòng nhập tên cơ sở"),
  description: yup.string().optional(),
  openTime: yup.string().required("Vui lòng nhập giờ mở cửa"),
  closeTime: yup
    .string()
    .required("Vui lòng nhập giờ đóng cửa")
    .test("after-open", "Giờ đóng phải sau giờ mở", function (value) {
      const { openTime } = this.parent;
      if (!openTime || !value) return true;
      return value > openTime;
    }),
  provinceId: yup
    .number()
    .typeError("Vui lòng chọn tỉnh/thành")
    .required("Vui lòng chọn tỉnh/thành"),
  wardId: yup
    .number()
    .typeError("Vui lòng chọn phường/xã")
    .required("Vui lòng chọn phường/xã"),
  addressDetail: yup.string().trim().required("Vui lòng nhập địa chỉ chi tiết"),
  latitude: yup
    .number()
    .typeError("Vĩ độ phải là số")
    .min(-90, "Vĩ độ từ -90 đến 90")
    .max(90, "Vĩ độ từ -90 đến 90")
    .required("Vui lòng nhập vĩ độ"),
  longitude: yup
    .number()
    .typeError("Kinh độ phải là số")
    .min(-180, "Kinh độ từ -180 đến 180")
    .max(180, "Kinh độ từ -180 đến 180")
    .required("Vui lòng nhập kinh độ"),
});

/** Khớp DTO backend: LandUseDocument + BusinessDocument (ảnh là file, không phải URL) */
const DOC_SLOTS = [
  { apiPrefix: "LandUseDocument", label: "Giấy tờ sử dụng đất" },
  { apiPrefix: "BusinessDocument", label: "Giấy phép kinh doanh" },
];

const STEPS = ["Tạo cơ sở", "Giấy tờ", "Xác nhận"];

function normalizeTimeForApi(t) {
  if (!t || typeof t !== "string") return "";
  const s = t.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

/** Chuẩn hóa ngày từ API (ISO / DateTime) cho input type="date" */
function draftDateToInputValue(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Backend OwnerVenueDetailResponse: LandDocument (+ alias cũ nếu có) */
function pickLandDocFromDraft(draft) {
  if (!draft) return null;
  return (
    draft.landDocument ??
    draft.LandDocument ??
    draft.landUseDocument ??
    draft.LandUseDocument ??
    null
  );
}

/** Backend: BusinessLicense (+ alias) */
function pickBusinessDocFromDraft(draft) {
  if (!draft) return null;
  return (
    draft.businessLicense ??
    draft.BusinessLicense ??
    draft.businessDocument ??
    draft.BusinessDocument ??
    null
  );
}

function docImagesList(doc) {
  if (!doc) return [];
  const imgs = doc.images ?? doc.Images;
  return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
}

function buildDocsStateFromDraft(draft) {
  const land = pickLandDocFromDraft(draft);
  const biz = pickBusinessDocFromDraft(draft);
  return [
    {
      apiPrefix: DOC_SLOTS[0].apiPrefix,
      label: DOC_SLOTS[0].label,
      issueDate: draftDateToInputValue(land?.issueDate ?? land?.IssueDate),
      expiryDate: draftDateToInputValue(land?.expiryDate ?? land?.ExpiryDate),
      files: [],
      existingImageUrls: docImagesList(land),
    },
    {
      apiPrefix: DOC_SLOTS[1].apiPrefix,
      label: DOC_SLOTS[1].label,
      issueDate: draftDateToInputValue(biz?.issueDate ?? biz?.IssueDate),
      expiryDate: draftDateToInputValue(biz?.expiryDate ?? biz?.ExpiryDate),
      files: [],
      existingImageUrls: docImagesList(biz),
    },
  ];
}

/** yyyy-mm-dd → dd/mm/yyyy cho màn xác nhận */
function formatReviewDate(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const CreateVenue = () => {
  const navigate = useNavigate();
  const { id: routeVenueId } = useParams();
  const [searchParams] = useSearchParams();
  const resumeVenueId = searchParams.get("venueId") || routeVenueId || null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createdVenue, setCreatedVenue] = useState(null); // { venueId, status }
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  /** Ảnh đại diện URL từ GET detail (tiếp tục bản nháp) */
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");
  const thumbnailInputRef = useRef(null);
  const docInputRefs = useRef({});
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const venueId = createdVenue?.venueId ?? createdVenue?.VenueId ?? null;

  const [docs, setDocs] = useState(() =>
    DOC_SLOTS.map((s) => ({
      apiPrefix: s.apiPrefix,
      label: s.label,
      issueDate: "",
      expiryDate: "",
      files: [],
      existingImageUrls: [],
    })),
  );

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [thumbnailFile]);

  const {
    register: reg,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      openTime: "05:00",
      closeTime: "22:00",
      provinceId: "",
      wardId: "",
      addressDetail: "",
      latitude: 21.0285,
      longitude: 105.8542,
    },
  });

  const selectedProvinceId = watch("provinceId");

  useEffect(() => {
    let mounted = true;
    if (!resumeVenueId) {
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const draft = await getVenueDraft(resumeVenueId);
        if (!mounted || !draft) return;

        const land = pickLandDocFromDraft(draft);
        const biz = pickBusinessDocFromDraft(draft);
        const landImgs = docImagesList(land);
        const bizImgs = docImagesList(biz);

        const canonicalVenueId = Number(resumeVenueId);
        setCreatedVenue({
          venueId: canonicalVenueId,
          status: draft?.status ?? draft?.Status ?? "DRAFT",
        });

        setValue("name", draft?.name ?? draft?.Name ?? "");
        setValue("description", draft?.description ?? draft?.Description ?? "");
        const openRaw = draft?.openTime ?? draft?.OpenTime ?? "";
        const closeRaw = draft?.closeTime ?? draft?.CloseTime ?? "";
        setValue("openTime", String(openRaw).slice(0, 5));
        setValue("closeTime", String(closeRaw).slice(0, 5));
        setValue("provinceId", String(draft?.provinceId ?? draft?.ProvinceId ?? ""));
        setValue("wardId", String(draft?.wardId ?? draft?.WardId ?? ""));
        setValue("addressDetail", draft?.addressDetail ?? draft?.AddressDetail ?? "");
        if (draft?.latitude ?? draft?.Latitude) {
          setValue("latitude", Number(draft?.latitude ?? draft?.Latitude));
        }
        if (draft?.longitude ?? draft?.Longitude) {
          setValue("longitude", Number(draft?.longitude ?? draft?.Longitude));
        }

        setExistingThumbnailUrl(String(draft?.thumbnailUrl ?? draft?.ThumbnailUrl ?? "").trim());
        setDocs(buildDocsStateFromDraft(draft));

        const hasFullDocumentsOnServer = landImgs.length > 0 && bizImgs.length > 0;
        setActiveStep(hasFullDocumentsOnServer ? 2 : 1);
      } catch (e) {
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được bản nháp để tiếp tục.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resumeVenueId, setValue]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingProvinces(true);
      try {
        const list = await getProvinces();
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: x?.id ?? x?.provinceId ?? x?.ProvinceId,
            name: x?.name ?? x?.provinceName ?? x?.ProvinceName,
          }))
          .filter((x) => x.id != null && x.name);
        if (mounted) setProvinceOptions(normalized);
      } catch (e) {
        if (mounted) setProvinceOptions([]);
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách tỉnh/thành.");
      } finally {
        if (mounted) setLoadingProvinces(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!selectedProvinceId) {
      setDistrictOptions([]);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      setLoadingDistricts(true);
      try {
        const list = await getDistrictsByProvince(selectedProvinceId);
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: x?.id ?? x?.districtId ?? x?.wardId ?? x?.DistrictId ?? x?.WardId,
            name: x?.name ?? x?.districtName ?? x?.wardName ?? x?.DistrictName ?? x?.WardName,
          }))
          .filter((x) => x.id != null && x.name);
        if (mounted) setDistrictOptions(normalized);
      } catch (e) {
        if (mounted) setDistrictOptions([]);
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách quận/huyện.");
      } finally {
        if (mounted) setLoadingDistricts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedProvinceId]);

  const lat = Number(watch("latitude"));
  const lng = Number(watch("longitude"));
  const rwName = watch("name");
  const rwDescription = watch("description");
  const rwOpen = watch("openTime");
  const rwClose = watch("closeTime");
  const rwAddress = watch("addressDetail");
  const rwWardId = watch("wardId");
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const pickedPosition = useMemo(() => (hasCoords ? [lat, lng] : [21.0285, 105.8542]), [hasCoords, lat, lng]);

  const pickCoords = useCallback(
    (nextLat, nextLng) => {
      const a = Number(nextLat);
      const o = Number(nextLng);
      if (!Number.isFinite(a) || !Number.isFinite(o)) return;
      setValue("latitude", a, { shouldValidate: true, shouldDirty: true });
      setValue("longitude", o, { shouldValidate: true, shouldDirty: true });
    },
    [setValue],
  );

  const useMyLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị (geolocation).");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const a = pos?.coords?.latitude;
        const o = pos?.coords?.longitude;
        pickCoords(a, o);
        toast.success("Đã lấy vị trí hiện tại.");
      },
      (err) => {
        toast.error(err?.message || "Không lấy được vị trí hiện tại.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [pickCoords]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const existingId = createdVenue?.venueId ?? createdVenue?.VenueId ?? null;

      if (existingId) {
        await updateOwnerVenueInfo(existingId, {
          name: data.name,
          description: data.description,
          addressDetail: data.addressDetail,
          provinceId: data.provinceId,
          wardId: data.wardId,
          latitude: data.latitude,
          longitude: data.longitude,
          openTime: normalizeTimeForApi(data.openTime),
          closeTime: normalizeTimeForApi(data.closeTime),
          thumbnailFile: thumbnailFile || undefined,
        });
        toast.success(`Đã cập nhật cơ sở #${existingId}`);
        if (thumbnailFile) setExistingThumbnailUrl("");
        setActiveStep(1);
        return;
      }

      const form = new FormData();
      form.append("Name", String(data.name || "").trim());
      form.append("OpenTime", normalizeTimeForApi(data.openTime));
      form.append("CloseTime", normalizeTimeForApi(data.closeTime));
      if (data.description != null && String(data.description).trim() !== "") {
        form.append("Description", String(data.description).trim());
      }
      form.append("AddressDetail", String(data.addressDetail || "").trim());
      form.append("ProvinceId", String(Number(data.provinceId)));
      form.append("WardId", String(Number(data.wardId)));
      form.append("Latitude", String(Number(data.latitude)));
      form.append("Longitude", String(Number(data.longitude)));
      if (thumbnailFile) form.append("Thumbnail", thumbnailFile);

      const result = await createVenue(form);
      const id = result?.venueId ?? result?.VenueId;
      const status = result?.status ?? result?.Status ?? "DRAFT";
      if (id) {
        toast.success(`Tạo cơ sở thành công  #${id}`);
        setCreatedVenue({ venueId: id, status });
        setActiveStep(1);
      } else {
        toast.error("Phản hồi API thiếu venueId.");
      }
    } catch (err) {
      console.error("Create venue error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        "Tạo cơ sở thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDocsAndNext = async () => {
    if (!venueId) return;
    setIsSubmitting(true);
    try {
      const missingDate = docs.find((d) => !d.issueDate || !d.expiryDate);
      if (missingDate) {
        toast.error(`Vui lòng nhập đủ ngày cấp và ngày hết hạn cho "${missingDate.label}".`);
        return;
      }
      const invalidDateRange = docs.find((d) => {
        const issue = new Date(d.issueDate);
        const expiry = new Date(d.expiryDate);
        if (Number.isNaN(issue.getTime()) || Number.isNaN(expiry.getTime())) return true;
        return expiry.getTime() < issue.getTime();
      });
      if (invalidDateRange) {
        toast.error(`Ngày hết hạn phải sau ngày cấp cho "${invalidDateRange.label}".`);
        return;
      }
      const slotHasImages = (d) =>
        (d.files?.length ?? 0) > 0 || (d.existingImageUrls?.length ?? 0) > 0;
      const missingImages = docs.find((d) => !slotHasImages(d));
      if (missingImages) {
        toast.error(
          `Cần ít nhất 1 ảnh cho "${missingImages.label}" (file mới hoặc đã lưu trên máy chủ).`,
        );
        return;
      }
      const tooMany = docs.find((d) => (d.files?.length ?? 0) > 5);
      if (tooMany) {
        toast.error(`Mỗi loại giấy tờ tối đa 5 ảnh mới ("${tooMany.label}").`);
        return;
      }

      const hasNewFiles = docs.some((d) => (d.files?.length ?? 0) > 0);
      const allSlotsHaveServerImages = docs.every((d) => (d.existingImageUrls?.length ?? 0) > 0);
      const allSlotsHaveNewFiles = docs.every((d) => (d.files?.length ?? 0) > 0);

      if (hasNewFiles) {
        if (!allSlotsHaveNewFiles) {
          toast.error(
            "Khi tải ảnh mới lần đầu, cần chọn file cho cả hai loại giấy trong cùng một lần. Nếu ảnh đã có trên máy chủ, bỏ chọn file và bấm Lưu để tiếp tục.",
          );
          return;
        }
        const form = new FormData();
        docs.forEach((d) => {
          form.append(`${d.apiPrefix}.IssueDate`, d.issueDate);
          form.append(`${d.apiPrefix}.ExpiryDate`, d.expiryDate);
          d.files.forEach((file) => {
            if (file) form.append(`${d.apiPrefix}.Images`, file);
          });
        });
        await addVenueDocuments(venueId, form);
        try {
          const refreshed = await getVenueDraft(venueId);
          if (refreshed) setDocs(buildDocsStateFromDraft(refreshed));
        } catch {
          /* bước xác nhận vẫn dùng state hiện tại */
        }
        toast.success("Đã tải lên giấy tờ.");
      } else if (allSlotsHaveServerImages) {
        toast.success("Giấy tờ đã có trên máy chủ — sang bước xác nhận.");
      } else {
        toast.error(
          "Thiếu ảnh giấy tờ. Hãy tải đủ hai loại cùng lúc, hoặc đảm bảo cả hai loại đã được lưu trước đó trên máy chủ.",
        );
        return;
      }

      setActiveStep(2);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Không lưu được giấy tờ.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const doSubmitVenue = async () => {
    if (!venueId) return;
    setIsSubmitting(true);
    try {
      await submitVenue(venueId);
      toast.success("Đã gửi duyệt cơ sở.");
      navigate("/owner/venues");
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Không gửi duyệt được.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const review = useMemo(() => {
    const pid =
      selectedProvinceId != null && selectedProvinceId !== "" ? String(selectedProvinceId) : "";
    const wid = rwWardId != null && rwWardId !== "" ? String(rwWardId) : "";
    const provinceName = provinceOptions.find((p) => String(p.id) === pid)?.name ?? "";
    const wardName = districtOptions.find((w) => String(w.id) === wid)?.name ?? "";

    const desc = String(rwDescription ?? "").trim();
    const thumbnailSrc = thumbnailPreviewUrl || existingThumbnailUrl || null;
    const thumbnailCaption =
      thumbnailFile?.name ||
      (existingThumbnailUrl && !thumbnailFile ? "Ảnh đã lưu trên máy chủ" : null);

    const docsSummary = docs.map((d) => ({
      label: d.label,
      issueDateLabel: formatReviewDate(d.issueDate),
      expiryDateLabel: formatReviewDate(d.expiryDate),
      newFileCount: d.files?.length ?? 0,
      existingImageUrls: Array.isArray(d.existingImageUrls) ? d.existingImageUrls : [],
    }));

    return {
      venueId,
      name: rwName,
      description: desc,
      openTime: rwOpen,
      closeTime: rwClose,
      addressDetail: rwAddress,
      provinceName: provinceName || "—",
      wardName: wardName || "—",
      thumbnailSrc,
      thumbnailCaption,
      docsSummary,
    };
  }, [
    venueId,
    docs,
    provinceOptions,
    districtOptions,
    selectedProvinceId,
    rwWardId,
    rwName,
    rwDescription,
    rwOpen,
    rwClose,
    rwAddress,
    thumbnailFile,
    existingThumbnailUrl,
    thumbnailPreviewUrl,
  ]);

  return (
    <div className="create-venue-page">
      <div className="cv-container">
        <div className="cv-header">
          <button type="button" className="cv-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Tạo cơ sở mới</h1>
            <p>Thực hiện theo 3 bước để gửi duyệt cơ sở</p>
          </div>
        </div>

        <div className="cv-stepper" aria-label="Các bước tạo cơ sở">
          {STEPS.map((t, idx) => (
            <div
              key={t}
              className={`cv-step${idx === activeStep ? " active" : ""}${idx < activeStep ? " done" : ""}`}
            >
              <div className="cv-step-dot">{idx < activeStep ? "✓" : idx + 1}</div>
              <div className="cv-step-title">
                {idx + 1}. {t}
              </div>
            </div>
          ))}
        </div>

        {activeStep === 0 ? (
          <CreateVenueStepBasic
            register={reg}
            errors={errors}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            setValue={setValue}
            thumbnailFile={thumbnailFile}
            setThumbnailFile={setThumbnailFile}
            thumbnailPreviewUrl={thumbnailPreviewUrl}
            thumbnailInputRef={thumbnailInputRef}
            provinceOptions={provinceOptions}
            districtOptions={districtOptions}
            loadingProvinces={loadingProvinces}
            loadingDistricts={loadingDistricts}
            selectedProvinceId={selectedProvinceId}
            lat={lat}
            lng={lng}
            hasCoords={hasCoords}
            pickedPosition={pickedPosition}
            pickCoords={pickCoords}
            useMyLocation={useMyLocation}
            isSubmitting={isSubmitting}
            onCancel={() => navigate(-1)}
            existingThumbnailUrl={existingThumbnailUrl}
            isEditingExistingDraft={venueId != null}
          />
        ) : null}

        {activeStep === 1 ? (
          <CreateVenueStepDocuments
            venueId={venueId}
            createdVenue={createdVenue}
            docs={docs}
            setDocs={setDocs}
            docInputRefs={docInputRefs}
            isSubmitting={isSubmitting}
            onBack={() => setActiveStep(0)}
            onSaveAndNext={saveDocsAndNext}
          />
        ) : null}

        {activeStep === 2 ? (
          <CreateVenueStepReview
            review={review}
            isSubmitting={isSubmitting}
            onBack={() => setActiveStep(1)}
            onSubmitVenue={doSubmitVenue}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CreateVenue;
