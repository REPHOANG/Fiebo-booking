import React, { useEffect, useState } from "react";
import { getOwnerPayouts } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = ["", "Pending", "Processing", "Completed"];

const FinanceAdminOwnerPayouts = () => {
  const now = new Date();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getOwnerPayouts({ status: status || undefined, year: year || undefined, month: month || undefined })
      .then(setPayouts)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [status, year, month]);

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Danh sách payout chủ sân</h2>

      <div className="finance-admin-filters">
        <div />
        <select className="finance-admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="finance-admin-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Tất cả tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
          <input className="finance-admin-input" type="number" placeholder="Năm" value={year}
            onChange={(e) => setYear(e.target.value)} style={{ width: 90 }} />
        </div>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Chủ sân</th>
              <th>Cơ sở</th>
              <th>Tháng/Năm</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có dữ liệu</td></tr>
            ) : payouts.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.ownerName}</td>
                <td>{item.venueName}</td>
                <td>{item.month && item.year ? `${String(item.month).padStart(2,"0")}/${item.year}` : "—"}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminOwnerPayouts;
