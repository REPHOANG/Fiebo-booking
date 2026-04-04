import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

let sportTypesCached = null;
let sportTypesInflight = null;

/**
 * GET `/api/sport-types` — danh sách môn (ApiResponse { data: [...] }).
 * Gộp request đồng thời và tái sử dụng kết quả trong phiên để giảm lưu lượng.
 */
export const getSportTypes = async () => {
  if (sportTypesCached != null) return sportTypesCached;
  if (!sportTypesInflight) {
    sportTypesInflight = api
      .get("/api/sport-types")
      .then((res) => {
        const data = unwrap(res);
        const list = Array.isArray(data) ? data : [];
        sportTypesCached = list;
        sportTypesInflight = null;
        return list;
      })
      .catch((err) => {
        sportTypesInflight = null;
        throw err;
      });
  }
  return sportTypesInflight;
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
