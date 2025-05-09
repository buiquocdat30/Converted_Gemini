import React from "react";

import Home from "../src/pages/Home";
import Translate from "../src/pages/Translate";
import Converte from "../src/pages/Converte";
import LoginSignup from "../src/pages/LoginSignup";
import Dictionary from "../src/pages/Dictionary";
import Users from "../src/pages/Users";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/ConverteContext";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import "./css/App.css";

const App = () => {
  return (
    <div>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/converte" element={<Converte />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/user" element={<Users />} />
            <Route path="/login" element={<LoginSignup />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
};

export default App;
