import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { Plus, X as LucideX, Tag, Loader2, Link as LinkIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validateUrl, normalizeUrl } from '../utils/linkUtils';
import { fetchLinkMetadata } from '../utils/metadataFetcher';
import type { LinkMetadata } from '../utils/metadataFetcher';
import { Button } from './Button';
import { useNavigate, useLocation } from 'react-router-dom';

// Context to provide main content ref
export const MainContentScrollContext = React.createContext<React.RefObject<HTMLElement> | null>(null);

export function AddLinkForm({ onClose }: { onClose?: () => void }) {
  const { addLink, tags, addGlobalTag } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    notes: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const mainContentRef = useContext(MainContentScrollContext);
  const navigate = useNavigate();
  const location = useLocation();

  const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  };

  useEffect(() => { resizeTextarea(titleRef); }, [formData.title]);
  useEffect(() => { resizeTextarea(notesRef); }, [formData.notes]);

  // Helper to handle metadata fetch result
  const handleMetadataResult = (metadata: LinkMetadata | null) => {
    if (!metadata) {
      setMetadataError('No metadata found for this link.');
      setPreviewImageUrl(null);
      return;
    }
    setFormData(prev => ({
      ...prev,
      title: prev.title || metadata.title || '',
      notes: prev.notes || metadata.description || '',
      url: prev.url // don't overwrite url
    }));
    setPreviewImageUrl(metadata.imageUrl || null);
    setMetadataError(null);
  };

  const handleUrlBlur = async () => {
    if (formData.url && !formData.title) {
      setIsLoading(true);
      try {
        const metadata = await fetchLinkMetadata(formData.url);
        handleMetadataResult(metadata);
      } catch (error: any) {
        setMetadataError(error.message || 'Failed to fetch metadata.');
        setPreviewImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle paste event for URL input
  const handleUrlPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('Text');
    if (!validateUrl(pastedText)) return;
    setMetadataError(null);
    setIsFetchingMetadata(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const metadata = await fetchLinkMetadata(pastedText);
        handleMetadataResult(metadata);
      } catch (err: any) {
        setMetadataError(err.message || 'Could not fetch link metadata.');
        setPreviewImageUrl(null);
      } finally {
        setIsFetchingMetadata(false);
      }
    }, 300);
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value) {
      const filtered = tags.filter(tag =>
        tag.toLowerCase().includes(value.toLowerCase()) &&
        !formData.tags.includes(tag)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      if (!tags.includes(tag)) {
        addGlobalTag(tag);
      }
    }
    setTagInput('');
    setSuggestions([]);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url || !validateUrl(formData.url)) {
      return;
    }

    // Add the tagInput value if present and not already in tags
    let tagsToSave = formData.tags;
    if (tagInput && !formData.tags.includes(tagInput)) {
      tagsToSave = [...formData.tags, tagInput];
      if (!tags.includes(tagInput)) {
        addGlobalTag(tagInput);
      }
    }

    setIsLoading(true);
    
    try {
      let title = formData.title;
      
      if (!title) {
        const metadata = await fetchLinkMetadata(formData.url);
        if (metadata) {
        title = metadata.title;
        setPreviewImageUrl(metadata.imageUrl || null);
        }
      }

      addLink({
        url: normalizeUrl(formData.url),
        title: title || 'Untitled Link',
        notes: formData.notes,
        tags: tagsToSave,
        starred: false,
        favicon: previewImageUrl || undefined,
      });

      // Scroll main content into view after adding a link
      if (mainContentRef && mainContentRef.current) {
        mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Reset form
      setFormData({ url: '', title: '', notes: '', tags: [] });
      setIsExpanded(false);
      if (onClose) onClose();
      // Soft navigation to current route
      navigate(location.pathname, { replace: true });
    } catch (error) {
      console.error('Failed to add link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <div className="card overflow-hidden">
      {!isExpanded ? (
        <Button
          className="w-full text-left flex items-center gap-4 min-h-[48px] bg-input border border-input-border text-main placeholder-muted"
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => urlInputRef.current?.focus(), 100);
          }}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-input border border-input-border rounded-lg">
            <Plus className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="heading-4 text-main">Add New Link</p>
            <p className="body-sm text-main">Save a link to your collection</p>
          </div>
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="p-8 space-y-4 transition-colors duration-200 ease-in-out">
          <div className="flex items-center justify-between">
            <h3 className="heading-4 text-main">Add New Link</h3>
            <Button
              variant="secondary"
              className="p-1"
              type="button"
              onClick={() => {
                setIsExpanded(false);
                if (onClose) onClose();
              }}
            >
              <LucideX className="w-5 h-5 text-muted" />
            </Button>
          </div>

          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">
              URL *
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                ref={urlInputRef}
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                onBlur={handleUrlBlur}
                onPaste={handleUrlPaste}
                className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                placeholder="https://example.com"
                required
              />
              {(isLoading || isFetchingMetadata) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              )}
            </div>
            {previewImageUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={previewImageUrl} alt={`Preview of ${formData.title || formData.url}`} className="w-10 h-10 rounded object-cover border" />
                <span className="text-xs text-muted">Preview</span>
              </div>
            )}
            {metadataError && (
              <div className="text-sm text-blue-400 bg-blue-900/20 rounded px-3 py-2 mt-2">
                No metadata found for this link. You can add your own title and notes.
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">
              Title
            </label>
            <div className="relative">
              <textarea
                ref={titleRef}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                rows={1}
                className="w-full px-4 py-3 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
              placeholder="Link title (auto-generated if empty)"
                style={{overflow: 'hidden'}}
              />
              {formData.title && (
                <button
                  type="button"
                  aria-label="Clear Title"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, title: '' }));
                    setTimeout(() => titleRef.current?.focus(), 0);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                >
                  <LucideX className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">
              Notes
            </label>
            <div className="relative">
            <textarea
                ref={notesRef}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
                className="w-full px-4 py-3 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-[rgba(30,41,59,0.85)] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none text-base shadow-sm"
              placeholder="Add your notes or description..."
                style={{overflow: 'hidden'}}
              />
              {formData.notes && (
                <button
                  type="button"
                  aria-label="Clear Notes"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, notes: '' }));
                    setTimeout(() => notesRef.current?.focus(), 0);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                >
                  <LucideX className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">
              Tags
            </label>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <LucideX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-[rgba(30,41,59,0.85)] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-base shadow-sm"
                placeholder="Add tags (press Enter to add)"
              />
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addTag(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Link
            </Button>
            <Button
              variant="secondary"
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              type="button"
              onClick={() => {
                setIsExpanded(false);
                if (onClose) onClose();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}