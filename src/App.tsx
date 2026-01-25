import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider, Spinner } from "@heroui/react";
import { HomePage } from './components/HomePage';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load heavy components
const StatusPage = lazy(() => import('./components/StatusPage').then(module => ({ default: module.StatusPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const LoginPage = lazy(() => import('./components/LoginPage').then(module => ({ default: module.LoginPage })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Spinner size="lg" color="primary" label="Loading..." />
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider placement="top-center" />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}


export default App;
