import React, { useState, useEffect } from 'react';
import { modelService } from '../../services/modelService';
import './ModelSelector.css';

const ModelSelector = ({ onModelChange, selectedModel, isDarkMode }) => {
    const [providers, setProviders] = useState([]);
    const [models, setModels] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) {
        return <div className="model-selector-loading">Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className="model-selector-error">{error}</div>;
    }

    return (
        <div className={`model-selector ${isDarkMode ? 'dark' : ''}`}>
            <div className="provider-selector">
                <label className="provider-label">🤖 Chọn Provider:</label>
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
                <label className="model-label">📋 Chọn Model:</label>
                <div className="model-options">
                    {models.map(model => (
                        <div 
                            key={model.id} 
                            className={`model-option ${selectedModel === model.value ? 'selected' : ''}`}
                            onClick={() => onModelChange(model.value)}
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModelSelector; 