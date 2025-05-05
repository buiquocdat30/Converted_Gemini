// Navbar.js
import React, { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/icon.png";
import { AuthContext } from "../../context/ConverteContext"
import LoginSignup from "../../pages/LoginSignup"; // Import LoginSignup
//import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog" // Import shadcn dialog

const Navbar = () => {
  const [menu, setMenu] = useState("home");
  const { isLoggedIn, onLgout } = useContext(AuthContext);
  const menuRef = useRef();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // State cho dialog

  const dropdown_toggle = (e) => {
    if (!menuRef.current) return;
    menuRef.current.classList.toggle("nav-menu-visible");
    e.target.classList.toggle("open");
  };

  // Hàm xử lý đăng nhập, được gọi từ LoginSignup
  const handleLogin = () => {
    // setIsLoggedIn(true);
    setOpen(false); // Đóng dialog sau khi đăng nhập
  };

  // Kiểm tra token khi component mount để duy trì trạng thái đăng nhập
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      // setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    // setIsLoggedIn(false);
    navigate("/");
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
        <li onClick={() => setMenu("translate")}>
          <Link style={{ textDecoration: "none" }} to="/translate">
            Dịch
          </Link>
          {menu === "translate" ? <hr /> : <></>}
        </li>
      </ul>
      <div className="nav-login-cart">
        {isLoggedIn ? (
          <button onClick={onLgout}>Logout</button>
        ) : (
          <Link to="/login">
            <button>Login</button>
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
