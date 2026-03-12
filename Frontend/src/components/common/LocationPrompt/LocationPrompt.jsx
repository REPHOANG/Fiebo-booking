import React, { useState } from 'react';
import { Modal, Button, Typography } from 'antd';

const { Title, Text } = Typography;

const LocationPrompt = ({ onConfirm }) => {
  const [error, setError] = useState(null);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onConfirm(position.coords);
        },
        (err) => {
          setError('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí hoặc thử lại.');
        }
      );
    } else {
      setError('Trình duyệt không hỗ trợ lấy vị trí.');
    }
  };

  return (
    <Modal
      open={true}
      centered
      closable={false}
      footer={[
        <Button key="allow" type="primary" onClick={handleGetLocation}>
          Cho phép
        </Button>,
        <Button key="deny" onClick={() => onConfirm(null)}>
          Từ chối
        </Button>,
      ]}
    >
      <Title level={4}>Bạn có cho phép truy cập vị trí?</Title>
      <Text>Chúng tôi cần vị trí của bạn để cung cấp trải nghiệm tốt hơn.</Text>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </Modal>
  );
};

export default LocationPrompt;
