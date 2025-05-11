import React, { useContext, useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelopeOpen,
  faLock,
  faEye,
  faEyeLowVision,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/ConverteContext";
import "./pageCSS/LoginSignup.css"; // Giữ lại file CSS này

const LoginSignup = () => {
  const { onLogin, userData } = useContext(AuthContext);
  const [state, setState] = useState("Login");
  const dataDetails = { username: "", password: "", email: "" };
  const [formData, setFormData] = useState(dataDetails);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const changeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const login = async () => {
    try {
      console.log("Login Function Executed", formData);
      const response = await axios.post(
        "http://localhost:8000/auth/login",
        formData
      ); // Sử dụng axios.post với formData
      console.log("response:", response);
      const responseData = response.data; // Truy cập dữ liệu từ response.data

      console.log("responseData:", responseData);
      if (responseData.success) {
        localStorage.setItem("auth-token", responseData.token);
        localStorage.setItem("username", responseData.username);
        if (onLogin) {
          onLogin(responseData.username);
        }

        navigate("/");
        console.log("Đang nhập thành cmn công");
        alert("Đăng nhập thành công");
      } else {
        alert(responseData.error);
        setFormData((prev) => ({ ...prev, password: "" }));
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("Something went wrong! Please try again.");
    }
  };

  const signup = async () => {
    try {
      console.log("Sign Up Function Executed", formData);
      const response = await axios.post(
        "http://localhost:8000/auth/signup",
        formData
      ); // Sử dụng axios.post
      const responseData = response.data;

      if (responseData.success) {
        localStorage.setItem("auth-token", responseData.token);
        navigate("/");
        alert("Tạo tài khoản thành công");
      } else {
        alert(responseData.error);
      }
    } catch (error) {
      console.error("Error during signup:", error);
      alert("Something went wrong! Please try again.");
    }
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{state}</h1>
        <div className="loginsignup-fields-container">
          {state === "Sign Up" ? (
            <div className="loginsignup-fields">
              <FontAwesomeIcon className="field-icon" icon={faUser} />
              <input
                name="username"
                value={formData.username}
                onChange={changeHandler}
                type="text"
                placeholder="Your Name"
              />
            </div>
          ) : (
            <></>
          )}
          <div className="loginsignup-fields">
            <FontAwesomeIcon className="field-icon" icon={faEnvelopeOpen} />
            <input
              name="email"
              value={formData.email}
              onChange={changeHandler}
              type="email"
              placeholder="Email Adress"
            />
          </div>
          <div className="loginsignup-fields">
            <FontAwesomeIcon className="field-icon" icon={faLock} />
            <input
              name="password"
              value={formData.password}
              onChange={changeHandler}
              type={showPassword ? "text" : "password"}
              placeholder="Your Password"
            />
            <FontAwesomeIcon
              className="show-icon"
              icon={showPassword ? faEyeLowVision : faEye}
              onClick={() => setShowPassword((prev) => !prev)}
            />
          </div>
        </div>
        <button
          onClick={() => {
            state === "Login" ? login() : signup();
          }}
        >
          Continue
        </button>
        {state === "Sign Up" ? (
          <p className="loginsignup-login">
            Already have an account?{" "}
            <span
              className="click-span"
              onClick={() => {
                setState("Login");
              }}
            >
              Login here
            </span>
          </p>
        ) : (
          <p className="loginsignup-login">
            Create an account?{" "}
            <span
              className="click-span"
              onClick={() => {
                setState("Sign Up");
              }}
            >
              Click here
            </span>
          </p>
        )}

        <div className="loginsignup-agree">
          <input type="checkbox" name="" id="" />
          <p>By continuing, i agree the terms of use & privacy policy.</p>
        </div>

        <p className="loginsignup-login">
          Fast Signup With Your Favourite Social Profile
        </p>
        <div className="loginsignup-social-icon">
          <div className="loginsignup-icons-container">
            {/* <img src={facebook_icon } alt="" /> */}
          </div>
          <div className="loginsignup-icons-container">
            {/* <img src={google_icon } alt="" /> */}
          </div>
          <div className="loginsignup-icons-container">
            {/* <img src={x_icon } alt="" /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
