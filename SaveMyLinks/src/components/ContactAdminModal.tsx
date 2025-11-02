import React, { useState } from 'react';
import { X, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { resetIOSZoom } from '../utils/iosZoomReset';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactAdminModal({ isOpen, onClose }: ContactAdminModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      setLoading(false);
      return;
    }
    try {
      const body = JSON.stringify({
        to: 'reinier.olivier@gmail.com',
        subject: subject.trim(),
        html: `<p>${message.trim().replace(/\n/g, '<br/>')}</p>`
      });
      const response = await fetch('https://mflcvdcdqnqwnitwemih.supabase.co/functions/v1/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to send message.');
      }
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetIOSZoom();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-8 border-b border-card-divider">
          <h1 className="heading-3 mb-8">Contact Admin</h1>
          <Button
            variant="secondary"
            className="p-2"
            type="button"
            onClick={handleClose}
          >
            <X className="w-5 h-5 text-muted" />
          </Button>
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
              <p className="text-base text-success-text">Message sent to admin!</p>
            </div>
          )}
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-[rgba(30,41,59,0.85)] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-base shadow-sm"
              placeholder="Subject"
              required
            />
          </div>
          <div>
            <label className="block text-base font-bold font-sans text-white mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-4 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-[rgba(30,41,59,0.85)] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-base shadow-sm"
              placeholder="Type your message..."
              required
            />
          </div>
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-4"
            type="submit"
            disabled={loading || !subject || !message}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span className="body">
              Send Message
            </span>
          </Button>
        </form>
      </div>
    </div>
  );
} 