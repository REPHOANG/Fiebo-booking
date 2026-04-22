import React, { useEffect, useState } from "react";
import { completePayout, getOwnerPayouts } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminProcessOwnerPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getOwnerPayouts({ status: "Pending" })
      .then(setPayouts)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (id) => {
    setProcessing(id);
    try {
      await completePayout(id);
      setPayouts((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "Completed" } : item)
      );
    } catch (err) {
      alert(err?.response?.data?.message ?? "Xử lý thất bại.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Xử lý payout chủ sân</h2>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Chủ sân</th>
              <th>Cơ sở</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có payout đang chờ xử lý</td></tr>
            ) : payouts.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.ownerName}</td>
                <td>{item.venueName}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    className="finance-admin-link-btn"
                    disabled={item.status === "Completed" || processing === item.id}
                    onClick={() => handleComplete(item.id)}
                  >
                    {processing === item.id ? "Đang xử lý..." : "Hoàn tất"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminProcessOwnerPayouts;
