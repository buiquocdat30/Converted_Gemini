// context/ConverteContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    const storedUsername = localStorage.getItem("username");

    if (token) {
      setIsLoggedIn(true);
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  const onLogin = (username) => {
    setUsername(username);
    setIsLoggedIn(true);
  };

  const onLogout = () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("username");
    setUsername("");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
};
