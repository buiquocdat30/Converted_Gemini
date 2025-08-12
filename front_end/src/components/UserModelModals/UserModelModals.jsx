import React from 'react';
import './UserModelModals.css';

const UserModelModals = ({ keyData, onClose }) => {
  if (!keyData) return null;

  return (
    <div className="UMM-modal-overlay" onClick={onClose}>
      <div className="UMM-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="UMM-modal-header">
          <h3>Chi tiết API Key</h3>
          <button className="UMM-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="UMM-modal-body">
          <div className="UMM-key-info">
            <div className="UMM-key-preview">
              <strong>Key:</strong> {keyData.key.substring(0, 15)}...
            </div>
            <div className="UMM-key-label">
              <strong>Nhãn:</strong> {keyData.label || "Không có nhãn"}
            </div>
            <div className="UMM-key-created">
              <strong>Tạo lúc:</strong> {new Date(keyData.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>

          <div className="UMM-usage-section">
            <h4>📊 Thống kê sử dụng hôm nay</h4>
            
            {keyData.usage && keyData.usage.length > 0 ? (
              <div className="UMM-usage-details">
                <div className="UMM-usage-summary">
                  <div className="UMM-summary-item">
                    <span className="UMM-summary-label">Tổng số lần sử dụng:</span>
                    <span className="UMM-summary-value">
                      {keyData.usage.reduce((total, u) => total + (u.usageCount || 0), 0)} lần
                    </span>
                  </div>
                  <div className="UMM-summary-item">
                    <span className="UMM-summary-label">Tổng tokens:</span>
                    <span className="UMM-summary-value">
                      {keyData.usage.reduce((total, u) => total + (u.totalTokens || 0), 0)} tokens
                    </span>
                  </div>
                  <div className="UMM-summary-item">
                    <span className="UMM-summary-label">Số models:</span>
                    <span className="UMM-summary-value">{keyData.usage.length} models</span>
                  </div>
                </div>

                <div className="UMM-models-list">
                  <h5>Chi tiết theo từng model:</h5>
                  {keyData.usage.map(u => (
                    <div key={u.modelId} className="UMM-model-item">
                      <div className="UMM-model-header">
                        <span className="UMM-model-name">
                          {u.model?.label || u.modelId}
                        </span>
                        <span className={`UMM-status-badge UMM-status-${u.status?.toLowerCase()}`}>
                          {u.status === "ACTIVE" && "🟢 Hoạt động"}
                          {u.status === "COOLDOWN" && "🟡 Đang nghỉ"}
                          {u.status === "EXHAUSTED" && "🔴 Hết quota"}
                        </span>
                      </div>
                      
                      <div className="UMM-model-stats">
                        <div className="UMM-stat-item">
                          <span className="UMM-stat-label">Số lần sử dụng:</span>
                          <span className="UMM-stat-value">{u.usageCount || 0} lần</span>
                        </div>
                        <div className="UMM-stat-item">
                          <span className="UMM-stat-label">Prompt tokens:</span>
                          <span className="UMM-stat-value">{u.promptTokens || 0}</span>
                        </div>
                        <div className="UMM-stat-item">
                          <span className="UMM-stat-label">Completion tokens:</span>
                          <span className="UMM-stat-value">{u.completionTokens || 0}</span>
                        </div>
                        <div className="UMM-stat-item">
                          <span className="UMM-stat-label">Tổng tokens:</span>
                          <span className="UMM-stat-value">{u.totalTokens || 0}</span>
                        </div>
                        {u.lastUsedAt && (
                          <div className="UMM-stat-item">
                            <span className="UMM-stat-label">Lần cuối sử dụng:</span>
                            <span className="UMM-stat-value">
                              {new Date(u.lastUsedAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="UMM-no-usage">
                <p>⚠️ Không có dữ liệu sử dụng hôm nay</p>
                <p>Key này chưa được sử dụng hoặc chưa có thống kê cho ngày hôm nay.</p>
              </div>
            )}
          </div>
        </div>

        <div className="UMM-modal-footer">
          <button className="UMM-close-button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModelModals; 