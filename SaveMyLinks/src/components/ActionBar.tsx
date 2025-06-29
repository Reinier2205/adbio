import React from 'react';
import { Share2, Download, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ActionBarProps {
  onShareClick: () => void;
  onExportImportClick: () => void;
}

export function ActionBar({ onShareClick, onExportImportClick }: ActionBarProps) {
  const { links } = useApp();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onShareClick}
          disabled={links.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share Collection
        </button>
        
        <button
          onClick={onExportImportClick}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export / Import
        </button>
      </div>
    </div>
  );
}