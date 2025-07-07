import React from 'react';
import { useApp } from '../context/AppContext';

export function ActionBar() {
  const { links } = useApp();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap gap-3">
        {/* Remove the Share Collection and Export/Import buttons from the JSX */}
      </div>
    </div>
  );
}