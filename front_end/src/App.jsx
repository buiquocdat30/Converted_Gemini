import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/ConverteContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from 'react-hot-toast';
import Home from "../src/pages/Home";
import Translate from "../src/pages/Translate";
import Converte from "../src/pages/Converte";
import LoginSignup from "../src/pages/LoginSignup";
import Dictionary from "../src/pages/Dictionary";
import Users from "../src/pages/Users";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AppRoutes from "./routes/AppRoutes";
import "./css/App.css";

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                },
              },
              error: {
                duration: 3000,
                theme: {
                  primary: '#ff4b4b',
                },
              },
            }}
          />
          <Navbar />
          <AppRoutes />
          <Footer />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
