import React, { useState } from 'react';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { Smartphone, ExternalLink, AlertCircle } from 'lucide-react';
import { hashToken } from '../utils/tokenHash';

const IOS_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/9842e1a963c340048c8a254b08611a5e';

interface ApiAccessSectionProps {
  user: User | null;
  supabase: SupabaseClient | null;
  onUserUpdated?: () => void;
}

export function ApiAccessSection({ user, supabase, onUserUpdated }: ApiAccessSectionProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'revoking' | 'error'>('idle');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const tokenGeneratedAt: string | undefined = user?.user_metadata?.api_token_generated_at;

  const formattedDate = tokenGeneratedAt
    ? new Date(tokenGeneratedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Task 8 — Token generation (Requirements 5.1–5.5)
  const handleGenerateToken = async () => {
    if (!supabase) return;

    // Requirement 5.5 — warn if token already exists
    if (tokenGeneratedAt) {
      const confirmed = window.confirm(
        'Generating a new token will immediately invalidate your existing token. Any iOS Shortcuts using the old token will stop working. Continue?'
      );
      if (!confirmed) return;
    }

    setStatus('generating');
    setError('');
    setGeneratedToken(null);

    try {
      // Requirement 5.1 — generate 32 random bytes client-side
      const rawBytes = crypto.getRandomValues(new Uint8Array(32));

      // The hex string is what the user copies and pastes into the iOS Shortcut
      const tokenHex = Array.from(rawBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Requirement 5.2 — hash the raw bytes; only the hash goes to Supabase
      const tokenHash = await hashToken(rawBytes);

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          api_token_hash: tokenHash,
          api_token_generated_at: new Date().toISOString(),
        },
      });

      if (updateError) throw updateError;

      // Requirement 5.3 — show the raw token exactly once
      setGeneratedToken(tokenHex);
      setStatus('idle');
      onUserUpdated?.();
    } catch (err: unknown) {
      // Requirement 5.4 — don't show token on failure
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to generate token');
      setGeneratedToken(null);
    }
  };

  // Task 9 — Token revocation (Requirements 7.1–7.3)
  const handleRevokeToken = async () => {
    if (!supabase) return;

    // Requirement 7.1
    setStatus('revoking');
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          api_token_hash: null,
          api_token_generated_at: null,
        },
      });

      if (updateError) throw updateError;

      // Requirement 7.2 — clear generated token display if still visible
      setGeneratedToken(null);
      setStatus('idle');
      onUserUpdated?.();
    } catch (err: unknown) {
      // Requirement 7.3 — leave existing token state unchanged on failure
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    }
  };

  return (
    <div className="space-y-6">
      {/* Divider */}
      <div className="border-t border-[#334155]" />

      {/* Section heading */}
      <div className="flex items-center gap-3">
        <Smartphone className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <h3 className="text-base font-bold font-sans text-white">API Access</h3>
      </div>

      {/* Token status — reads api_token_generated_at; never displays api_token_hash */}
      <div className="px-4 py-3 rounded-lg bg-input border border-input-border">
        {formattedDate ? (
          <p className="text-base text-main">
            Token active since{' '}
            <span className="font-medium text-white">{formattedDate}</span>
          </p>
        ) : (
          <p className="text-base text-muted">No token configured</p>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-danger-bg border border-danger-border rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-base text-danger-text">{error}</p>
        </div>
      )}

      {/* One-time token display — shown immediately after generation (Requirement 5.3) */}
      {generatedToken && (
        <div className="space-y-3 p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-yellow-300">
              Store this token now — it cannot be retrieved again.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={generatedToken}
              className="flex-1 px-3 py-2 rounded-lg bg-input border border-input-border text-white font-mono text-sm focus:outline-none"
              onFocus={e => e.target.select()}
              aria-label="API token — copy this value"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedToken)}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setGeneratedToken(null)}
              className="px-3 py-2 rounded-lg border border-input-border hover:bg-input text-muted hover:text-white text-sm transition-colors"
              aria-label="Dismiss token"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          disabled={status === 'generating' || status === 'revoking'}
          onClick={handleGenerateToken}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'generating' ? 'Generating…' : 'Generate Token'}
        </button>

        {tokenGeneratedAt && (
          <button
            type="button"
            disabled={status === 'generating' || status === 'revoking'}
            onClick={handleRevokeToken}
            className="px-4 py-2 border border-danger-border rounded-lg hover:bg-danger-bg text-danger-text font-medium transition-colors text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'revoking' ? 'Revoking…' : 'Revoke Token'}
          </button>
        )}
      </div>

      {/* iOS Shortcut Setup — always visible (Requirement 8.x) */}
      <div className="space-y-4">
        <h4 className="text-base font-bold font-sans text-white">iOS Shortcut Setup</h4>
        <ol className="space-y-2 list-none">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <span className="text-base text-main">Generate an API token below</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <span className="text-base text-main">
              Copy the token when shown (it cannot be retrieved again)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold flex items-center justify-center mt-0.5">
              3
            </span>
            <span className="text-base text-main">
              Open the iOS Shortcut:{' '}
              <a
                href={IOS_SHORTCUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 transition-colors"
              >
                Get Shortcut
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold flex items-center justify-center mt-0.5">
              4
            </span>
            <span className="text-base text-main">
              Paste the token into the Shortcut configuration
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold flex items-center justify-center mt-0.5">
              5
            </span>
            <span className="text-base text-main">
              Use &ldquo;Save to SaveMyLinks&rdquo; from the Share Sheet in Safari
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
