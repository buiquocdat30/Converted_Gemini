import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { defaultKeysAPI, modelsAPI } from "../../services/api";
import toast from "react-hot-toast";
import "./DefaultKeyModal.css";

const DefaultKeyModal = ({ defaultKey, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    key: "",
    label: "",
    modelValues: [],
  });
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchModels();
    if (defaultKey) {
      setIsEditing(true);
      setFormData({
        key: defaultKey.key,
        label: defaultKey.label || "",
        modelValues: defaultKey.usage.map((u) => u.model.value),
      });
    }
  }, [defaultKey]);

  const fetchModels = async () => {
    try {
      const response = await modelsAPI.getAll();
      setModels(response.data.data);
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Lỗi khi tải danh sách models");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.key.trim()) {
      toast.error("Vui lòng nhập API key");
      return;
    }

    if (formData.modelValues.length === 0) {
      toast.error("Vui lòng chọn ít nhất một model");
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await defaultKeysAPI.update(defaultKey.id, formData);
        toast.success("Cập nhật default key thành công");
      } else {
        await defaultKeysAPI.create(formData);
        toast.success("Tạo default key thành công");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving default key:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu default key");
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (modelValue, checked) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        modelValues: [...prev.modelValues, modelValue],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        modelValues: prev.modelValues.filter((v) => v !== modelValue),
      }));
    }
  };

  const groupedModels = models.reduce((acc, model) => {
    const providerName = model.provider.name;
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? "Sửa Default Key" : "Thêm Default Key"}
          </h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">API Key *</label>
            <input
              type="text"
              className="form-control"
              value={formData.key}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, key: e.target.value }))
              }
              placeholder="Nhập API key"
              disabled={isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Label</label>
            <input
              type="text"
              className="form-control"
              value={formData.label}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="Nhãn cho key (tùy chọn)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Models *</label>
            <div className="model-selection">
              {Object.entries(groupedModels).map(
                ([providerName, providerModels]) => (
                  <div key={providerName} className="provider-group">
                    <h4 className="provider-name">{providerName}</h4>
                    <div className="model-list">
                      {providerModels.map((model) => (
                        <label key={model.id} className="model-checkbox">
                          <input
                            type="checkbox"
                            checked={formData.modelValues.includes(model.value)}
                            onChange={(e) =>
                              handleModelChange(model.value, e.target.checked)
                            }
                          />
                          <span className="model-label">{model.label}</span>
                          <span className="model-value">({model.value})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              )}
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

export default DefaultKeyModal;
