import * as React from 'react';
import { useMemo } from 'react';

import { useApp } from '../context/AppContext';
import { LinkCard } from './LinkCard';
import { EmptyState } from './EmptyState';

export function LinkList() {
  const {
    links,
    searchQuery,
    selectedTags,
    sortBy,
    showStarredOnly,
  } = useApp();

  const filteredAndSortedLinks = useMemo(() => {
    let filtered = [...links];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(link =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        link.notes?.toLowerCase().includes(query) ||
        link.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(link =>
        selectedTags.every(tag => link.tags.includes(tag))
      );
    }

    if (showStarredOnly) {
      filtered = filtered.filter(link => link.starred);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'starred':
          if (a.starred && !b.starred) return -1;
          if (!a.starred && b.starred) return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'newest':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [links, searchQuery, selectedTags, sortBy, showStarredOnly]);

  if (filteredAndSortedLinks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAndSortedLinks.length} link{filteredAndSortedLinks.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        {filteredAndSortedLinks.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}