import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Circle, Clock, CheckCircle2 } from 'lucide-react';

export default function RoadmapTree({ phases, activeTopicId, onTopicSelect }) {
  const [expandedPhases, setExpandedPhases] = useState({});

  useEffect(() => {
    const initialExpanded = {};
    phases?.forEach((phase, idx) => {
      // Expand all phases by default, or the first one
      initialExpanded[phase.title || idx] = true;
    });
    setExpandedPhases(initialExpanded);
  }, [phases]);

  const togglePhase = (phaseKey) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500 shrink-0" />;
    }
  };

  return (
    <div className="w-full text-gray-300 select-none">
      {phases?.map((phase, idx) => {
        const phaseKey = phase.title || idx;
        const isExpanded = expandedPhases[phaseKey] !== false;
        const subtopics = phase.subtopics || phase.topics || [];
        const completedCount = subtopics.filter((t) => t.status === 'completed').length;
        const totalCount = subtopics.length;

        return (
          <div key={phaseKey} className="border-b border-surface-800 last:border-none">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-800/60 font-medium transition-colors"
              onClick={() => togglePhase(phaseKey)}
            >
              <div className="flex items-center gap-2 pr-2 overflow-hidden">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className="text-sm text-gray-200 truncate">{phase.title}</span>
              </div>
              <span className="text-xs text-gray-400 bg-surface-800 px-2 py-0.5 rounded-full shrink-0">
                {completedCount}/{totalCount}
              </span>
            </div>

            {isExpanded && (
              <div className="pb-2 space-y-1">
                {subtopics.map((topic) => {
                  const isActive = (topic.id === activeTopicId) || (topic.dbId === activeTopicId);
                  return (
                    <div
                      key={topic.dbId || topic.id}
                      onClick={() => onTopicSelect(topic)}
                      className={`flex items-center gap-3 pl-8 pr-4 py-2 text-sm cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-primary-600/25 text-primary-300 font-medium border-r-2 border-primary-500'
                          : 'text-gray-400 hover:bg-surface-800/80 hover:text-gray-200'
                      }`}
                    >
                      {getStatusIcon(topic.status)}
                      <span className="truncate">{topic.id} {topic.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
