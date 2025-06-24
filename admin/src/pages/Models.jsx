import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { modelsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ModelModal from '../components/ModelModal';

const Models = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await modelsAPI.getAll();
      setModels(response.data.data);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Lỗi khi tải danh sách models');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingModel(null);
    setShowModal(true);
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa model này?')) {
      return;
    }

    try {
      await modelsAPI.delete(id);
      toast.success('Xóa model thành công');
      fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi xóa model');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingModel(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchModels();
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
          <h2 className="card-title">Quản lý Models</h2>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            Thêm Model
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Provider</th>
              <th>Giới hạn</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id}>
                <td>
                  <div>
                    <strong>{model.label}</strong>
                    <br />
                    <code className="text-sm">{model.value}</code>
                  </div>
                </td>
                <td>{model.provider.name}</td>
                <td>
                  <div className="text-sm">
                    {model.rpm && <div>RPM: {model.rpm}</div>}
                    {model.tpm && <div>TPM: {model.tpm.toLocaleString()}</div>}
                    {model.rpd && <div>RPD: {model.rpd}</div>}
                  </div>
                </td>
                <td>
                  <div className="text-sm text-gray-600">
                    {model.description || 'Không có mô tả'}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-warning"
                      onClick={() => handleEdit(model)}
                      title="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(model.id)}
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {models.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Chưa có model nào
          </div>
        )}
      </div>

      {showModal && (
        <ModelModal
          key={editingModel?.id || 'new'}
          model={editingModel}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Models; 