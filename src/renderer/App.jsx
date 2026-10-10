import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AddCourse from './pages/AddCourse';
import CourseDetail from './pages/CourseDetail';
import Settings from './pages/Settings';

export default function App() {
  const { fetchCourses, fetchSettings, sidebarOpen } = useStore();

  useEffect(() => {
    fetchCourses();
    fetchSettings();
  }, []);

  return (
    <div className="flex h-screen bg-surface-950 text-white">
      <Sidebar />
      <main className={`flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-course" element={<AddCourse />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
