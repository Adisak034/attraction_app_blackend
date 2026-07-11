// =============================================================================
// main.tsx
// =============================================================================
// จุดเริ่มต้นหลัก (Entry Point) ของแอปพลิเคชัน React
// รับผิดชอบการตั้งค่า Router, Provider และ Authentication Guard
//
// โครงสร้างหลัก:
//   - BrowserRouter     : ระบบ routing ของแอป
//   - AlertProvider     : Context สำหรับแสดง dialog/alert ทั่วทั้งแอป
//   - AppInitializer    : เชื่อม showAlert function ให้ใช้ได้นอก component
//   - ProtectedAdminRoute : Guard ป้องกันหน้า admin (ใช้ isAuthenticated / isAdmin)
//   - AdminNavbar       : แถบเมนูด้านบนของหน้า Admin (Go to Website, Logout)
//   - AdminRoutes       : รวม Routes ทั้งหมดของระบบ Admin
//   - AdminLayout       : Layout ครอบ admin section
//
// Routes หลัก:
//   /                   → RecommendationPage (หน้าผู้ใช้หลัก)
//   /recommend          → RecommendationPage
//   /admin/*            → AdminLayout (ต้องผ่าน ProtectedAdminRoute)
//   /admin/admin-permission → PermissionDeniedPage (หน้าแจ้งไม่มีสิทธิ์)
//   /login, /admin/login → redirect ไปหน้าหลัก
// =============================================================================

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';

// Admin Pages
import AttrationAdminPage from './app/admin/attractions/page';
import UserAdminPage from './app/admin/users/page';
import ImageAdminPage from './app/admin/images/page';
import RatingAdminPage from './app/admin/ratings/page';
import CategoryAdminPage from './app/admin/category/page';
import ActivityLogsPage from './app/admin/activity-logs/page';
import AdminPage from './app/admin/page';
import RecommendationModelsPage from './app/admin/recommendation-models/page';
import PermissionDeniedPage from './app/admin/admin-permission/page';

// User Pages & Shared Utilities
import RecommendationPage from './app/recommendation/App';
import { clearAuthSession, getAuthSession, isAuthenticated, isAdmin } from './lib/auth';
import { AlertProvider, useAlert } from './components/AlertDialog';
import { setAlertFunction } from './lib/swal';

// =============================================================================
// Guard Component: ProtectedAdminRoute
// =============================================================================

function ProtectedAdminRoute({ children }: { children: React.ReactElement }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/admin/admin-permission" replace />;
  }

  return children;
}

// =============================================================================
// Helper Component: AppInitializer
// =============================================================================

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlert();

  useEffect(() => {
    setAlertFunction(showAlert);
  }, [showAlert]);

  return <>{children}</>;
}

// =============================================================================
// Sub-Component: AdminNavbar
// =============================================================================

interface AdminNavbarProps {
  userName?: string;
  onNavigateHome: () => void;
  onLogout: () => void;
}

function AdminNavbar({ userName, onNavigateHome, onLogout }: AdminNavbarProps) {
  return (
    <nav className="bg-white shadow-sm p-4 mb-6 sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="px-3.5 py-1.5 text-sm rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Website
          </button>

          {userName && <span className="text-sm font-semibold text-gray-600 px-2">{userName}</span>}

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 text-sm rounded-lg border border-red-200 font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// Sub-Component: AdminRoutes
// =============================================================================

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminPage />} />
      <Route path="/attractions" element={<AttrationAdminPage />} />
      <Route path="/users" element={<UserAdminPage />} />
      <Route path="/images" element={<ImageAdminPage />} />
      <Route path="/ratings" element={<RatingAdminPage />} />
      <Route path="/category" element={<CategoryAdminPage />} />
      <Route path="/activity-logs" element={<ActivityLogsPage />} />
      <Route path="/recommendation-models" element={<RecommendationModelsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

// =============================================================================
// Main Layout: AdminLayout
// =============================================================================

function AdminLayout() {
  const navigate = useNavigate();
  const session = getAuthSession();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100 font-outfit">
      <AdminNavbar
        userName={session?.user_name}
        onNavigateHome={() => navigate('/', { replace: true })}
        onLogout={handleLogout}
      />
      <main className="container mx-auto pb-12 px-4">
        <AdminRoutes />
      </main>
    </div>
  );
}

// =============================================================================
// Application Entry Point
// =============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AlertProvider>
      <AppInitializer>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/admin/login" element={<Navigate to="/" replace />} />

            <Route path="/admin/admin-permission" element={<PermissionDeniedPage />} />

            <Route
              path="/admin/*"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            />

            <Route path="/recommend" element={<RecommendationPage />} />
            <Route path="/" element={<RecommendationPage />} />
          </Routes>
        </BrowserRouter>
      </AppInitializer>
    </AlertProvider>
  </React.StrictMode>
);
