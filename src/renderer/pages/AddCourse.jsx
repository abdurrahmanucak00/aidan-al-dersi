import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import useStore from '../store/useStore';
import { useTranslation } from '../i18n';

export default function AddCourse() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: input, 1-6: iterations, 7: roadmap
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    settings: { language },
    promptIterations,
    addPromptIteration,
    clearPromptIterations,
    fetchCourses,
  } = useStore();

  useEffect(() => {
    // Setup listener for prompt iterations
    if (!window.api?.onPromptIteration) return;
    
    const removeListener = window.api.onPromptIteration((iteration) => {
      addPromptIteration(iteration);
      setCurrentStep(prev => (prev < 4 ? prev + 1 : prev));
    });

    return () => removeListener();
  }, [addPromptIteration]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || isGenerating) return;

    try {
      setErrorMessage('');
      setIsGenerating(true);
      setCurrentStep(1); // Start prompt generation
      clearPromptIterations();

      // 1. Generate Prompt (3 iterations)
      const promptResult = await window.api.generatePrompt({ title, description, language });
      if (!promptResult.success) throw new Error(promptResult.error);
      
      const finalPrompt = promptResult.data;
      setCurrentStep(5); // Move to roadmap generation

      // 2. Generate Roadmap
      const roadmapResult = await window.api.generateRoadmap({ title, description, language });
      if (!roadmapResult.success) throw new Error(roadmapResult.error);
      
      const roadmap = roadmapResult.data;

      // 3. Save course and topics atomically after both are successfully generated!
      const courseResult = await window.api.createCourse({ title, description, language });
      if (!courseResult.success) throw new Error(courseResult.error);
      const courseId = courseResult.data.id;

      await window.api.updateCourse(courseId, { system_prompt: finalPrompt });
      await window.api.saveTopics(courseId, roadmap.phases);

      // 4. Refresh global store courses
      await fetchCourses();

      // 5. Navigate to course detail
      navigate(`/course/${courseId}`);

    } catch (error) {
      console.error("Error creating course:", error);
      setErrorMessage(error.message || 'Ders oluşturulurken bir hata meydana geldi.');
      setIsGenerating(false);
      setCurrentStep(0);
    }
  };

  const getStepStatus = (stepIndex) => {
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-950">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            disabled={isGenerating}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('add_course')}</h1>
            <p className="text-sm text-gray-400 mt-1">Öğrenmek istediğin konuyu ve amacını yaz, yapay zeka sana özel müfredat hazırlasın</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-1">Hata Oluştu</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6 bg-surface-800/90 p-8 rounded-xl border border-surface-700 shadow-xl">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('course_title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('course_title_placeholder')}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors placeholder-gray-500"
              disabled={isGenerating}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('course_description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('course_description_placeholder')}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 min-h-[140px] text-white focus:outline-none focus:border-primary-500 transition-colors resize-y placeholder-gray-500"
              disabled={isGenerating}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating || !title.trim() || !description.trim()}
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg mt-8 shadow-lg shadow-primary-900/30"
          >
            {isGenerating ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('create_course')
            )}
          </button>
        </form>
      </div>

      {/* Generation Progress Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-surface-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-surface-800 rounded-2xl max-w-md w-full p-8 border border-surface-700 shadow-2xl flex flex-col gap-6">
            <h2 className="text-xl font-bold text-center text-white">
              {currentStep < 5 ? t('generating_prompt') : t('generating_roadmap')}
            </h2>
            
            <div className="space-y-3.5">
              {/* Step 1-4: Prompt Iterations (1 initial + 3 refinement) */}
              {[...Array(4)].map((_, i) => {
                const stepIdx = i + 1;
                const status = getStepStatus(stepIdx);
                const isInitial = i === 0;
                
                // Show dynamic wait label if provided via IPC
                let label = isInitial ? 'İlk prompt taslağı' : `Optimizasyon ${i}/3`;
                const currentIterationData = promptIterations[promptIterations.length - 1];
                if (status === 'current' && currentIterationData?.label) {
                  label = currentIterationData.label;
                }

                return (
                  <div key={i} className={`flex items-center gap-4 ${status === 'pending' ? 'opacity-40' : ''}`}>
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {status === 'completed' ? (
                        <CheckCircle2 className="text-green-400 w-6 h-6" />
                      ) : status === 'current' ? (
                        <Loader2 className="animate-spin text-primary-400 w-6 h-6" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-surface-600" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${status === 'current' ? 'text-primary-300 font-semibold' : 'text-gray-300'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
              
              {/* Step 5: Roadmap */}
              <div className={`flex items-center gap-4 ${getStepStatus(5) === 'pending' ? 'opacity-40' : ''}`}>
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {getStepStatus(5) === 'completed' ? (
                    <CheckCircle2 className="text-green-400 w-6 h-6" />
                  ) : getStepStatus(5) === 'current' ? (
                    <Loader2 className="animate-spin text-primary-400 w-6 h-6" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-surface-600" />
                  )}
                </div>
                <span className={`text-sm font-medium ${getStepStatus(5) === 'current' ? 'text-primary-300 font-semibold' : 'text-gray-300'}`}>
                  {promptIterations.find(p => p.iteration === 3 && p.label?.includes('Müfredat'))?.label || t('generating_roadmap')}
                </span>
              </div>
            </div>

            {/* Prompt Peek Section */}
            {promptIterations.length > 0 && currentStep < 7 && (
              <div className="mt-2 border-t border-surface-700 pt-4">
                <button 
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-200 transition-colors py-1"
                >
                  <span>Güncel Prompt Çıktısını İncele</span>
                  {isPromptExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isPromptExpanded && (
                  <div className="mt-2 p-3 bg-surface-900 rounded-lg max-h-36 overflow-y-auto text-xs text-gray-300 whitespace-pre-wrap font-mono border border-surface-700">
                    {promptIterations[promptIterations.length - 1]?.prompt || promptIterations[promptIterations.length - 1]?.content || 'Hazırlanıyor...'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
