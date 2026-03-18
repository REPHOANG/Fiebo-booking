import React from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const CreateEvent = () => {
  return (
    <div className="owner-home">
      <div className="owner-home-header">
        <h1>Tạo sự kiện</h1>
        <Link to="/owner/events" className="oh-create-btn">
          <Plus size={16} />
          <span> Danh sách</span>
        </Link>
      </div>

      <div className="owner-home-content">
        <p>
          Placeholder trang tạo sự kiện cho chủ sân. Khi backend sẵn endpoint
          tạo sự kiện, form sẽ được triển khai tại đây.
        </p>
        <div className="owner-home-placeholder">
          <p>Chưa có form tạo sự kiện.</p>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;

