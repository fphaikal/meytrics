import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from "@heroui/react";
import { HomePage } from './components/HomePage';
import { StatusPage } from './components/StatusPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider placement="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/status/:slug" element={<StatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
