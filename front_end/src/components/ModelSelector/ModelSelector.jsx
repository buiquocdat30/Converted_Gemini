import React, { useState, useEffect } from 'react';
import { modelService } from '../../services/modelService';
import { useSession } from '../../context/SessionContext';
import './ModelSelector.css';

const ModelSelector = ({ onModelChange, selectedModel, isDarkMode }) => {
    const { selectedModel: sessionSelectedModel, updateSelectedModel } = useSession();
    const [providers, setProviders] = useState([]);
    const [models, setModels] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sử dụng model từ session nếu có, nếu không thì dùng prop
    const currentSelectedModel = sessionSelectedModel || selectedModel;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const providersData = await modelService.getProviders();
                setProviders(providersData);
                
                // Nếu có provider đầu tiên, lấy models của provider đó
                if (providersData.length > 0) {
                    const firstProvider = providersData[0];

                    setSelectedProvider(firstProvider);
                    const modelsData = await modelService.getModelsByProvider(firstProvider.id);

                    setModels(modelsData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleProviderChange = async (providerId) => {
        try {
            setLoading(true);
            const provider = providers.find(p => p.id === providerId);
            setSelectedProvider(provider);
            const modelsData = await modelService.getModelsByProvider(providerId);
            setModels(modelsData);
        } catch (error) {
            console.error('Error fetching models:', error);
            setError('Không thể tải danh sách models. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const handleModelChange = (modelValue) => {
        // Cập nhật cả session và callback
        updateSelectedModel(modelValue);
        if (onModelChange) {
            onModelChange(modelValue);
        }
    };

    if (loading) {
        return <div className="model-selector-loading">Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className="model-selector-error">{error}</div>;
    }

    return (
        <div className={`model-selector ${isDarkMode ? 'dark' : ''}`}>
            <div className="provider-selector">
                <label className="provider-label">🤖 Chọn nhà cung cấp:</label>
                <select 
                    value={selectedProvider?.id || ''} 
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="provider-select"
                >
                    {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="model-list">
                <label className="model-label">📋 Chọn mô hình:</label>
                <div className="model-options">
                    {models.map(model => (
                        <div 
                            key={model.id} 
                            className={`model-option ${currentSelectedModel === model.value ? 'selected' : ''}`}
                            onClick={() => handleModelChange(model.value)}
                        >
                            <div className="model-info">
                                <h4>{model.label}</h4>
                                <p>{model.description}</p>
                            </div>
                            <div className="model-limits">
                                <span>RPM: {model.rpm}</span>
                                <span>TPM: {model.tpm}</span>
                                <span>RPD: {model.rpd}</span>
                            </div>
                            {/* Thông báo chi tiết về giới hạn dịch */}
                            <div className="model-limits model-limits-detail">
                                <span>
                                    ⏳ Thời gian chờ tối thiểu giữa 2 lần dịch: <b>{model.rpm ? (60 / model.rpm).toFixed(2) : 'N/A'}</b> giây
                                </span>
                                <span>
                                    🚀 Số chương có thể dịch trong 1 phút: <b>{model.rpm || 'N/A'}</b> chương
                                </span>
                                <span>
                                    📅 Số chương có thể dịch trong 1 ngày: <b>{model.rpd || 'N/A'}</b> chương
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModelSelector; 