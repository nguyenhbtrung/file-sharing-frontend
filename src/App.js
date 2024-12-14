import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Auth/Login";
import MainPage from "./components/Main/MainPage";
import Register from "./components/Auth/Register";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem("token")); // Trạng thái xác thực

  return (
    <Router>
      <Routes>
        {/* Trang Đăng nhập */}
        <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="/register" element={<Register />} />
        {/* Trang chính */}
        <Route
          path="/"
          element={isAuthenticated ? <MainPage /> : <Navigate to="/login" />}
        />

        {/* Điều hướng cho đường dẫn không hợp lệ */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;
