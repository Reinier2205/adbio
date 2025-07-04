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
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <CloudOff className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Local only</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Cloud className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">Synced</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSignInClick}
      className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
    >
      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm text-blue-700 dark:text-blue-300">Sign in to sync</span>
    </button>
  );
}