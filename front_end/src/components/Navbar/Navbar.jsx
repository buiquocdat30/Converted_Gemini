// Navbar.js
import React, { useState, useRef,  useContext } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Navbar.css";
import logo from "../../assets/icon.png";
import { AuthContext } from "../../context/ConverteContext";

const Navbar = () => {
  const { isLoggedIn, onLogout, username, menu, setMenu } =
    useContext(AuthContext);
  const menuRef = useRef();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // State cho dialog

  const dropdown_toggle = (e) => {
    if (!menuRef.current) return;
    menuRef.current.classList.toggle("nav-menu-visible");
    e.target.classList.toggle("open");
  };

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
      <ul ref={menuRef} className="nav-menu">
        <li onClick={() => setMenu("home")}>
          <Link style={{ textDecoration: "none" }} to="/">
            Guide
          </Link>
          {menu === "home" ? <hr /> : <></>}
        </li>
        <li onClick={() => setMenu("converte")}>
          <Link style={{ textDecoration: "none" }} to="/converte">
            Chuyển đổi
          </Link>
          {menu === "converte" ? <hr /> : <></>}
        </li>
        <li onClick={() => setMenu("dictionary")}>
          <Link style={{ textDecoration: "none" }} to="/dictionary">
            Từ điển
          </Link>
          {menu === "dictionary" ? <hr /> : <></>}
        </li>
        <li onClick={() => setMenu("translate")}>
          <Link style={{ textDecoration: "none" }} to="/translate">
            Dịch
          </Link>
          {menu === "translate" ? <hr /> : <></>}
        </li>
      </ul>
      <div className="nav-login">
        {isLoggedIn ? (
          <div className="user-menu">
            <button onClick={() => setOpen(!open)} className="user-button">
              👤 {username}
            </button>
            {open && (
              <div className="user-dropdown">
                <p className="dropdown-greeting">👋 Xin chào, {username}!</p>
                <Link to="/user">
                  Trang cá nhân
                </Link>
                <Link to="/tu-truyen" className="dropdown-link">
                  📚 Tủ truyện
                </Link>
                <button onClick={onLogout} className="dropdown-logout">
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
        {/* {open && (
          <div>
            {console.log("Navbar: Rendering LoginSignup, open =", open)}
            <LoginSignup onLogin={handleLogin} />
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default Navbar;
