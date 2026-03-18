import React from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const OwnerEvents = () => {
  return (
    <div className="owner-home">
      <div className="owner-home-header">
        <h1>Danh sách sự kiện</h1>
        <Link to="/owner/events/create" className="oh-create-btn">
          <Plus size={16} />
          <span> Tạo sự kiện</span>
        </Link>
      </div>

      <div className="owner-home-content">
        <p>
          Đây là trang danh sách sự kiện của chủ sân. Khu vực này sẽ hiển thị
          các sự kiện bạn đã tạo.
        </p>
        <div className="owner-home-placeholder">
          <p>Hiện chưa có dữ liệu — bạn có thể tạo sự kiện mới.</p>
        </div>
      </div>
    </div>
  );
};

export default OwnerEvents;

