import * as React from 'react';
import { useMemo, useState } from 'react';

import { useApp } from '../context/AppContext';
import { LinkCard } from './LinkCard';
import { EmptyState } from './EmptyState';
import TouchTest from './TouchTest';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col animate-pulse min-h-[120px]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-2" />
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 text-center">
          <p className="text-base font-medium font-sans text-red-700 dark:text-red-300 mb-2">Failed to sync links. Please check your connection and try again.</p>
          <button
            onClick={retrySync}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium font-sans transition-colors duration-200"
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
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400">
          {filteredAndSortedLinks.length} link{filteredAndSortedLinks.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        <DraggableTouchTest />
        {filteredAndSortedLinks.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}

function DraggableTouchTest() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = React.useRef({ x: 0, y: 0 });
  const last = React.useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
    last.current = { ...offset };
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - start.current.x;
    const dy = touch.clientY - start.current.y;
    setOffset({ x: last.current.x + dx, y: last.current.y + dy });
  };
  const handleTouchEnd = () => {
    setDragging(false);
  };
  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        minHeight: 120,
        margin: '0 auto',
      }}
    >
      {/* Swipe Actions Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 128,
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          zIndex: 0,
          padding: 16,
        }}
      >
        <button style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18 }}>Edit</button>
        <button style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18 }}>Delete</button>
      </div>
      {/* Main Card Content (only this moves) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
          padding: 24,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          fontSize: 18,
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#e0e7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, fontSize: 22 }}>
            🌐
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#1e293b' }}>Example Link Title</div>
            <div style={{ fontWeight: 400, fontSize: 15, color: '#64748b' }}>example.com</div>
          </div>
          <button
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 22,
              color: '#fbbf24',
            }}
            aria-label="Favorite"
            onClick={e => e.stopPropagation()}
          >
            ★
          </button>
        </div>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', borderRadius: 999, padding: '2px 12px', fontSize: 13, fontWeight: 500, marginRight: 8 }}>tag1</span>
          <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', borderRadius: 999, padding: '2px 12px', fontSize: 13, fontWeight: 500 }}>tag2</span>
        </div>
        <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>
          This is a note about the link.
        </div>
      </div>
    </div>
  );
}