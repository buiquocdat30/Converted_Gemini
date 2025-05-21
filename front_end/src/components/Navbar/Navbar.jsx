// Navbar.js
import React, { useState, useRef, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/ConverteContext";
import "./Navbar.css";
import logo from "../../assets/icon.png";

const Navbar = () => {
  const { isLoggedIn, onLogout, userData, menu, setMenu, loading } =
    useContext(AuthContext);
  const menuRef = useRef();
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // State cho dialog
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (menuRef.current) {
      menuRef.current.classList.toggle("nav-menu-visible");
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate("/");
    document.body.style.backgroundImage = "";
    console.log("User logged out");
    toast.success("Đăng xuất thành công!");
  };
  // Hàm bắt đầu timeout 1s để ẩn
  const startCloseTimer = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 1900);
  };

  // Hàm huỷ timeout nếu người dùng tương tác
  const cancelCloseTimer = () => {
    clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current); // cleanup khi component unmount
  }, []);

  return (
    <div className="navbar">
      <div
        className="nav-logo"
        onClick={() => {
          setMenu("home");
          navigate("/");
        }}
      >
        <img src={logo} alt="" />
      </div>

      <button
        className={`mobile-menu-button ${isMobileMenuOpen ? "open" : ""}`}
        onClick={toggleMobileMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <ul ref={menuRef} className="nav-menu">
        <li
          onClick={() => {
            setMenu("home");
            setIsMobileMenuOpen(false);
          }}
        >
          <Link style={{ textDecoration: "none" }} to="/">
            Guide
          </Link>
          {menu === "home" ? <hr /> : <></>}
        </li>
        <li
          onClick={() => {
            setMenu("converte");
            setIsMobileMenuOpen(false);
          }}
        >
          <Link style={{ textDecoration: "none" }} to="/converte">
            Chuyển đổi
          </Link>
          {menu === "converte" ? <hr /> : <></>}
        </li>
        <li
          onClick={() => {
            setMenu("dictionary");
            setIsMobileMenuOpen(false);
          }}
        >
          <Link style={{ textDecoration: "none" }} to="/dictionary">
            Từ điển
          </Link>
          {menu === "dictionary" ? <hr /> : <></>}
        </li>
        <li
          onClick={() => {
            setMenu("translate");
            setIsMobileMenuOpen(false);
          }}
        >
          <Link style={{ textDecoration: "none" }} to="/translate">
            Dịch
          </Link>
          {menu === "translate" ? <hr /> : <></>}
        </li>

        <div className="nav-login">
          {isLoggedIn ? (
            <div className="user-menu">
              <button
                onClick={() => setOpen(!open)}
                onMouseEnter={cancelCloseTimer}
                onMouseLeave={startCloseTimer}
                className="user-button"
              >
                {loading ? (
                  "Loading..."
                ) : (
                  <div className="user-avatar-container">
                    <img
                      src={
                        userData.avatar
                          ? `http://localhost:8000/data/upload/avatar/${userData.avatar}`
                          : "https://www.w3schools.com/howto/img_avatar.png"
                      }
                      alt="User Avatar"
                      className="user-avatar"
                    />
                  </div>
                )}
              </button>
              {!loading && (
                <div className={`user-dropdown ${open ? "show" : "hide"}`}>
                  <p className="dropdown-greeting">
                    👋 Xin chào, {userData.username}!
                  </p>
                  <Link to="/user" className="dropdown-link">
                    👤 Trang cá nhân
                  </Link>
                  <Link to="/tu-truyen" className="dropdown-link">
                    📚 Tủ truyện
                  </Link>
                  <button onClick={handleLogout} className="dropdown-logout">
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <button className="login-button">🔐 Đăng nhập</button>
            </Link>
          )}
        </div>
      </ul>
    </div>
  );
};

export default Navbar;
