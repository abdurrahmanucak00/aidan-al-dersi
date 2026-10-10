import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileDown } from 'lucide-react';

export default function ExportButton({ topicId }) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleExport = (format) => {
    setIsOpen(false);
    if (format === 'markdown' && window.api?.exportMarkdown) {
      window.api.exportMarkdown(topicId);
    } else if (format === 'pdf' && window.api?.exportPdf) {
      window.api.exportPdf(topicId);
    } else {
      console.warn(`Export for ${format} is not available in window.api`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-surface-800 hover:bg-surface-700 text-gray-300 rounded-lg transition-colors flex items-center justify-center"
        title="Dışa Aktar"
      >
        <Download className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden z-50 py-1">
          <button
            onClick={() => handleExport('markdown')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            Markdown Olarak
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 transition-colors text-left"
          >
            <FileDown className="w-4 h-4 text-red-400" />
            PDF Olarak
          </button>
        </div>
      )}
    </div>
  );
}
