import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './index.css'
// import หน้า admin ทั้งหมด
import AttrationAdminPage from './app/admin/attractions/page'
import EditAttractionPage from './app/admin/attractions/edit/[id]/page'
import UserAdminPage from './app/admin/users/page'
import EditUserPage from './app/admin/users/edit/[id]/page'
import ImageAdminPage from './app/admin/images/page'
import EditImagePage from './app/admin/images/edit/[id]/page'
import RatingAdminPage from './app/admin/ratings/page'
import CategoryAdminPage from './app/admin/category/page'
import ActivityLogsPage from './app/admin/activity-logs/page'
import AdminPage from './app/admin/page'
import RecommendationModelsPage from './app/admin/recommendation-models/page'
// import หน้าผู้ใช้และ utilities
import RecommendationPage from './app/recommendation/page'
import PermissionDeniedPage from './app/admin/admin-permission/page'
import { clearAuthSession, getAuthSession } from './lib/auth'
import { AlertProvider, useAlert } from './components/AlertDialog'
import { setAlertFunction } from './lib/swal'

// Guard สำหรับป้องกันหน้า admin - ถ้าไม่ได้ login จะ redirect ไปหน้าหลัก
// ถ้า login แล้วแต่ role ไม่ใช่ admin จะ redirect ไปหน้า permission-denied
function ProtectedAdminRoute({ children }: { children: React.ReactElement }) {
  const session = getAuthSession();

  if (!session) {
    return <Navigate to="/" replace />; // ไม่ได้ login
  }

  if (session.role !== 'admin') {
    return <Navigate to="/admin/admin-permission" replace />; // ไม่มีสิทธิ์
  }

  return children;
}

// Component สำหรับ initialize ระบบ alert ก่อน render หน้าอื่น
// เชื่อม showAlert function จาก AlertProvider ไปยัง swal.ts เพื่อใช้นอก component
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlert();

  useEffect(() => {
    setAlertFunction(showAlert);
  }, [showAlert]);

  return <>{children}</>;
}

// Layout ของ admin section - มี navbar ด้านบนพร้อมปุ่ม logout
// ครอบทุก route ที่ขึ้นต้นด้วย /admin/*
function AdminLayout() {
  const navigate = useNavigate();
  const session = getAuthSession();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar ด้านบน */}
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-3 py-1.5 text-sm rounded-md border text-gray-700 hover:bg-gray-50"
            >
              Go to Website
            </button>
            <span className="text-sm text-gray-500">{session?.user_name}</span>
            <button
              onClick={() => {
                clearAuthSession();       // ลบ session
                navigate('/', { replace: true }); // กลับหน้าหลัก
              }}
              className="px-3 py-1.5 text-sm rounded-md border text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto">
        {/* Routes ของ admin ทั้งหมด */}
        <Routes>
          <Route path="/" element={<AdminPage />} />
          <Route path="/attractions" element={<AttrationAdminPage />} />
          <Route path="/attractions/edit/:id" element={<EditAttractionPage />} />
          <Route path="/users" element={<UserAdminPage />} />
          <Route path="/users/edit/:id" element={<EditUserPage />} />
          <Route path="/images" element={<ImageAdminPage />} />
          <Route path="/images/edit/:id" element={<EditImagePage />} />
          <Route path="/ratings" element={<RatingAdminPage />} />
          <Route path="/category" element={<CategoryAdminPage />} />
          <Route path="/activity-logs" element={<ActivityLogsPage />} />
          <Route path="/recommendation-models" element={<RecommendationModelsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// จุดเริ่มต้นของแอปพลิเคชัน - เชื่อม router และ provider ทั้งหมด
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* AlertProvider ครอบทั้งแอปเพื่อให้ทุก component เรียก alert ได้ */}
    <AlertProvider>
      {/* AppInitializer เชื่อม alert function ก่อน render */}
      <AppInitializer>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* redirect เส้นทาง login เก่าไปหน้าหลัก */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/admin/login" element={<Navigate to="/" replace />} />
            {/* หน้าแจ้งเตือนไม่มีสิทธิ์ (ไม่ต้อง protect เพราะเป็นหน้า error) */}
          <Route path="/admin/admin-permission" element={<PermissionDeniedPage />} />
            {/* ทุก route ภายใต้ /admin/* ต้องผ่าน ProtectedAdminRoute */}
            <Route path="/admin/*" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>} />
            {/* หน้าผู้ใช้: / และ /recommend แสดง RecommendationPage */}
            <Route path="/recommend" element={<RecommendationPage />} />
            <Route path="/" element={<RecommendationPage />} />
          </Routes>
        </BrowserRouter>
      </AppInitializer>
    </AlertProvider>
  </React.StrictMode>,
)
