import React, { createContext, useState, useEffect, useContext } from 'react';
import { modelService } from '../services/modelService';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  // Khởi tạo state từ sessionStorage
  const [selectedKeys, setSelectedKeys] = useState(() => {
    const saved = sessionStorage.getItem('selectedKeys');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentKey, setCurrentKey] = useState(() => {
    const saved = sessionStorage.getItem('currentKey');
    return saved || '';
  });

  // Khởi tạo selectedModel: nếu có trong sessionStorage thì lấy, nếu không thì null (sẽ lấy từ BE sau)
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = sessionStorage.getItem('selectedModel');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.value) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  });

  // Khi selectedModel là null, gọi BE lấy model mặc định
  useEffect(() => {
    if (!selectedModel) {
      modelService.getProviders().then(providers => {
        if (Array.isArray(providers) && providers.length > 0 && Array.isArray(providers[0].models) && providers[0].models.length > 0) {
          const defaultModel = providers[0].models[0];
          setSelectedModel(defaultModel);
          sessionStorage.setItem('selectedModel', JSON.stringify(defaultModel));
        }
      }).catch(err => {
        console.error('[SessionContext] Không lấy được model mặc định từ BE:', err);
      });
    }
  }, [selectedModel]);

  // Lưu selectedKeys vào sessionStorage khi thay đổi
  useEffect(() => {
    sessionStorage.setItem('selectedKeys', JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  // Lưu currentKey vào sessionStorage khi thay đổi
  useEffect(() => {
    sessionStorage.setItem('currentKey', currentKey);
  }, [currentKey]);

  // Lưu selectedModel vào sessionStorage khi thay đổi
  useEffect(() => {
    if (selectedModel) {
      sessionStorage.setItem('selectedModel', JSON.stringify(selectedModel));
    } else {
      sessionStorage.removeItem('selectedModel');
    }
  }, [selectedModel]);

  // Reset session khi đóng tab/window
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('selectedKeys');
      sessionStorage.removeItem('currentKey');
      sessionStorage.removeItem('selectedModel');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const updateSelectedKeys = (keys) => {
    setSelectedKeys(keys);
  };

  const updateCurrentKey = (key) => {
    setCurrentKey(key);
  };

  const updateSelectedModel = (model) => {
    setSelectedModel(model);
    console.log('[SessionContext] updateSelectedModel', model);
  };

  const clearSession = () => {
    setSelectedKeys([]);
    setCurrentKey('');
    setSelectedModel(null);
    sessionStorage.removeItem('selectedKeys');
    sessionStorage.removeItem('currentKey');
    sessionStorage.removeItem('selectedModel');
  };

  const value = {
    selectedKeys,
    currentKey,
    selectedModel,
    updateSelectedKeys,
    updateCurrentKey,
    updateSelectedModel,
    clearSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}; 