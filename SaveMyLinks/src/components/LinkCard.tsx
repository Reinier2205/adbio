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
  const lastOffset = useRef(0);
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  const cardContentRef = useRef<HTMLDivElement>(null);

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

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    lastOffset.current = swipeOffset;
    setIsSwiping(true);
  }, [swipeOffset]);

  const handleTouchEnd = React.useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    // Snap left if swiped more than 32px, else snap back
    if (swipeOffset < -32) {
      setSwipeOffset(-160);
      if (navigator.vibrate) navigator.vibrate([20]);
    } else {
      setSwipeOffset(0);
    }
  }, [isSwiping, swipeOffset]);

  // Attach touchmove with passive: false
  React.useEffect(() => {
    const node = cardContentRef.current;
    console.log('Attaching touchmove to', node);
    if (!node) return;
    const handler = (e: TouchEvent) => {
      if (!isSwiping) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = Math.abs(touch.clientY - touchStartY.current);
      if (Math.abs(dx) < dy) return;
      e.preventDefault();
      setSwipeOffset(Math.max(-160, Math.min(0, lastOffset.current + dx)));
    };
    node.addEventListener('touchmove', handler, { passive: false });
    return () => node.removeEventListener('touchmove', handler);
  }, [isSwiping]);

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
        ref={cardContentRef}
        className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full relative z-10 h-full flex flex-col transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px] select-none swipe-card"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {link.favicon ? (
                <>
                  {!faviconLoaded && (
                    <div className="w-8 h-8 rounded-md flex-shrink-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  )}
                  <img
                    src={link.favicon}
                    alt=""
                    className={`w-8 h-8 rounded-md flex-shrink-0 transition-opacity duration-300 ${faviconLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setFaviconLoaded(true)}
                    style={{ display: faviconLoaded ? 'block' : 'none' }}
                  />
                </>
              ) : (
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-medium font-sans text-gray-900 dark:text-white line-clamp-2 mb-1">{link.title}</h3>
                <p className="text-sm font-sans text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">{getDomain(link.url)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button onClick={handleStarClick} className={`p-2 rounded-lg transition-colors duration-200 ${link.starred ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={link.starred ? 'Remove from favorites' : 'Add to favorites'}>
                <Star className={`w-4 h-4 ${link.starred ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {link.notes && (
            <div className="mb-3">
              <p className="text-sm font-sans text-gray-500 dark:text-gray-400 line-clamp-3">{link.notes}</p>
            </div>
          )}
          {link.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {link.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
                {link.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    +{link.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(link.createdAt)}</span>
              </div>
            </div>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
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