import React from 'react';
import { Cloud, CloudOff, Wifi, WifiOff, User, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface CloudSyncStatusProps {
  onSignInClick: () => void;
}

export function CloudSyncStatus({ onSignInClick }: CloudSyncStatusProps) {
  const { user, signOut, isSupabaseConfigured } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-chip rounded-lg">
        <CloudOff className="w-4 h-4 text-muted" />
        <span className="body-sm text-main">Local only</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-chip rounded-lg">
          <Cloud className="w-4 h-4 text-blue-400" />
          <span className="body-sm text-main">Synced</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onSignInClick}
      className="flex items-center gap-2 px-4 py-2 bg-chip hover:bg-[#334155] rounded-lg transition-colors"
    >
      <User className="w-4 h-4 text-blue-400" />
      <span className="body-sm text-main">Sign in to sync</span>
    </button>
  );
}