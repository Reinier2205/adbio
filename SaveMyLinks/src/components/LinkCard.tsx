import * as React from 'react';
import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Star, ExternalLink, Edit2, Trash2, Calendar, Globe, Tag, MoreVertical } from 'lucide-react';
import { SavedLink } from '../types';
import { useApp } from '../context/AppContext';
import { Button } from './Button';

interface LinkCardProps {
  link: SavedLink;
}

function isIOSSafari() {
  return (
    /iP(ad|hone|od)/.test(navigator.userAgent) &&
    /WebKit/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent)
  );
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const visitLinkRef = useRef<HTMLAnchorElement>(null);

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

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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
    <div className="relative w-full overflow-hidden h-full rounded-xl bg-[#232946]" ref={cardRef}>
      {/* Swipe Actions Background */}
      {/* Removed old edit and delete icon buttons that were rendered behind the cards */}
      
      {/* Main Card Content */}
      <div
        ref={cardContentRef}
        className="group card-dark shadow-sm w-full relative z-10 h-full flex flex-col transition-colors duration-200 ease-in-out active:bg-card-active min-h-[44px] select-none swipe-card"
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
        <div className="p-2 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {link.favicon ? (
                <>
                  {!faviconLoaded && (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-card-favicon animate-pulse" />
                  )}
                  <img
                    src={link.favicon}
                    alt={`Favicon for ${getDomain(link.url)}`}
                    className={`w-16 h-16 rounded-xl flex-shrink-0 transition-opacity duration-300 ${faviconLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setFaviconLoaded(true)}
                    style={{ display: faviconLoaded ? 'block' : 'none' }}
                  />
                </>
              ) : (
                <div className="w-16 h-16 bg-card-favicon rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-8 h-8 text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1 pr-12">
                <h3 className="heading-4 line-clamp-2 mb-1 break-words text-main">{link.title}</h3>
                <p className="body-sm line-clamp-2 mb-1 break-words text-main">{getDomain(link.url)}</p>
              </div>
            </div>
          </div>
          {/* More (three dots) button in top right */}
          <div className="absolute top-2 right-2 z-20">
            <Button
              className="btn btn-secondary text-sm inline-flex items-center space-x-1 px-3 py-1.5"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More actions"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            {menuOpen && (
              <div ref={menuRef} className="absolute right-0 mt-2 w-36 bg-card-menu border border-card-menu-border rounded-lg shadow-lg z-50 animate-fade-in">
                <Button
                  variant="primary"
                  className="w-full text-left px-5 py-3 rounded-t-lg text-base font-medium"
                  onClick={() => { setShowEditModal(true); setMenuOpen(false); }}
                >
                  Edit
                </Button>
                <div className="h-0.5" />
                <Button
                  variant="primary"
                  className="w-full text-left px-5 py-3 bg-danger hover:bg-danger-hover rounded-b-lg text-base font-medium"
                  onClick={() => { handleDelete(); setMenuOpen(false); }}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>

          {link.notes && (
            <div className="mb-3">
              <p className="body-sm line-clamp-3 break-words text-main">{link.notes}</p>
            </div>
          )}
          {link.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {link.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-chip text-chip">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
                {link.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-chip text-muted">
                    +{link.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          {/* Bottom row: date (left), favorite (center), visit (right) */}
          <div className="flex items-center justify-between pt-3 mt-auto">
            <div className="flex items-center space-x-4 body-sm min-w-0">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span className="truncate">{formatDate(link.createdAt)}</span>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <Button
                className={
                  'btn btn-secondary text-sm inline-flex items-center space-x-1 px-3 py-1.5' +
                  (link.starred ? ' text-yellow-500 hover:text-yellow-600' : ' text-muted hover:text-yellow-500')
                }
                onClick={handleStarClick}
                aria-label={link.starred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className="w-4 h-4" />
                <span>Favorite</span>
              </Button>
            </div>
            <div className="flex items-center justify-end">
              <Button
                className="btn btn-secondary text-sm inline-flex items-center space-x-1 px-3 py-1.5"
                onClick={e => {
                  e.stopPropagation();
                  if (isIOSSafari()) {
                    window.location.href = link.url;
                  } else {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                aria-label="Visit link"
              >
                <span>Visit</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
              {/* Hidden anchor for reliable iOS Safari opening */}
              <a
                ref={visitLinkRef}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'none' }}
                tabIndex={-1}
              />
            </div>
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