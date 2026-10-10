import React, { useState, useEffect } from 'react';
import { X, BookOpen, Brain, HelpCircle, Rocket, Loader2, ChevronRight } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function SessionRecapCard({ topic, onDismiss, onContinue }) {
  const [recap, setRecap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!topic) return;
    const topicId = topic.dbId || topic.id;

    setIsLoading(true);
    setRecap(null);
    setHasError(false);

    window.api.getSessionRecap(topicId).then((result) => {
      if (result.success && result.data) {
        setRecap(result.data);
      } else {
        // No recap needed (fresh topic or error) — just dismiss silently
        onDismiss();
      }
    }).catch(() => {
      setHasError(true);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [topic?.dbId, topic?.id]);

  // If still loading, show a spinner overlay
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-surface-900 border border-surface-700 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">Son Oturum Analiz Ediliyor</p>
            <p className="text-gray-400 text-sm mt-1">Nerede kaldığını çıkarıyoruz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError || !recap) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Önceki Oturum Raporu</p>
              <h3 className="text-sm font-bold text-white truncate max-w-xs">
                {topic?.id ? `${topic.id} ` : ''}{topic?.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Recap Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-bold prose-headings:text-base prose-headings:mt-5 prose-headings:mb-2
            prose-p:text-gray-300 prose-p:leading-relaxed prose-p:my-2
            prose-li:text-gray-300 prose-li:my-0.5
            prose-strong:text-white
            prose-hr:border-surface-700">
            <MarkdownRenderer content={recap} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-surface-800 rounded-lg transition-colors font-medium"
          >
            Kapat
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary-900/30"
          >
            <span>Kaldığım Yerden Devam Et</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
