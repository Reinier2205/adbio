import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { SharedCollection } from '../types';
import { storage } from '../utils/storage';

interface SharedCollectionViewProps {
  shareId: string;
  onBack: () => void;
}

export function SharedCollectionView({ shareId, onBack }: SharedCollectionViewProps) {
  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadCollection = () => {
      const sharedCollection = storage.getSharedCollection(shareId);
      setCollection(sharedCollection);
      setLoading(false);
    };

    loadCollection();
  }, [shareId]);

  const handleReport = () => {
    storage.addReport(shareId, 'Inappropriate content');
    setReportSubmitted(true);
    setShowReportDialog(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Collection Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The shared collection you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Add meta tag for SEO */}
      <meta name="robots" content="noindex" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SaveMyLinks
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Collection Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{collection.links.length} links</span>
                <span>•</span>
                <span>Shared on {formatDate(new Date(collection.createdAt))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {collection.links.map((link) => (
            <div
              key={link.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {link.favicon && (
                    <img
                      src={link.favicon}
                      alt=""
                      className="w-8 h-8 rounded-md flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {link.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {new URL(link.url).hostname.replace('www.', '')}
                    </p>
                  </div>
                </div>
                
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Visit link"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </a>
              </div>

              {link.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {link.notes}
                </p>
              )}

              {link.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {link.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Powered by SaveMyLinks
          </div>
          
          <div className="flex items-center gap-4">
            {!reportSubmitted ? (
              <button
                onClick={() => setShowReportDialog(true)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                Report Collection
              </button>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Report submitted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Report Collection
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to report this collection for inappropriate content? 
              This action will notify the administrators.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReport}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Report
              </button>
              <button
                onClick={() => setShowReportDialog(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}