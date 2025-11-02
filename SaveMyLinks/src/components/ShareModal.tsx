import React, { useState } from 'react';
import { X, Share2, Copy, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { storage } from '../utils/storage';
import { SharedCollection } from '../types';
import { resetIOSZoom } from '../utils/iosZoomReset';
import { generateShareId } from '../utils/idGenerator';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { links } = useApp();
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [title, setTitle] = useState('My Link Collection');
  const [description, setDescription] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const toggleLinkSelection = (linkId: string) => {
    setSelectedLinks(prev =>
      prev.includes(linkId)
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  const selectAll = () => {
    setSelectedLinks(links.map(link => link.id));
  };

  const deselectAll = () => {
    setSelectedLinks([]);
  };

  const createShareableCollection = async () => {
    if (selectedLinks.length === 0) return;

    setIsCreating(true);
    
    try {
      const selectedLinksData = links.filter(link => selectedLinks.includes(link.id));
      const shareId = generateShareId();
      
      const collection: SharedCollection = {
        id: shareId,
        title,
        description,
        links: selectedLinksData,
        createdAt: new Date()
      };

      storage.saveSharedCollection(collection);
      
      const url = `${window.location.origin}${window.location.pathname}#/share/${shareId}`;
      setShareUrl(url);
    } catch (error) {
      console.error('Failed to create shareable collection:', error);
      alert('Failed to create shareable collection. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleClose = () => {
    onClose();
    resetIOSZoom();
  };

  if (shareUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[rgba(30,41,59,0.85)] rounded-xl shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-8 border-b border-input-border">
            <h2 className="text-lg font-bold font-sans text-main">
              Collection Shared!
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-card-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-chip rounded-full flex items-center justify-center mx-auto mb-8">
                <Share2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-base text-muted mb-8">
                Your collection is now available at the link below. Anyone with this link can view your selected links.
              </p>
            </div>

            <div className="bg-input p-4 rounded-lg">
              <p className="text-sm text-muted mb-4">Share URL:</p>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-input border border-input-border rounded-md text-main text-base shadow-sm"
                />
                <button
                  onClick={copyShareUrl}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-card-hover border border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-200 font-medium mb-4">
                    Privacy Notice
                  </p>
                  <p className="text-yellow-300">
                    This collection is publicly accessible. Anyone with the link can view the shared links.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full btn btn-primary mt-6"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[rgba(30,41,59,0.85)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-input-border">
          <h1 className="heading-3 text-main">
            Share Link Collection
          </h1>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-base font-bold font-sans text-main mb-2">
                Collection Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base shadow-sm"
                placeholder="Enter a title for your collection"
              />
            </div>

            <div>
              <label className="block text-base font-bold font-sans text-main mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base shadow-sm"
                placeholder="Add a description for your collection"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-bold font-sans text-main mb-2">
                Select Links to Share ({selectedLinks.length}/{links.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-base font-medium font-sans text-blue-400 hover:text-blue-300"
                >
                  Select All
                </button>
                <span className="text-muted">|</span>
                <button
                  onClick={deselectAll}
                  className="text-base font-medium font-sans text-blue-400 hover:text-blue-300"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border border-input-border rounded-lg">
              {links.map((link) => (
                <label
                  key={link.id}
                  className="flex items-center gap-3 p-3 hover:bg-card-hover cursor-pointer font-bold text-main"
                >
                  <input
                    type="checkbox"
                    checked={selectedLinks.includes(link.id)}
                    onChange={() => toggleLinkSelection(link.id)}
                    className="rounded border-input-border text-blue-400 focus:ring-primary"
                  />
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {link.favicon && (
                      <img
                        src={link.favicon}
                        alt={`Favicon for ${link.title}`}
                        className="w-4 h-4 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-muted truncate">
                        {link.title}
                      </p>
                      <p className="text-sm text-muted truncate">
                        {link.url}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-input-border">
            <button
              onClick={createShareableCollection}
              disabled={selectedLinks.length === 0 || isCreating}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Shareable Link'}
            </button>
            <button
              onClick={handleClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;