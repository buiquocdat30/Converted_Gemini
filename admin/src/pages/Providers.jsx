import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { providersAPI } from "../services/api";
import toast from "react-hot-toast";
import ProviderModal from "../components/ProviderModal/ProviderModal";

const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await providersAPI.getAll();
      setProviders(response.data.data);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Lỗi khi tải danh sách providers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProvider(null);
    setShowModal(true);
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa provider này?")) {
      return;
    }

    try {
      await providersAPI.delete(id);
      toast.success("Xóa provider thành công");
      fetchProviders();
    } catch (error) {
      console.error("Error deleting provider:", error);
      toast.error(error.response?.data?.message || "Lỗi khi xóa provider");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProvider(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchProviders();
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
          <h2 className="card-title">Quản lý Providers</h2>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            Thêm Provider
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Provider</th>
              <th>Số Models</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td>
                  <code>{provider.id.substring(0, 8)}...</code>
                </td>
                <td>{provider.name}</td>
                <td>
                  <span className="status-badge status-active">
                    {provider.models.length}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-warning"
                      onClick={() => handleEdit(provider)}
                      title="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(provider.id)}
                      title="Xóa"
                      disabled={provider.models.length > 0}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {providers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Chưa có provider nào
          </div>
        )}
      </div>

      {showModal && (
        <ProviderModal
          key={editingProvider?.id || "new"}
          provider={editingProvider}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Providers;
