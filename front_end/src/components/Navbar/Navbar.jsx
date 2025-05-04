import React, { useContext, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/icon.png";

const Navbar = () => {
  const [menu, setMenu] = useState("home");
  const menuRef = useRef();
  const navigate = useNavigate();
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
          {/* nếu menu là cái đang click thì thêm thẻ hr vô */}
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
        {/* {localStorage.getItem("auth-token") ? (
          <button
            onClick={() => {
              localStorage.removeItem("auth-token");
              window.location.replace("/");
            }}
          >
            Logout
          </button>
        ) : (
          <Link to="/login">
            <button>Login</button>
          </Link>
        )} */}
        <Link to="/login">
          <button>Login</button>
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
