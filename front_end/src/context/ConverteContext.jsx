import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) setIsLoggedIn(true);
  }, []);

  const onLogin = () => setIsLoggedIn(true);
  const onLgout = () => {
    localStorage.removeItem("auth-token");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, onLogin, onLgout }}>
      {children}
    </AuthContext.Provider>
  );
};
