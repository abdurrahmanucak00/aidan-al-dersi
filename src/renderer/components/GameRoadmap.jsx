import React, { useState } from 'react';
import { Lock, CheckCircle2, PlayCircle, Sparkles, X, ArrowRight } from 'lucide-react';

/**
 * Clean up phase title (removes "Faz 1:", "Phase 1 -", etc.)
 */
export function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/^Faz\s*\d+\s*[:\-–]\s*/i, '')
    .replace(/^Phase\s*\d+\s*[:\-–]\s*/i, '')
    .trim();
}

export default function GameRoadmap({ phases, activeTopic, onSelectTopic }) {
  const [selectedPhaseForModal, setSelectedPhaseForModal] = useState(null);

  // Flatten all subtopics to calculate linear progression lock
  const flatSubtopics = [];
  phases?.forEach((phase, phaseIdx) => {
    const subtopics = phase.subtopics || phase.topics || [];
    subtopics.forEach((st, stIdx) => {
      flatSubtopics.push({
        ...st,
        phaseIndex: phaseIdx,
        subtopicIndex: stIdx,
        phaseTitle: cleanTitle(phase.title),
      });
    });
  });

  // Calculate unlocked status for each subtopic
  // Rule: Topic 0 is always unlocked. Topic N is unlocked only if Topic N-1 is 'completed'.
  let firstIncompleteFound = false;
  const topicLockMap = new Map();

  flatSubtopics.forEach((st, idx) => {
    const isCompleted = st.status === 'completed';
    let isUnlocked = false;

    if (idx === 0) {
      isUnlocked = true;
    } else {
      const prevTopic = flatSubtopics[idx - 1];
      isUnlocked = prevTopic.status === 'completed';
    }

    const isCurrent = !isCompleted && isUnlocked && !firstIncompleteFound;
    if (isCurrent) {
      firstIncompleteFound = true;
    }

    topicLockMap.set(st.dbId || st.id, {
      isCompleted,
      isUnlocked,
      isCurrent,
    });
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-surface-950 bg-dot-grid">
      <div className="relative flex flex-col items-center py-12 px-6 min-h-full">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header info */}
      <div className="mb-10 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-950/80 border border-primary-800/60 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Ders Haritası
        </div>
        <h2 className="text-xl font-bold text-white">Adım Adım İlerle ve Kilitleri Aç</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">Tüm müfredatı inceleyebilir, bölümleri tamamladıkça ders içeriklerine sırayla erişebilirsin.</p>
      </div>

      {/* Node Tree Container */}
      <div className="relative flex flex-col items-center gap-14 max-w-lg w-full z-10">
        {phases?.map((phase, phaseIdx) => {
          const subtopics = phase.subtopics || phase.topics || [];
          const phaseTitle = cleanTitle(phase.title);
          
          // Phase status
          const allCompleted = subtopics.length > 0 && subtopics.every((st) => topicLockMap.get(st.dbId || st.id)?.isCompleted);
          const hasUnlocked = subtopics.some((st) => topicLockMap.get(st.dbId || st.id)?.isUnlocked);
          const hasCurrent = subtopics.some((st) => topicLockMap.get(st.dbId || st.id)?.isCurrent);
          const isLocked = !hasUnlocked;

          const completedCount = subtopics.filter((st) => topicLockMap.get(st.dbId || st.id)?.isCompleted).length;
          const totalCount = subtopics.length;
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return (
            <div key={phase.title || phaseIdx} className="relative flex flex-col items-center w-full">
              {/* Connecting line to next node */}
              {phaseIdx < phases.length - 1 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-14 -z-10">
                  <div 
                    className={`w-full h-full rounded-full transition-colors duration-500 ${
                      allCompleted 
                        ? 'bg-gradient-to-b from-green-500 to-green-600 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                        : hasUnlocked 
                        ? 'bg-gradient-to-b from-primary-500 to-surface-700' 
                        : 'bg-surface-800'
                    }`} 
                  />
                </div>
              )}

              {/* Node Card / Circular Bubble */}
              <div
                onClick={() => {
                  // Allow clicking any phase to view its curriculum/subtopics
                  setSelectedPhaseForModal({ phase, phaseTitle, subtopics, isLocked });
                }}
                className={`group relative flex flex-col items-center transition-all duration-300 cursor-pointer hover:scale-105`}
              >
                {/* Outer glowing ring for active node */}
                {hasCurrent && (
                  <div className="absolute -inset-2 bg-primary-500/30 rounded-full blur-md animate-pulse" />
                )}

                {/* Circular Main Button */}
                <div
                  className={`relative w-52 sm:w-60 px-5 py-4 rounded-full border-2 flex items-center justify-between shadow-xl transition-all ${
                    allCompleted
                      ? 'bg-gradient-to-r from-green-950/90 to-surface-900 border-green-500 text-green-300 shadow-green-950/50'
                      : hasCurrent
                      ? 'bg-gradient-to-r from-primary-950/90 to-surface-900 border-primary-500 text-white shadow-primary-950/80 ring-2 ring-primary-500/40'
                      : isLocked
                      ? 'bg-surface-900/95 border-surface-700/80 text-gray-300 hover:border-surface-600 hover:bg-surface-850'
                      : 'bg-surface-900/90 border-surface-700 text-gray-300 hover:border-surface-600'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                        allCompleted
                          ? 'bg-green-500 text-black shadow-md shadow-green-500/40'
                          : hasCurrent
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/50'
                          : isLocked
                          ? 'bg-surface-800 text-amber-400/80 border border-surface-700'
                          : 'bg-surface-700 text-gray-300'
                      }`}
                    >
                      {allCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <PlayCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="text-left overflow-hidden">
                      <div className="text-xs font-bold truncate text-gray-200">{phaseTitle}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {isLocked ? `Kilitli (${totalCount} Alt Konu)` : `${completedCount}/${totalCount} Tamamlandı`}
                      </div>
                    </div>
                  </div>

                  {/* Progress Ring / Percentage */}
                  <div className="text-xs font-semibold shrink-0 text-gray-400">
                    {progressPercent}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtopics Modal for selected Phase */}
      {selectedPhaseForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div>
                <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Bölüm Alt Başlıkları</div>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedPhaseForModal.phaseTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedPhaseForModal(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Subtopics List with Lock Status */}
            <div className="py-4 space-y-2.5 overflow-y-auto flex-1 pr-1">
              {selectedPhaseForModal.subtopics.map((subtopic, sIdx) => {
                const lockInfo = topicLockMap.get(subtopic.dbId || subtopic.id) || {};
                const { isCompleted, isUnlocked, isCurrent } = lockInfo;
                const isSelectedActive = (activeTopic?.dbId || activeTopic?.id) === (subtopic.dbId || subtopic.id);

                return (
                  <div
                    key={subtopic.dbId || subtopic.id || sIdx}
                    onClick={() => {
                      if (isUnlocked) {
                        onSelectTopic(subtopic);
                        setSelectedPhaseForModal(null);
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      !isUnlocked
                        ? 'bg-surface-950/60 border-surface-800 text-gray-400 cursor-not-allowed opacity-80'
                        : isSelectedActive
                        ? 'bg-primary-600/20 border-primary-500 text-white shadow-md shadow-primary-950/50 cursor-pointer'
                        : isCurrent
                        ? 'bg-surface-800/90 border-primary-500/50 text-gray-200 hover:border-primary-400 cursor-pointer'
                        : isCompleted
                        ? 'bg-surface-800/60 border-green-500/30 text-gray-300 hover:bg-surface-800 cursor-pointer'
                        : 'bg-surface-800/40 border-surface-700 text-gray-300 hover:bg-surface-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden pr-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                          isCompleted
                            ? 'bg-green-500/20 text-green-400'
                            : isCurrent
                            ? 'bg-primary-500 text-white'
                            : !isUnlocked
                            ? 'bg-surface-800 text-gray-400'
                            : 'bg-surface-700 text-gray-300'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : !isUnlocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                        ) : (
                          <span>{sIdx + 1}</span>
                        )}
                      </div>

                      <div className="text-left overflow-hidden">
                        <div className={`text-sm font-medium truncate ${!isUnlocked ? 'text-gray-300' : 'text-white'}`}>
                          {subtopic.id ? `${subtopic.id} ` : ''}{subtopic.title}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isCompleted
                            ? 'Tamamlandı ✅'
                            : isCurrent
                            ? 'Şu Anki Ders (Tıkla ve Başla)'
                            : !isUnlocked
                            ? '🔒 Kilitli (Önceki konuları tamamlayınca açılır)'
                            : 'Açık'}
                        </div>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-surface-800 text-right">
              <button
                onClick={() => setSelectedPhaseForModal(null)}
                className="px-4 py-2 bg-surface-800 hover:bg-surface-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
