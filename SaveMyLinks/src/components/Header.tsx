import React, { useState } from 'react';
import { Moon, Sun, BookMarked } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CloudSyncStatus } from './CloudSyncStatus';
import { AuthModal } from './AuthModal';

export function Header() {
  const { darkMode, toggleDarkMode } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                <BookMarked className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  SaveMyLinks
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your personal bookmark manager
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CloudSyncStatus onSignInClick={() => setShowAuthModal(true)} />
              
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}