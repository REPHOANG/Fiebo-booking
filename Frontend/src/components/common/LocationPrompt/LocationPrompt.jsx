import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * Chỉ hỏi user muốn chia sẻ vị trí hay không.
 * onConfirm(true)  → user đồng ý  (App sẽ gọi geolocation sau)
 * onConfirm(false) → user từ chối
 */
const LocationPrompt = ({ onConfirm }) => {
  return (
    <Modal
      open={true}
      centered
      closable={false}
      footer={[
        <Button key="allow" type="primary" onClick={() => onConfirm(true)}>
          Cho phép
        </Button>,
        <Button key="deny" onClick={() => onConfirm(false)}>
          Từ chối
        </Button>,
      ]}
    >
      <Title level={4}>Bạn có cho phép truy cập vị trí?</Title>
      <Text>Chúng tôi cần vị trí của bạn để cung cấp trải nghiệm tốt hơn.</Text>
    </Modal>
  );
};

export default LocationPrompt;
