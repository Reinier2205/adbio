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
          <img src="images/sml_whitelogo.png" alt="SaveMyLinks white logo" className="w-20 h-20 object-contain" />
        </div>
        <h2 className="text-2xl font-bold font-sans text-gray-900 dark:text-white mb-2">
          Welcome to SaveMyLinks!
        </h2>
        <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400 mb-4 max-w-xl mx-auto">
          This is your personal space to save, organize, and quickly find your favorite websites, articles, tools, and more. <br />
          <span className="block mt-2">Never lose an important link again—SaveMyLinks helps you build your own private, searchable, and taggable bookmark collection, accessible from anywhere.</span>
        </p>
        <div className="mb-6">
          <span className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg font-semibold">
            Get started by adding your first link above!
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Search your collection anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span>Organize with tags</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>Mark favorites for quick access</span>
          </div>
        </div>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-6 max-w-lg mx-auto">
          <span className="block mb-2">Ready to get started?</span>
          <span className="block">Just paste a link in the box above and click <b>Add</b>. You can add notes, tags, and even star your most important bookmarks. Welcome aboard!</span>
        </p>
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