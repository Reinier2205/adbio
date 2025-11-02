import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const access_token = searchParams.get('access_token');
  const type = searchParams.get('type');

  useEffect(() => {
    if (!access_token || type !== 'recovery') {
      setError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, [access_token, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      if (!access_token) {
        setError('Invalid or expired reset link. Please request a new password reset.');
        setLoading(false);
        return;
      }
      // Set the session using the access_token
      const { error: sessionError } = await supabase.auth.setSession({ access_token: access_token as string, refresh_token: access_token as string });
      if (sessionError) throw sessionError;
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000); // Redirect to main page after 2s
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-input px-4">
      <div className="card rounded-xl shadow-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold mb-8 text-center text-main">Reset Your Password</h2>
        {error && <div className="mb-8 p-4 bg-red-900/30 text-red-300 rounded">{error}</div>}
        {success ? (
          <div className="mb-8 p-4 bg-green-900/30 text-green-300 rounded text-center">
            Password reset! Logging you in...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-base font-bold font-sans text-main mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-4 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-lg shadow-sm"
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-base font-bold font-sans text-main mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-4 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-lg shadow-sm"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-input text-white font-medium py-4 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        <div className="mt-8 text-center">
          <a href="/" className="text-blue-400 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
} 