import React, { useMemo, useState } from "react";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminTransactions = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    const key = search.trim().toLowerCase();
    return financeAdminTransactions.filter((item) => {
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      const matchType = typeFilter === "All" || item.type === typeFilter;
      const matchSearch =
        !key || item.id.toLowerCase().includes(key) || item.venue.toLowerCase().includes(key);
      return matchStatus && matchType && matchSearch;
    });
  }, [search, statusFilter, typeFilter]);

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Quan ly giao dich</h2>
      <div className="finance-admin-filters">
        <input
          className="finance-admin-input"
          placeholder="Tim theo ma giao dich hoac venue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="finance-admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">Tat ca trang thai</option>
          <option value="Success">Success</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Failed">Failed</option>
        </select>
        <select
          className="finance-admin-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">Tat ca loai</option>
          <option value="Booking">Booking</option>
          <option value="TopUp">TopUp</option>
          <option value="Refund">Refund</option>
          <option value="Payout">Payout</option>
        </select>
      </div>

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Ma giao dich</th>
              <th>Venue</th>
              <th>Loai</th>
              <th>So tien</th>
              <th>Ngay</th>
              <th>Trang thai</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.venue}</td>
                <td>{item.type}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.date}</td>
                <td>{item.status}</td>
              </tr>
            ))}
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6}>Khong tim thay giao dich phu hop bo loc.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminTransactions;
