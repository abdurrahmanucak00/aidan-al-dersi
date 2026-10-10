import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';

export default function ModelSelector({ models = [], selectedModel, onSelect, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = models.filter((m) =>
    m.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-800 border border-surface-700 hover:border-surface-600 rounded-lg px-4 py-3 flex items-center justify-between text-left transition-colors"
      >
        <span className="text-gray-300 truncate">
          {selectedModel ? selectedModel : 'Model Seçin'}
        </span>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-surface-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Model ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-700 rounded px-9 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Model bulunamadı
              </div>
            ) : (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-4 py-2 my-1 rounded text-sm cursor-pointer transition-colors ${
                    selectedModel === model.id
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-gray-300 hover:bg-surface-700'
                  }`}
                >
                  {model.id}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
