import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

/**
 * GET `/api/sport-types` — danh sách môn (ApiResponse { data: [...] }).
 */
export const getSportTypes = async () => {
  const res = await api.get("/api/sport-types");
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
};

/**
 * Chuẩn hoá phần tử API thành { id, name } dùng cho dropdown / link / lọc.
 */
export function normalizeSportTypeList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((x) => ({
      id: Number(x?.id ?? x?.sportTypeId ?? x?.SportTypeId),
      name: String(x?.name ?? x?.sportTypeName ?? x?.SportTypeName ?? "").trim(),
    }))
    .filter((x) => Number.isFinite(x.id) && x.name);
}

/**
 * Parse `sport` query: số (id) hoặc ten gan dung so voi catalog tu API.
 * @param {string|null} sportParam
 * @param {{ id:number, name:string }[]} catalog
 */
export function sportTypeIdFromSearchParam(sportParam, catalog) {
  if (!sportParam) return null;
  const n = Number(sportParam);
  if (Number.isFinite(n) && !Number.isNaN(n)) return n;
  const list = Array.isArray(catalog) ? catalog : [];
  const q = String(sportParam).toLowerCase().trim();
  if (!q) return null;
  const row = list.find(
    (s) =>
      s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()),
  );
  return row?.id ?? null;
}
