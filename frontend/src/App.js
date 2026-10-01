import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import UpdatePage from "./pages/UpdatePage";
import RevokePage from "./pages/RevokePage";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"        element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/update"  element={<UpdatePage />} />
            <Route path="/revoke"  element={<RevokePage />} />
            <Route path="*"        element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
