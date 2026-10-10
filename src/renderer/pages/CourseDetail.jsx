import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, MessageSquare, CheckCircle, ChevronLeft } from 'lucide-react';
import useStore from '../store/useStore';
import { useTranslation } from '../i18n';
import GameRoadmap, { cleanTitle } from '../components/GameRoadmap';
import ChatWindow from '../components/ChatWindow';
import ProgressBar from '../components/ProgressBar';
import SessionRecapCard from '../components/SessionRecapCard';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('map'); // default to 'map' or 'chat'
  const [showRecap, setShowRecap] = useState(false);
  const [recapTopic, setRecapTopic] = useState(null);
  
  const {
    activeCourse, setActiveCourse, topics, activeTopic, setActiveTopic,
    messages, sendMessage, isStreaming, streamingContent,
    updateTopicStatus,
  } = useStore();

  useEffect(() => {
    const loadCourse = async () => {
      const result = await window.api.getCourse(parseInt(id));
      if (result.success && result.data) {
        await setActiveCourse(result.data);
      }
    };
    loadCourse();

    // Set up streaming listeners
    const removeChunk = window.api.onChatChunk((chunk) => {
      useStore.getState().appendStreamingContent(chunk);
    });
    const removeEnd = window.api.onChatEnd(() => {
      useStore.getState().finishStreaming();
    });
    const removeError = window.api.onChatError((error) => {
      console.error('Chat error:', error);
      useStore.getState().handleChatError(error);
    });

    return () => {
      removeChunk();
      removeEnd();
      removeError();
    };
  }, [id, setActiveCourse]);

  // Flatten all subtopics to easily find next topic
  const flatSubtopics = [];
  topics?.forEach((phase) => {
    const subtopics = phase.subtopics || phase.topics || [];
    subtopics.forEach((st) => {
      flatSubtopics.push(st);
    });
  });

  // Auto-select first unlocked incomplete subtopic if none is selected
  useEffect(() => {
    if (flatSubtopics.length > 0 && !activeTopic) {
      const firstIncomplete = flatSubtopics.find(t => t.status !== 'completed');
      setActiveTopic(firstIncomplete || flatSubtopics[0]);
    }
  }, [topics, activeTopic, setActiveTopic]);

  const handleTopicSelect = useCallback((topic) => {
    setActiveTopic(topic);
    // Show session recap card if topic has prior history (checked inside the card)
    setRecapTopic(topic);
    setShowRecap(true);
  }, [setActiveTopic]);

  const handleSendMessage = useCallback((content) => {
    sendMessage(content);
  }, [sendMessage]);

  const handleMarkCompleted = useCallback(async (topic) => {
    if (topic && topic.dbId) {
      await updateTopicStatus(topic.dbId, 'completed');
      
      // Auto find next topic to unlock and switch if desired
      const currentIdx = flatSubtopics.findIndex(t => (t.dbId || t.id) === (topic.dbId || topic.id));
      if (currentIdx !== -1 && currentIdx < flatSubtopics.length - 1) {
        const nextTopic = flatSubtopics[currentIdx + 1];
        setTimeout(() => {
          setActiveTopic(nextTopic);
        }, 500);
      }
    }
  }, [updateTopicStatus, flatSubtopics, setActiveTopic]);

  if (!activeCourse) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-950">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalTopics = flatSubtopics.length;
  const completedTopics = flatSubtopics.filter(s => s.status === 'completed').length;

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Session Recap Card — shown when user taps a topic from the map */}
      {showRecap && recapTopic && (
        <SessionRecapCard
          topic={recapTopic}
          onDismiss={() => {
            setShowRecap(false);
            setViewMode('chat');
          }}
          onContinue={() => {
            setShowRecap(false);
            setViewMode('chat');
          }}
        />
      )}

      {/* Clean Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-surface-800 shrink-0 bg-surface-900 z-20">
        <div className="flex items-center gap-4 overflow-hidden">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-gray-400 hover:text-white shrink-0 flex items-center gap-1 text-xs font-medium"
            title="Ana Sayfaya Dön"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Ana Sayfa</span>
          </button>
          
          <div className="h-5 w-px bg-surface-800 shrink-0" />

          <div className="overflow-hidden">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">{activeCourse.title}</h1>
            <div className="flex items-center gap-3 mt-0.5 max-w-xs">
              <ProgressBar completed={completedTopics} total={totalTopics} />
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {completedTopics}/{totalTopics} {t('topics_completed')}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: Ders Haritası vs Ders Odası */}
        <div className="flex items-center gap-2 bg-surface-950 p-1 rounded-xl border border-surface-800">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Map size={14} />
            <span>Ders Haritası</span>
          </button>
          <button
            onClick={() => setViewMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'chat'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare size={14} />
            <span>Ders Odası</span>
          </button>
        </div>
      </div>

      {/* Main Full-Width Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'map' ? (
          <GameRoadmap 
            phases={topics} 
            activeTopic={activeTopic} 
            onSelectTopic={handleTopicSelect} 
          />
        ) : (
          <div className="h-full w-full flex flex-col relative bg-surface-950 overflow-hidden">
            {activeTopic ? (
              <ChatWindow
                topic={activeTopic}
                messages={messages}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                onSendMessage={handleSendMessage}
                onMarkCompleted={handleMarkCompleted}
                onGoToMap={() => setViewMode('map')}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <p className="text-base font-medium text-gray-300">Bir ders seçilmedi</p>
                <button
                  onClick={() => setViewMode('map')}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Ders Haritasına Git
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
