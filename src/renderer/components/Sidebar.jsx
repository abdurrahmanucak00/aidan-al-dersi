import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '@/store/useStore';
import { useTranslation } from '@/i18n';
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, courses } = useStore();
  const { t } = useTranslation();

  const navItems = [
    { label: t('dashboard'), icon: LayoutDashboard, path: '/' },
    { label: t('add_course'), icon: PlusCircle, path: '/add-course' },
    { label: t('settings'), icon: Settings, path: '/settings' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface-900 border-r border-surface-800 transition-all duration-300 flex flex-col z-20 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-800 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-primary-950/50">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <span className="text-base font-extrabold text-white tracking-tight truncate bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
            AI'dan Al Dersi
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1 mb-6 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:bg-surface-800 hover:text-gray-200'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {sidebarOpen && (
          <div className="px-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('courses')}
            </h3>
            <div className="space-y-1">
              {courses?.map((course) => {
                const completed = course.completed_topics ?? course.completedTopics ?? 0;
                const total = course.total_topics ?? course.totalTopics ?? 1;
                const isComplete = total > 0 && completed === total;
                const isStarted = completed > 0;
                
                return (
                  <button
                    key={course.id}
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-800 text-gray-400 hover:text-gray-200 transition-colors text-left"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isComplete
                          ? 'bg-green-500 shadow-sm shadow-green-500/50'
                          : isStarted
                          ? 'bg-amber-500'
                          : 'bg-gray-600'
                      }`}
                    />
                    <span className="truncate text-xs font-medium">{course.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <button
        onClick={toggleSidebar}
        className="p-3.5 border-t border-surface-800 text-gray-400 hover:bg-surface-800 hover:text-gray-200 flex justify-center items-center transition-colors shrink-0"
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );
}
