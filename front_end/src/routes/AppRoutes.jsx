import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Translate from "../pages/Translate";
import Converte from "../pages/Converte";
import LoginSignup from "../pages/LoginSignup";
import GlossaryManager from "../pages/GlossaryManager";
import Users from "../pages/Users";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/translate" element={<Translate />} />
      <Route path="/converte" element={<Converte />} />
      <Route path="/login" element={<LoginSignup />} />
      <Route path="/dictionary" element={<GlossaryManager />} />
      <Route path="/user" element={<Users />} />
    </Routes>
  );
};

export default AppRoutes; 