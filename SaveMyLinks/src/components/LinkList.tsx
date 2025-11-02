import * as React from 'react';
import { useMemo, useState } from 'react';

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
    showRecentsOnly,
    syncStatus,
    retrySync,
  } = useApp();

  console.log('links', links);

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

    if (showRecentsOnly) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      filtered = filtered.filter(link => {
        const created = link.createdAt instanceof Date ? link.createdAt.getTime() : new Date(link.createdAt).getTime();
        const updated = link.updatedAt instanceof Date ? link.updatedAt.getTime() : new Date(link.updatedAt).getTime();
        return now - Math.max(created, updated) <= oneDay;
      });
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
  }, [links, searchQuery, selectedTags, sortBy, showStarredOnly, showRecentsOnly]);

  if (syncStatus === 'syncing') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 lg:gap-12 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse min-h-[120px] flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 rounded-md bg-chip" />
              <div className="flex-1">
                <div className="h-4 bg-chip rounded w-3/4 mb-4" />
                <div className="h-3 bg-chip rounded w-1/2" />
              </div>
            </div>
            <div className="h-3 bg-chip rounded w-full mb-4" />
            <div className="h-3 bg-chip rounded w-2/3 mb-4" />
            <div className="flex items-center justify-between pt-4 border-t border-[#232946] mt-auto">
              <div className="h-3 bg-chip rounded w-1/4" />
              <div className="h-6 bg-chip rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8">
        <div className="bg-danger-bg border border-danger-border rounded-lg p-4 mb-8 text-center">
          <p className="body text-danger-text mb-4">Failed to sync links. Please check your connection and try again.</p>
          <button
            onClick={retrySync}
            className="px-4 py-2 rounded-lg bg-blue-400 hover:bg-blue-500 text-main font-medium font-sans transition-colors duration-200"
          >
            Retry
          </button>
        </div>
        <EmptyState />
      </div>
    );
  }

  if (filteredAndSortedLinks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between">
        <p className="body-sm text-muted">
          {filteredAndSortedLinks.length} link{filteredAndSortedLinks.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12 w-full items-stretch">
        {filteredAndSortedLinks.map((link) => (
          <div key={link.id} className="h-full">
            <LinkCard link={link} />
          </div>
        ))}
      </div>
    </div>
  );
}