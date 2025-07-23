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

    // Thêm state local cho model đang chọn
    const [selectedModelValue, setSelectedModelValue] = useState(sessionSelectedModel || selectedModel);

    // Đồng bộ lại khi context hoặc prop thay đổi
    useEffect(() => {
        setSelectedModelValue(sessionSelectedModel || selectedModel);
    }, [sessionSelectedModel, selectedModel]);

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

    const handleModelChange = (modelObj) => {
        setSelectedModelValue(modelObj.value);
        updateSelectedModel(modelObj); // truyền object model
        if (onModelChange) onModelChange(modelObj, models);
        console.log('[ModelSelector] Đã chọn model:', modelObj);
        console.log('[ModelSelector] Gửi ra ngoài:', modelObj, models);
    };

    if (loading) {
        return <div className="MS-model-selector-loading">Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className="MS-model-selector-error">{error}</div>;
    }

    return (
        <div className={`MS-model-selector ${isDarkMode ? 'MS-dark' : ''}`}>
            <div className="MS-provider-selector">
                <label className="MS-provider-label">🤖 Chọn nhà cung cấp:</label>
                <select 
                    value={selectedProvider?.id || ''} 
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="MS-provider-select"
                >
                    {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="MS-model-list">
                <label className="MS-model-label">📋 Chọn mô hình:</label>
                <div className="MS-model-options">
                    {models.map(model => (
                        <div 
                            key={model.id} 
                            className={`MS-model-option ${selectedModelValue === model.value ? 'MS-selected' : ''}`}
                            onClick={() => handleModelChange(model)}
                        >
                            <div className="MS-model-info">
                                <h4>{model.label}</h4>
                                <p>{model.description}</p>
                            </div>
                            <div className="MS-model-limits">
                                <span>RPM: {model.rpm}</span>
                                <span>TPM: {model.tpm}</span>
                                <span>RPD: {model.rpd}</span>
                            </div>
                            {/* Thông báo chi tiết về giới hạn dịch */}
                            <div className="MS-model-limits MS-model-limits-detail">
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