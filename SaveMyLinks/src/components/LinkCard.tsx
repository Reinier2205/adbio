import * as React from 'react';
import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Star, ExternalLink, Edit2, Trash2, Calendar, Globe, Tag } from 'lucide-react';
import { SavedLink } from '../types';
import { useApp } from '../context/AppContext';

interface LinkCardProps {
  link: SavedLink;
}

const LinkCardComponent = ({ link }: LinkCardProps) => {
  const { toggleStar, deleteLink } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const initialSwipeOffset = useRef(0);
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const hasMovedRef = useRef(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate([20]);
    toggleStar(link.id);
  };

  const handleEdit = () => {
    setShowEditModal(true);
    resetSwipe();
  };

  const handleDelete = () => {
    if (navigator.vibrate) navigator.vibrate([20]);
    deleteLink(link.id);
    resetSwipe();
  };

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    initialSwipeOffset.current = swipeOffset;
    setIsSwiping(true);
    setHasMoved(false);
    hasMovedRef.current = false;
  }, [swipeOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    e.preventDefault();
    console.log('touchmove', deltaX, deltaY);
    if (!hasMovedRef.current) {
      // Only start swiping if horizontal movement exceeds 4px and is greater than vertical
      if (Math.abs(deltaX) > 4 && Math.abs(deltaX) > deltaY) {
        hasMovedRef.current = true;
        setHasMoved(true);
      } else {
        return;
      }
    }
    const newOffset = Math.max(-160, Math.min(0, initialSwipeOffset.current + deltaX));
    setSwipeOffset(newOffset);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    setHasMoved(false);
    hasMovedRef.current = false;
    // If swiped more than 32px to the left, snap to open position
    if (swipeOffset < -32) {
      setSwipeOffset(-160);
      if (navigator.vibrate) navigator.vibrate([20]);
    } else {
      setSwipeOffset(0);
    }
  }, [isSwiping, swipeOffset]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const EditLinkModal = lazy(() => import('./EditLinkModal'));

  return (
    <div className="relative w-full overflow-hidden h-full" ref={cardRef}>
      {/* Swipe Actions Background */}
      <div className="absolute top-0 right-0 h-full grid grid-cols-2 gap-2 z-0 rounded-xl shadow-lg p-2" style={{ width: '128px' }}>
        <button
          onClick={handleEdit}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white h-full transition-all duration-200 rounded-md shadow-inner"
        >
          <Edit2 className="w-6 h-6" />
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white h-full transition-all duration-200 rounded-md shadow-inner"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
      
      {/* Main Card Content */}
      <div
        className="swipe-card"
        style={{
          height: 100,
          background: '#eee',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        Test
      </div>
      
      <Suspense fallback={null}>
        <EditLinkModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          link={link}
        />
      </Suspense>
    </div>
  );
};

export const LinkCard = React.memo(LinkCardComponent);