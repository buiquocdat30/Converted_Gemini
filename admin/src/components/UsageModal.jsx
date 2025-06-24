import React from 'react';
import { X } from 'lucide-react';

const UsageModal = ({ data, onClose }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'status-active';
      case 'COOLDOWN':
        return 'status-cooldown';
      case 'EXHAUSTED':
        return 'status-exhausted';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Hoạt động';
      case 'COOLDOWN':
        return 'Đang nghỉ';
      case 'EXHAUSTED':
        return 'Đã hết quota';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Chi tiết Usage</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="usage-details">
          <div className="key-info">
            <h4>Thông tin Key</h4>
            <p><strong>Key:</strong> <code>{data.key}</code></p>
            <p><strong>Label:</strong> {data.label || 'Không có nhãn'}</p>
            <p><strong>Ngày tạo:</strong> {new Date(data.createdAt).toLocaleString('vi-VN')}</p>
          </div>

          <div className="usage-list">
            <h4>Usage theo Model</h4>
            {data.usage.length === 0 ? (
              <p className="text-gray-500">Chưa có usage records</p>
            ) : (
              <div className="usage-grid">
                {data.usage.map((usage) => (
                  <div key={usage.id} className="usage-card">
                    <div className="usage-header">
                      <h5>{usage.model.label}</h5>
                      <span className={`status-badge ${getStatusColor(usage.status)}`}>
                        {getStatusText(usage.status)}
                      </span>
                    </div>
                    
                    <div className="usage-info">
                      <p><strong>Model:</strong> {usage.model.value}</p>
                      <p><strong>Provider:</strong> {usage.model.provider.name}</p>
                      <p><strong>Số lần sử dụng:</strong> {usage.usageCount}</p>
                      <p><strong>Prompt tokens:</strong> {usage.promptTokens.toLocaleString()}</p>
                      <p><strong>Completion tokens:</strong> {usage.completionTokens.toLocaleString()}</p>
                      <p><strong>Tổng tokens:</strong> {usage.totalTokens.toLocaleString()}</p>
                      <p><strong>Lần sử dụng cuối:</strong> {
                        usage.lastUsedAt 
                          ? new Date(usage.lastUsedAt).toLocaleString('vi-VN')
                          : 'Chưa sử dụng'
                      }</p>
                    </div>

                    {usage.model.rpm && (
                      <div className="model-limits">
                        <h6>Giới hạn:</h6>
                        <p>RPM: {usage.model.rpm}/phút</p>
                        <p>TPM: {usage.model.tpm}/phút</p>
                        <p>RPD: {usage.model.rpd}/ngày</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageModal; 