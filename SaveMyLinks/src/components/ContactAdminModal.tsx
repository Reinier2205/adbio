import React, { useState } from 'react';
import { X, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold font-sans text-gray-900 dark:text-white mb-4">Contact Admin</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-base text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-base text-green-700 dark:text-green-300">Message sent to admin!</p>
            </div>
          )}
          <div>
            <label className="block text-base font-medium font-sans text-gray-700 dark:text-gray-300 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Subject"
              required
            />
          </div>
          <div>
            <label className="block text-base font-medium font-sans text-gray-700 dark:text-gray-300 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Type your message..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !subject || !message}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span className="text-base font-medium font-sans text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              Send Message
            </span>
          </button>
        </form>
      </div>
    </div>
  );
} 