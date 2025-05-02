import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelopeOpen,
  faLock,
  faEye,
  faEyeLowVision,
} from "@fortawesome/free-solid-svg-icons";

import "../pages/pageCSS/LoginSignup.css";

const LoginSignup = () => {
  const [state, setState] = useState("Login");

  const dataDetails = { username: "", password: "", email: "" };
  const [formData, setFormData] = useState(dataDetails);
  const [showPassword, setShowPassword] = useState(false);

  const changeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const login = async () => {
    try {
      console.log("Login Function Executed", formData);
      let responseData;
      await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((data) => (responseData = data));

      if (responseData.success) {
        localStorage.setItem("auth-token", responseData.token);
        window.location.replace("/");
      } else {
        alert(responseData.error);
        setFormData((prev) => ({ ...prev, password: "" }));
      }
    } catch (error) {
      console.error("Error during signup:", error);
      alert("Something went wrong! Please try again.");
    }
  };

  const signup = async () => {
    try {
      console.log("Sign Up Function Executed", formData);
      let responseData;
      await fetch("http://localhost:4000/signup", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((data) => (responseData = data));

      if (responseData.success) {
        localStorage.setItem("auth-token", responseData.token);
        window.location.replace("/");
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
