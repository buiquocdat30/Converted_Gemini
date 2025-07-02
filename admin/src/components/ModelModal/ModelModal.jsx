import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { modelsAPI, providersAPI } from "../../services/api";
import toast from "react-hot-toast";

const ModelModal = ({ model, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    providerId: "",
    value: "",
    label: "",
    description: "",
    rpm: "",
    tpm: "",
    rpd: "",
  });
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProviders();
    if (model) {
      setIsEditing(true);
      setFormData({
        providerId: model.providerId,
        value: model.value,
        label: model.label,
        description: model.description || "",
        rpm: model.rpm || "",
        tpm: model.tpm || "",
        rpd: model.rpd || "",
      });
    }
  }, [model]);

  const fetchProviders = async () => {
    try {
      const response = await providersAPI.getAll();
      setProviders(response.data.data);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Lỗi khi tải danh sách providers");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.providerId || !formData.value || !formData.label) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        rpm: formData.rpm ? parseInt(formData.rpm) : null,
        tpm: formData.tpm ? parseInt(formData.tpm) : null,
        rpd: formData.rpd ? parseInt(formData.rpd) : null,
      };

      if (isEditing) {
        await modelsAPI.update(model.id, submitData);
        toast.success("Cập nhật model thành công");
      } else {
        await modelsAPI.create(submitData);
        toast.success("Tạo model thành công");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving model:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? "Sửa Model" : "Thêm Model"}
          </h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Provider *</label>
            <select
              className="form-control"
              value={formData.providerId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, providerId: e.target.value }))
              }
              required
              disabled={isEditing}
            >
              <option value="">Chọn provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Model Value *</label>
            <input
              type="text"
              className="form-control"
              value={formData.value}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, value: e.target.value }))
              }
              placeholder="Ví dụ: gemini-2.0-flash"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Label *</label>
            <input
              type="text"
              className="form-control"
              value={formData.label}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="Ví dụ: Gemini 2.0 Flash"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Mô tả về model"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">RPM</label>
              <input
                type="number"
                className="form-control"
                value={formData.rpm}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rpm: e.target.value }))
                }
                placeholder="Requests per minute"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">TPM</label>
              <input
                type="number"
                className="form-control"
                value={formData.tpm}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tpm: e.target.value }))
                }
                placeholder="Tokens per minute"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">RPD</label>
              <input
                type="number"
                className="form-control"
                value={formData.rpd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rpd: e.target.value }))
                }
                placeholder="Requests per day"
                min="0"
              />
            </div>
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
              {loading ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelModal;
