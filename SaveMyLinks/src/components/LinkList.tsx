import React, { useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { useApp } from '../context/AppContext';
import { LinkCard } from './LinkCard';
import { SavedLink } from '../types';
import { EmptyState } from './EmptyState';

export function LinkList() {
  const {
    links,
    searchQuery,
    selectedTags,
    sortBy,
    showStarredOnly,
    reorderLinks
  } = useApp();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredAndSortedLinks = useMemo(() => {
    let filtered = [...links];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(link =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        link.notes?.toLowerCase().includes(query) ||
        link.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(link =>
        selectedTags.every(tag => link.tags.includes(tag))
      );
    }

    // Apply starred filter
    if (showStarredOnly) {
      filtered = filtered.filter(link => link.starred);
    }

    // Apply sorting
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = filteredAndSortedLinks.findIndex(link => link.id === active.id);
      const newIndex = filteredAndSortedLinks.findIndex(link => link.id === over.id);
      
      const newOrder = arrayMove(filteredAndSortedLinks, oldIndex, newIndex);
      reorderLinks(newOrder);
    }
  };

  if (filteredAndSortedLinks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAndSortedLinks.length} link{filteredAndSortedLinks.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredAndSortedLinks} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedLinks.map((link) => (
              <SortableItem key={link.id} id={link.id}>
                <LinkCard link={link} />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}