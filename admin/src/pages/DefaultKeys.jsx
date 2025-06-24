import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { defaultKeysAPI } from '../services/api';
import toast from 'react-hot-toast';
import DefaultKeyModal from '../components/DefaultKeyModal';
import UsageModal from '../components/UsageModal';

const DefaultKeys = () => {
  const [defaultKeys, setDefaultKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    fetchDefaultKeys();
  }, []);

  const fetchDefaultKeys = async () => {
    try {
      setLoading(true);
      const response = await defaultKeysAPI.getAll();
      setDefaultKeys(response.data.data);
    } catch (error) {
      console.error('Error fetching default keys:', error);
      toast.error('Lỗi khi tải danh sách default keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingKey(null);
    setShowModal(true);
  };

  const handleEdit = (key) => {
    setEditingKey(key);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa default key này?')) {
      return;
    }

    try {
      await defaultKeysAPI.delete(id);
      toast.success('Xóa default key thành công');
      fetchDefaultKeys();
    } catch (error) {
      console.error('Error deleting default key:', error);
      toast.error('Lỗi khi xóa default key');
    }
  };

  const handleViewUsage = (key) => {
    setSelectedKey(key);
    setShowUsageModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingKey(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchDefaultKeys();
  };

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

  if (loading) {
    return (
      <div className="main-content">
        <div className="card">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Đang tải...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quản lý Default Keys</h2>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            Thêm Key
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Số Models</th>
              <th>Tổng Usage</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {defaultKeys.map((key) => {
              const totalUsage = key.usage.reduce((sum, usage) => sum + usage.usageCount, 0);
              const activeUsage = key.usage.filter(usage => usage.status === 'ACTIVE').length;
              
              return (
                <tr key={key.id}>
                  <td>
                    <code>{key.key.substring(0, 20)}...</code>
                  </td>
                  <td>{key.label || 'Không có nhãn'}</td>
                  <td>
                    <span className="status-badge status-active">
                      {activeUsage}/{key.usage.length}
                    </span>
                  </td>
                  <td>{totalUsage.toLocaleString()}</td>
                  <td>{new Date(key.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleViewUsage(key)}
                        title="Xem usage"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-warning"
                        onClick={() => handleEdit(key)}
                        title="Sửa"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(key.id)}
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {defaultKeys.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Chưa có default key nào
          </div>
        )}
      </div>

      {showModal && (
        <DefaultKeyModal
          key={editingKey?.id || 'new'}
          defaultKey={editingKey}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showUsageModal && selectedKey && (
        <UsageModal
          key={selectedKey.id}
          data={selectedKey}
          onClose={() => setShowUsageModal(false)}
        />
      )}
    </div>
  );
};

export default DefaultKeys; 