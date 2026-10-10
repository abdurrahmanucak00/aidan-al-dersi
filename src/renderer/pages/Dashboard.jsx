import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import { useTranslation } from '../i18n';

export default function Dashboard() {
  const { courses, fetchCourses, deleteCourse } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [courseToDelete, setCourseToDelete] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (id) => {
    await deleteCourse(id);
    await fetchCourses();
    setCourseToDelete(null);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-950">
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard')}</h1>
          <p className="text-sm text-gray-400 mt-1">Öğrenme yolculuğun ve kayıtlı derslerin</p>
        </div>
        {courses.length > 0 && (
          <button
            onClick={() => navigate('/add-course')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-900/20"
          >
            <Plus size={20} />
            {t('add_course')}
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[65vh] text-center max-w-md mx-auto">
          <div className="bg-surface-800 p-8 rounded-full mb-6 border border-surface-700">
            <BookOpen size={64} className="text-primary-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">{t('no_courses')}</h2>
          <p className="text-gray-400 mb-8">{t('no_courses_desc')}</p>
          <button
            onClick={() => navigate('/add-course')}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors text-lg shadow-lg shadow-primary-900/20"
          >
            <Plus size={24} />
            {t('add_course')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {courses.map((course) => {
            const completedTopics = course.completed_topics ?? course.completedTopics ?? 0;
            const totalTopics = course.total_topics ?? course.totalTopics ?? 0;
            const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

            return (
              <div
                key={course.id}
                className="bg-surface-800/80 rounded-xl p-6 border border-surface-700 hover:border-primary-500/50 hover:shadow-xl transition-all cursor-pointer relative group flex flex-col justify-between"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-white line-clamp-2 pr-6">{course.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(course.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Dersi Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {course.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-4">{course.description}</p>
                  )}
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-surface-700/50">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{completedTopics}/{totalTopics} {t('topics_completed')}</span>
                    <span className="font-semibold text-primary-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-800 rounded-xl max-w-md w-full p-6 border border-surface-700 shadow-2xl">
            <h3 className="text-xl font-semibold mb-3 text-white">{t('delete_course')}</h3>
            <p className="text-gray-300 mb-6 text-sm">{t('delete_confirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleDelete(courseToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
