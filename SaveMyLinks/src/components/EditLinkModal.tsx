import React, { useState, useEffect, useRef } from 'react';
import { X as LucideX, Link as LinkIcon, Tag, Loader2, Save } from 'lucide-react';
import { SavedLink } from '../types';
import { useApp } from '../context/AppContext';
import { validateUrl, normalizeUrl } from '../utils/linkUtils';
import { resetIOSZoom } from '../utils/iosZoomReset';
import { useNavigate, useLocation } from 'react-router-dom';

interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: SavedLink;
}

export function EditLinkModal({ isOpen, onClose, link }: EditLinkModalProps) {
  const { updateLink, tags, addGlobalTag } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    notes: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  };

  // Initialize form data when modal opens or link changes
  useEffect(() => {
    if (isOpen && link) {
      setFormData({
        url: link.url,
        title: link.title,
        notes: link.notes || '',
        tags: [...link.tags]
      });
    }
  }, [isOpen, link]);

  useEffect(() => { resizeTextarea(titleRef); }, [formData.title]);
  useEffect(() => { resizeTextarea(notesRef); }, [formData.notes]);

  if (!isOpen) return null;

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
      await updateLink(link.id, {
        url: normalizeUrl(formData.url),
        title: formData.title || 'Untitled Link',
        notes: formData.notes,
        tags: tagsToSave
      });
      onClose();
      // Soft navigation to current route
      navigate(location.pathname, { replace: true });
    } catch (error) {
      console.error('Failed to update link:', error);
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

  const handleClose = () => {
    onClose();
    resetIOSZoom();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full p-8 shadow-xl border border-[#232946] rounded-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#334155]">
          <h2 className="heading-2 text-main">Edit Link</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-input transition-colors" aria-label="Close modal">
            <LucideX className="w-6 h-6 text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Title</label>
            <input type="text" className="w-full pl-4 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Link title" required />
          </div>
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">URL</label>
            <input type="url" className="w-full pl-4 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base" value={formData.url} onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))} placeholder="https://example.com" required />
          </div>
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Notes</label>
            <textarea className="w-full pl-4 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes about this link" rows={3} />
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
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-chip text-chip"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-blue-400"
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
                className="w-full pl-4 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                placeholder="Add tags (press Enter to add)"
              />
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-input border border-input-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addTag(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-card-hover text-main"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-input-border">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-input text-white font-medium py-3 px-4 rounded-lg transition-colors text-base flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-3 border border-input-border rounded-lg hover:bg-card-hover text-main font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditLinkModal;