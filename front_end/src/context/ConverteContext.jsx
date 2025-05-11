// context/ConverteContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  const [menu, setMenu] = useState("home");
  const [userData, setUserData] = useState({
    username: "User",
    password: "",
    avatar: "https://via.placeholder.com/40", // URL avatar mẫu
    backgroundImg: "https://via.placeholder.com/40",
    birthDay: "",
    libraryStories: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    const storedUsername = localStorage.getItem("username");

    if (token) {
      setIsLoggedIn(true);
      if (storedUsername) {
        setUsername(storedUsername);
        fetchUserData(storedUsername, token);
      }
    }
  }, []);

  const fetchUserData = async (username, token) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/user/${username}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserData(response.data);
    } catch (err) {
      console.error("Lỗi lấy user data:", err);
    }
  };

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
    <AuthContext.Provider
      value={{
        isLoggedIn,
        username,
        setUsername,
        onLogin,
        onLogout,
        setMenu,
        menu,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
