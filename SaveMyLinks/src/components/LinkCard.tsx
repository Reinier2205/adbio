import React, { useState, useEffect } from 'react';
import { Star, ExternalLink, Edit2, Trash2, Calendar, Tag, FileText, Globe, X } from 'lucide-react';
import { SavedLink } from '../types';
import { useApp } from '../context/AppContext';
import { EditLinkModal } from './EditLinkModal';

interface LinkCardProps {
  link: SavedLink;
  isDragging?: boolean;
}

export function LinkCard({ link, isDragging }: LinkCardProps) {
  const { toggleStar, deleteLink } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar(link.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showDeleteConfirm) {
      // Second click - actually delete
      deleteLink(link.id);
      setShowDeleteConfirm(false);
    } else {
      // First click - show confirmation
      setShowDeleteConfirm(true);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // Reset confirmation state after 5 seconds
  useEffect(() => {
    if (showDeleteConfirm) {
      const timer = setTimeout(() => {
        setShowDeleteConfirm(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showDeleteConfirm]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <>
      <div
        className={`group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${showDeleteConfirm ? 'ring-2 ring-red-200 dark:ring-red-800 shadow-lg' : ''}`}
      >
        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Click delete again to permanently remove this link
                </p>
              </div>
              <button
                onClick={handleCancelDelete}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                title="Cancel deletion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {link.favicon ? (
                <img
                  src={link.favicon}
                  alt=""
                  className="w-8 h-8 rounded-md flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
                    )}`;
                  }}
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {link.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {getDomain(link.url)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleStarClick}
                className={`p-2 rounded-lg transition-colors ${
                  link.starred
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
                title={link.starred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-4 h-4 ${link.starred ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleEditClick}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit link"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteClick}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showDeleteConfirm
                    ? 'text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20 scale-110 shadow-md'
                    : 'text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
                }`}
                title={showDeleteConfirm ? 'Click again to confirm deletion' : 'Delete link'}
              >
                <Trash2 className={`w-4 h-4 ${showDeleteConfirm ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>

          {/* Notes */}
          {link.notes && (
            <div className="mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {link.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {link.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {link.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  >
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(link.createdAt)}</span>
              </div>
            </div>
            
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <EditLinkModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        link={link}
      />
    </>
  );
}