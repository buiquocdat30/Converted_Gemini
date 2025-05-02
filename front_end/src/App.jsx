import React from "react";

import Home from "../src/pages/Home";
import Translate from "../src/pages/Translate";
import Converte from "../src/pages/Converte";
import LoginSignup from "../src/pages/LoginSignup";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import home_bg from "../src/assets/home-bg-2.jpg";
import "./css/App.css";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/translate" element={<Translate />} />
          <Route path="/converte" element={<Converte />} />
          <Route path="/login" element={<LoginSignup />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  );
};

export default App;
