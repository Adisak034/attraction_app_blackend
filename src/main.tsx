import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

// Admin Layout wrapper
function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Temple Admin Dashboard</h1>
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
        </Routes>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
