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
          <h3>Chi tiết Key: {keyData.key?.length > 32 ? keyData.key.slice(0, 32) + '...' : keyData.key}</h3>
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
              {keyData.models?.map((model, index) => (
                <div 
                  key={`${keyData.id}-${model.id || index}`} 
                  className="model-status-card"
                >
                  <div className="model-header">
                    <h5>{model.label || "Model không xác định"}</h5>
                    <span className={`status-badge ${getStatusColor(model.status)}`}>
                      {getStatusText(model.status)}
                    </span>
                  </div>
                  <div className="model-info">
                    <p><strong>Model ID:</strong> {model.value}</p>
                    {model.description && (
                      <p><strong>Mô tả:</strong> {model.description}</p>
                    )}
                    <p><strong>Provider:</strong> {model.provider?.name || "Không xác định"}</p>
                    
                    {/* Thông tin giới hạn */}
                    <div className="model-limits">
                      <h6>Giới hạn sử dụng:</h6>
                      <p>RPM: {model.rpm ? `${model.rpm}/phút` : "Không giới hạn"}</p>
                      <p>TPM: {model.tpm ? `${model.tpm}/phút` : "Không giới hạn"}</p>
                      <p>RPD: {model.rpd ? `${model.rpd}/ngày` : "Không giới hạn"}</p>
                    </div>

                    {/* Thống kê sử dụng */}
                    <div className="model-usage">
                      <h6>Thống kê sử dụng:</h6>
                      <p>Số lần sử dụng: {model.usageCount || 0}</p>
                      <p>Prompt tokens: {model.promptTokens || 0}</p>
                      <p>Completion tokens: {model.completionTokens || 0}</p>
                      <p>Tổng tokens: {model.totalTokens || 0}</p>
                      <p>Lần sử dụng cuối: {
                        model.lastUsedAt 
                          ? new Date(model.lastUsedAt).toLocaleString()
                          : "Chưa sử dụng"
                      }</p>
                    </div>

                    {/* Thông báo trạng thái */}
                    {model.status === "EXHAUSTED" && (
                      <p className="exhausted-warning">
                        ⚠️ Key đã hết quota cho model này. 
                        Vui lòng thêm key mới hoặc sử dụng model khác.
                      </p>
                    )}
                    {model.status === "COOLDOWN" && (
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