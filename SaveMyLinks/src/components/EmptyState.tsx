import React from 'react';
import { BookMarked, Search, Star, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function EmptyState() {
  const { links, searchQuery, selectedTags, showStarredOnly, clearAllFilters } = useApp();

  const hasFilters = searchQuery || selectedTags.length > 0 || showStarredOnly;
  const hasLinks = links.length > 0;

  if (!hasLinks) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-6">
          <BookMarked className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-bold font-sans text-gray-900 dark:text-white mb-2">
          No links saved yet
        </h2>
        <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400 mb-4">
          Start building your personal link collection by adding your first bookmark above.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Searchable</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span>Taggable</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>Favoritable</span>
          </div>
        </div>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-lg font-bold font-sans text-gray-900 dark:text-white mb-2">
          No links match your filters
        </h2>
        <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400 mb-4">
          Try adjusting your search terms or filters to find what you're looking for.
        </p>
        <button
          onClick={clearAllFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return null;
}