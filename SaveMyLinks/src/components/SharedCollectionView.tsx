import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { SharedCollection } from '../types';
import { storage } from '../utils/storage';
import { LinkCard } from './LinkCard';

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
      <div className="min-h-screen welcome-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen welcome-gradient-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-semibold text-main mb-2">
            Collection Not Found
          </h2>
          <p className="text-muted mb-6">
            The shared collection you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen welcome-gradient-bg">
      {/* Add meta tag for SEO */}
      <meta name="robots" content="noindex" />
      {/* Header */}
      <header className="sticky top-0 z-50 welcome-gradient-bg shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SaveMyLinks
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-card-hover rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5 text-muted" />
              )}
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Collection Info */}
        <div className="card shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-chip rounded-xl flex items-center justify-center flex-shrink-0">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-main mb-2">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-muted mb-3">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted">
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
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-card-divider flex items-center justify-between">
          <div className="text-sm text-muted">
            Powered by SaveMyLinks
          </div>
          <div className="flex items-center gap-4">
            {!reportSubmitted ? (
              <button
                onClick={() => setShowReportDialog(true)}
                className="text-sm text-danger hover:text-danger-hover transition-colors"
              >
                Report Collection
              </button>
            ) : (
              <span className="text-sm text-muted">
                Report submitted
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-main mb-3">
              Report Collection
            </h2>
            <p className="text-muted mb-6">
              Are you sure you want to report this collection for inappropriate content? 
              This action will notify the administrators.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReport}
                className="flex-1 btn btn-danger"
              >
                Report
              </button>
              <button
                onClick={() => setShowReportDialog(false)}
                className="flex-1 btn btn-secondary"
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