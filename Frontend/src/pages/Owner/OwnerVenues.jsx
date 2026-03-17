import React from "react";
import { Link } from "react-router-dom";
import "./OwnerVenues.css";

const OwnerVenues = () => {
  // TODO: khi backend có API, gọi list cơ sở tại đây
  const venues = [];

  return (
    <div className="owner-venues-page">
      <div className="ov-header">
        <div>
          <h1>Danh sách sân của tôi</h1>
          <p>Quản lý các cơ sở và sân bạn đang sở hữu.</p>
        </div>
        <Link to="/owner/create-venue" className="ov-create-btn">
          + Tạo cơ sở mới
        </Link>
      </div>

      {venues.length === 0 ? (
        <div className="ov-empty">
          <p>Hiện bạn chưa có cơ sở nào.</p>
          <Link to="/owner/create-venue" className="ov-create-link">
            Bắt đầu tạo cơ sở đầu tiên
          </Link>
        </div>
      ) : (
        <div className="ov-list">
          {/* Render danh sách sân ở đây */}
        </div>
      )}
    </div>
  );
};

export default OwnerVenues;

