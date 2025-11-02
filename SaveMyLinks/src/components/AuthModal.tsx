import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { resetIOSZoom } from '../utils/iosZoomReset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, sendPasswordReset, sendVerificationEmail, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else {
        await signUp(email, password, firstName, lastName);
        setVerificationMode(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSent(false);
    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    setVerificationSent(false);
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'facebook') => {
    setSocialLoading(provider);
    setError('');
    try {
      await signInWithProvider(provider);
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}.`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setMode('signin');
    onClose();
    resetIOSZoom();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full p-8 shadow-xl border border-[#232946] rounded-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#334155]">
          <h1 className="heading-2 text-main drop-shadow-md">
            {verificationMode
              ? 'Verify Your Email'
              : resetMode
                ? 'Reset Password'
                : mode === 'signup'
                  ? 'Sign Up'
                  : 'Sign In'}
          </h1>
          <button onClick={onClose} className="p-2 rounded hover:bg-input transition-colors" aria-label="Close modal">
            <X className="w-6 h-6 text-muted" />
          </button>
        </div>

        {verificationMode ? (
          <div className="space-y-6">
            {error && (
              <div className="bg-danger-bg border border-danger-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                  <p className="text-base font-sans text-danger-text">{error}</p>
                </div>
              </div>
            )}
            {verificationSent && (
              <div className="bg-success-bg border border-success-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-success flex-shrink-0" />
                  <p className="text-base font-sans text-success-text">Verification email sent! Check your inbox.</p>
                </div>
              </div>
            )}
            <p className="body">A verification email has been sent to <span className="font-semibold">{email}</span>. Please check your inbox and follow the link to verify your account.</p>
            <Button variant="primary" className="w-full flex items-center justify-center gap-2" type="button" disabled={loading} onClick={handleResendVerification}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Resend Verification Email
            </Button>
            <div className="text-center">
              <Button variant="secondary" className="text-base" type="button" onClick={() => { setVerificationMode(false); setMode('signin'); setEmail(''); setPassword(''); setError(''); setVerificationSent(false); }}>
                Back to Sign In
              </Button>
            </div>
          </div>
        ) : resetMode ? (
          <form onSubmit={handleReset} className="space-y-6">
            {error && (
              <div className="bg-danger-bg border border-danger-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                  <p className="text-base font-sans text-danger-text">{error}</p>
                </div>
              </div>
            )}
            {resetSent && (
              <div className="bg-success-bg border border-success-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-success flex-shrink-0" />
                  <p className="text-base font-sans text-success-text">Password reset email sent! Check your inbox.</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-base font-bold font-sans text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            <Button variant="primary" className="w-full flex items-center justify-center gap-2" type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Send Reset Email
            </Button>
            <div className="text-center">
              <Button variant="secondary" className="text-base" type="button" onClick={() => { setResetMode(false); setResetEmail(''); setResetSent(false); setError(''); }}>
                Back to Sign In
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-danger-bg border border-danger-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                  <p className="text-base font-sans text-danger-text">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-base font-bold font-sans text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold font-sans text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-base font-bold font-sans text-white mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
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
                    className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </>
            )}

            <div className="pt-2">
              <div className="flex flex-col gap-3 mb-6">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={socialLoading !== null}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-100 text-gray-900 dark:text-gray-900 font-medium hover:bg-primary-50 dark:hover:bg-primary-100 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.68 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.19C12.13 13.6 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.43-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.64 7.01l7.19 5.6C43.98 37.13 46.1 31.36 46.1 24.55z"/><path fill="#FBBC05" d="M9.67 28.28c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.19C-1.13 17.09-1.13 30.91 1.69 37.91l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.64-2.05 15.19-5.59l-7.19-5.6c-2.01 1.35-4.6 2.14-8 2.14-6.44 0-11.87-4.1-13.33-9.78l-7.98 6.19C6.73 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
                  {socialLoading === 'google' ? 'Signing in...' : 'Sign in with Google'}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  disabled={socialLoading !== null}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-100 text-gray-900 dark:text-gray-900 font-medium hover:bg-primary-50 dark:hover:bg-primary-100 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.262.82-.582 0-.288-.012-1.243-.017-2.252-3.338.726-4.042-1.415-4.042-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.606-2.665-.304-5.466-1.332-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.984-.399 3.003-.404 1.018.005 2.046.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.625-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.699.825.58C20.565 21.796 24 17.297 24 12c0-6.63-5.373-12-12-12z"/></svg>
                  {socialLoading === 'github' ? 'Signing in...' : 'Sign in with GitHub'}
                </Button>
                {/*
                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={socialLoading !== null}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 6.019 4.438 10.987 10.125 11.854v-8.385H7.078v-3.47h3.047V9.413c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.953.926-1.953 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.563 22.987 24 18.019 24 12z"/></svg>
                  {socialLoading === 'facebook' ? 'Signing in...' : 'Sign in with Meta'}
                </button>
                */}
              </div>
            </div>

            <Button variant="primary" className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium shadow transition-colors" type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>

            <div className="text-center">
              <Button variant="secondary" className="text-base bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' 
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </Button>
              {mode === 'signin' && (
                <Button
                  type="button"
                  onClick={() => { setResetMode(true); setResetEmail(email); setResetSent(false); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium shadow transition-colors px-4 py-3 mt-2"
                >
                  Forgot password?
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}