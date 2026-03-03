import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './index.css'
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
import RecommendationPage from './app/recommendation/page'
import AdminLoginPage from './app/admin/login/page'
import AdminUserBlockedPage from './app/admin/user/page'
import { clearAuthSession, getAuthSession } from './lib/auth'

function ProtectedAdminRoute({ children }: { children: React.ReactElement }) {
  const session = getAuthSession();

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (session.role !== 'admin') {
    return <Navigate to="/admin/user" replace />;
  }

  return children;
}

// Admin Layout wrapper
function AdminLayout() {
  const navigate = useNavigate();
  const session = getAuthSession();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Temple Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session?.user_name}</span>
            <button
              onClick={() => {
                clearAuthSession();
                navigate('/admin/login', { replace: true });
              }}
              className="px-3 py-1.5 text-sm rounded-md border text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto">
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
        </Routes>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/user" element={<AdminUserBlockedPage />} />
        <Route path="/admin/*" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>} />
        <Route path="/recommend" element={<RecommendationPage />} />
        <Route path="/" element={<RecommendationPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
