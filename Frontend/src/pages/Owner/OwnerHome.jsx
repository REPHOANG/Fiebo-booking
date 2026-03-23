import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import "./OwnerHome.css";

const OwnerHome = () => {
  return (
    <div className="owner-home">
      <div className="owner-home-header">
        <h1>Trang chủ Owner</h1>
        <Link to="/owner/create-venue" className="oh-create-btn">
          <Plus size={16} />
          <span> Tạo cơ sở mới</span>
        </Link>
      </div>

      <div className="owner-home-content">
        <p>
          Chào mừng chủ cơ sở! Đây là trang điều khiển chính. Danh sách cơ sở
          sẽ hiển thị ở đây.
        </p>

        <div className="owner-home-placeholder">
          <p>Hiện chưa có cơ sở nào — hãy tạo cơ sở mới.</p>
        </div>
      </div>
    </div>
  );
};

export default OwnerHome;
