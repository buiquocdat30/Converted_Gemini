import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { providersAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProviderModal = ({ provider, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (provider) {
      setIsEditing(true);
      setFormData({
        name: provider.name
      });
    }
  }, [provider]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên provider');
      return;
    }

    try {
      setLoading(true);
      
      if (isEditing) {
        await providersAPI.update(provider.id, formData);
        toast.success('Cập nhật provider thành công');
      } else {
        await providersAPI.create(formData);
        toast.success('Tạo provider thành công');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? 'Sửa Provider' : 'Thêm Provider'}
          </h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên Provider *</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên provider"
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Tạo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderModal; 