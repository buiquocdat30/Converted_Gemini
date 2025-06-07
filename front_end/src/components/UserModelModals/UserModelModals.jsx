import React from 'react';
import './UserModelModals.css';

const UserModelModals = ({ keyData, onClose }) => {
  // Hàm helper để lấy màu trạng thái
  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "status-active";
      case "COOLDOWN":
        return "status-cooldown";
      case "EXHAUSTED":
        return "status-exhausted";
      default:
        return "";
    }
  };

  // Hàm helper để hiển thị text trạng thái
  const getStatusText = (status) => {
    switch (status) {
      case "ACTIVE":
        return "🟢 Hoạt động";
      case "COOLDOWN":
        return "🟡 Đang nghỉ";
      case "EXHAUSTED":
        return "🔴 Đã hết quota";
      default:
        return "⚪ Không xác định";
    }
  };

  return (
    <div className="model-modal-overlay" onClick={onClose}>
      <div className="model-modal-content" onClick={e => e.stopPropagation()}>
        <div className="model-modal-header">
          <h3>Chi tiết Key: {keyData.key.substring(0, 10)}...</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="model-modal-body">
          <div className="key-info">
            <p><strong>Label:</strong> {keyData.label || "Không có nhãn"}</p>
            <p><strong>Trạng thái tổng thể:</strong> {getStatusText(keyData.status)}</p>
            <p><strong>Số lần sử dụng:</strong> {keyData.usageCount || 0}</p>
            <p><strong>Lần sử dụng cuối:</strong> {
              keyData.lastUsedAt 
                ? new Date(keyData.lastUsedAt).toLocaleString()
                : "Chưa sử dụng"
            }</p>
          </div>

          <div className="models-section">
            <h4>Chi tiết trạng thái theo model:</h4>
            <div className="models-grid">
              {keyData.models?.map((modelStatus, index) => (
                <div 
                  key={`${keyData.id}-${modelStatus.model?.id || modelStatus.modelId || index}`} 
                  className="model-status-card"
                >
                  <div className="model-header">
                    <h5>{modelStatus.model?.label || "Model không xác định"}</h5>
                    <span className={`status-badge ${getStatusColor(modelStatus.status)}`}>
                      {getStatusText(modelStatus.status)}
                    </span>
                  </div>
                  <div className="model-info">
                    <p>Model ID: {modelStatus.model?.value || modelStatus.modelId}</p>
                    <p>Số lần sử dụng: {modelStatus.usageCount || 0}</p>
                    <p>Lần sử dụng cuối: {
                      modelStatus.lastUsedAt 
                        ? new Date(modelStatus.lastUsedAt).toLocaleString()
                        : "Chưa sử dụng"
                    }</p>
                    {modelStatus.status === "EXHAUSTED" && (
                      <p className="exhausted-warning">
                        ⚠️ Key đã hết quota cho model này. 
                        Vui lòng thêm key mới hoặc sử dụng model khác.
                      </p>
                    )}
                    {modelStatus.status === "COOLDOWN" && (
                      <p className="cooldown-info">
                        ℹ️ Key đang trong thời gian nghỉ. 
                        Sẽ tự động kích hoạt lại sau một thời gian.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModelModals; 