import React, { createContext, useState, useEffect, useContext } from 'react';

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

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = sessionStorage.getItem('selectedModel');
    return saved || '';
  });

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
    sessionStorage.setItem('selectedModel', selectedModel);
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
  };

  const clearSession = () => {
    setSelectedKeys([]);
    setCurrentKey('');
    setSelectedModel('');
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

export default SessionContext; 