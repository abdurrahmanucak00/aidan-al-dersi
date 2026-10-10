import React, { useState, useEffect, useRef, memo } from 'react';
import { Send, CheckCircle, Sparkles } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ExportButton from './ExportButton';

// Memoized individual message item to prevent re-rendering entire list while typing
const MessageItem = memo(({ msg }) => {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-5 py-4 rounded-2xl max-w-[90%] leading-relaxed ${
          msg.role === 'user'
            ? 'bg-primary-600/25 border border-primary-500/30 rounded-br-sm ml-auto text-primary-100 shadow-sm'
            : 'bg-surface-900 border border-surface-800/90 rounded-bl-sm mr-auto text-gray-200 shadow-md'
        }`}
      >
        {msg.role === 'user' ? (
          <div className="whitespace-pre-wrap text-sm font-medium">{msg.content}</div>
        ) : (
          <MarkdownRenderer content={msg.content} />
        )}
      </div>
    </div>
  );
});

// Fast isolated input bar component
const ChatInput = memo(({ onSendMessage, isStreaming }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim() && !isStreaming) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="border-t border-surface-800/80 px-4 sm:px-8 py-4 bg-surface-900/95 shrink-0">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Sorunu sor, anladığını belirt ('devam', 'geçelim' vb.) veya yanıtını yaz... (Enter ile gönder)"
          className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 w-full resize-none min-h-[48px] max-h-[140px] focus:outline-none focus:border-primary-500 text-white placeholder-gray-500 text-sm leading-normal shadow-inner"
          rows={1}
          disabled={isStreaming}
          spellCheck={false}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isStreaming}
          className="bg-primary-600 hover:bg-primary-500 disabled:bg-surface-800 disabled:text-gray-600 disabled:border-surface-700 text-white rounded-xl p-3 h-12 w-12 flex items-center justify-center transition-colors shrink-0 shadow-lg shadow-primary-900/20"
          title="Gönder"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

export default function ChatWindow({ 
  topic, 
  messages, 
  isStreaming, 
  streamingContent, 
  onSendMessage,
  onMarkCompleted,
  onGoToMap
}) {
  const messagesEndRef = useRef(null);
  const currentTopicIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // When a topic is loaded with 0 messages, trigger lesson explanation step-by-step automatically
  useEffect(() => {
    if (!topic) return;

    const topicKey = topic.dbId || topic.id;
    if (currentTopicIdRef.current !== topicKey) {
      currentTopicIdRef.current = topicKey;
      
      if ((!messages || messages.length === 0) && !isStreaming) {
        onSendMessage(`Lütfen "${topic.id ? topic.id + ' ' : ''}${topic.title}" mikro-başlığı ile eğitime başla. KURAL: Konunun tamamını tek seferde anlatma. Konuyu 3-4 adıma böl ve YALNIZCA 1. ADIMI anlatıp benden soru veya devam onayı bekle.`);
      }
    }
  }, [topic, messages, isStreaming, onSendMessage]);

  // Detect if the last assistant message indicates topic completion
  const lastAssistantMsg = [...(messages || [])].reverse().find(m => m.role === 'assistant');
  const isTopicComplete = !isStreaming && lastAssistantMsg && (
    lastAssistantMsg.content.includes('konusunu tamamladık') ||
    lastAssistantMsg.content.includes('✅') && lastAssistantMsg.content.includes('tamamladık')
  );

  if (!topic) return null;


  return (
    <div className="flex flex-col h-full bg-surface-950 text-gray-300">
      {/* Top Header Bar for Active Subtopic */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-800/80 bg-surface-900/90 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden pr-4 max-w-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0 animate-pulse" />
          <h2 className="text-base font-bold text-white truncate">
            {topic.id ? `${topic.id} ` : ''}{topic.title}
          </h2>
          <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 font-medium ${
            topic.status === 'completed' 
              ? 'bg-green-950 text-green-400 border border-green-800' 
              : topic.status === 'in_progress' 
              ? 'bg-amber-950 text-amber-400 border border-amber-800' 
              : 'bg-surface-800 text-gray-400 border border-surface-700'
          }`}>
            {topic.status === 'completed' ? 'Tamamlandı' : topic.status === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportButton topicId={topic.dbId || topic.id} />
          {topic.status !== 'completed' && (
            <button 
              onClick={() => onMarkCompleted?.(topic)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-colors shadow-sm"
              title="Bu konuyu bitir ve bir sonraki konunun kilidini aç"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Tamamlandı İşaretle</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
          {(!messages || messages.length === 0) && !isStreaming && (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 my-auto p-12 bg-surface-900/40 rounded-2xl border border-surface-800/60 max-w-lg mx-auto">
              <Sparkles className="w-8 h-8 text-primary-400 mb-3 animate-bounce" />
              <p className="font-semibold text-white text-base">Eğitmen Hazırlanıyor...</p>
              <p className="text-xs text-gray-400 mt-1">Konu mikro-adımlara bölünerek 1. Adım ile doğrudan başlatılıyor.</p>
            </div>
          )}
          
          {messages?.map((msg, idx) => (
            <MessageItem key={idx} msg={msg} />
          ))}
          
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-surface-900 border border-surface-800/90 rounded-2xl rounded-bl-sm px-5 py-4 mr-auto max-w-[90%] text-gray-200 shadow-md">
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-2 h-4 bg-primary-400 animate-pulse ml-1 align-middle rounded-sm" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Completion Action Bar — appears when topic finishes, topic not yet marked complete */}
      {isTopicComplete && topic.status !== 'completed' && (
        <div className="border-t border-amber-500/20 bg-amber-950/20 px-4 sm:px-8 py-4 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-medium flex-1">
              <span className="text-lg">🎉</span>
              <span>
                <span className="font-bold">{topic.id} {topic.title}</span> konusunu bitirdin!
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onSendMessage('Aklıma başka bir sorum geldi, devam edelim')}
                className="px-4 py-2 bg-surface-800 hover:bg-surface-700 text-gray-300 border border-surface-600 rounded-xl text-sm font-medium transition-colors"
              >
                ❓ Soru Sormaya Devam Et
              </button>
              <button
                onClick={() => {
                  onMarkCompleted?.(topic);
                  onGoToMap?.();
                }}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-900/30 flex items-center gap-2"
              >
                <span>✅</span>
                <span>{topic.id} Tamamlandı — Haritaya Dön</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Message Area - Ultra fast & isolated */}
      <ChatInput onSendMessage={onSendMessage} isStreaming={isStreaming} />
    </div>
  );
}
