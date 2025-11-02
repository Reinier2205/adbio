import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { resetIOSZoom } from '../utils/iosZoomReset';

interface UpdateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateProfileModal({ isOpen, onClose }: UpdateProfileModalProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.user_metadata?.firstName || '');
  const [lastName, setLastName] = useState(user?.user_metadata?.lastName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(user?.user_metadata?.firstName || '');
      setLastName(user?.user_metadata?.lastName || '');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    resetIOSZoom();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({
        data: { firstName, lastName }
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-8 border-b border-card-divider">
          <h2 className="text-xl font-bold font-sans text-main mb-0">Update Profile</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="bg-danger-bg border border-danger-border rounded-lg p-4 flex items-center gap-4">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-base text-danger-text">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-success-bg border border-success-border rounded-lg p-4 flex items-center gap-4">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-base text-success-text">Profile updated!</p>
            </div>
          )}
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Email Address</label>
            <div className="w-full px-4 py-4 border border-input-border rounded-lg bg-input text-main cursor-not-allowed select-all">
              {user?.email || 'No email found'}
            </div>
          </div>
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-4 py-4 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base shadow-sm"
              placeholder="Enter your first name"
              required
            />
          </div>
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full px-4 py-4 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base shadow-sm"
              placeholder="Enter your last name"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary text-base flex items-center justify-center gap-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
} 