import React, { useState } from 'react';
import { BookMarked, Menu, Star, Clock, Share2, Import, KeyRound, LogOut, Home as HomeIcon, X, Mail, User as UserIcon } from 'lucide-react';
import { CloudSyncStatus } from './CloudSyncStatus';
import { AuthModal } from './AuthModal';
import { useApp } from '../context/AppContext';
import { ShareModal } from './ShareModal';
import { ExportImportModal } from './ExportImportModal';
import { ContactAdminModal } from './ContactAdminModal';
import { useAuth } from '../hooks/useAuth';
import { UpdateProfileModal } from './UpdateProfileModal';

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { setShowStarredOnly, clearAllFilters, setShowRecentsOnly } = useApp();
  const [showShare, setShowShare] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();

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
                {user && user.user_metadata?.firstName && (
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    Welcome, {user.user_metadata.firstName}!
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CloudSyncStatus onSignInClick={() => setShowAuthModal(true)} />
              
              <button
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Open menu"
                onClick={() => setShowMenu(true)}
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60" onClick={() => setShowMenu(false)} />
          {/* Sidebar */}
          <nav className="relative w-64 bg-white dark:bg-gray-900 h-full shadow-xl p-6 flex flex-col gap-2 animate-fade-in">
            <button className="absolute top-4 right-4 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setShowMenu(false)} aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-8 flex items-center gap-3">
              <BookMarked className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">SaveMyLinks</span>
            </div>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { clearAllFilters(); setShowRecentsOnly(false); setShowMenu(false); }}>
              <HomeIcon className="w-5 h-5" /> Home
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowStarredOnly(true); setShowRecentsOnly(false); setShowMenu(false); }}>
              <Star className="w-5 h-5" /> Favourites
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowRecentsOnly(true); setShowMenu(false); }}>
              <Clock className="w-5 h-5" /> Recents
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowShare(true); setShowMenu(false); }}>
              <Share2 className="w-5 h-5" /> Share Collection
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowExportImport(true); setShowMenu(false); }}>
              <Import className="w-5 h-5" /> Export/Import
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowProfile(true); setShowMenu(false); }}>
              <UserIcon className="w-5 h-5" /> Profile
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white" onClick={() => { setShowContactAdmin(true); setShowMenu(false); }}>
              <Mail className="w-5 h-5" /> Contact Admin
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white mt-auto" onClick={() => setShowMenu(false)}>
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </nav>
        </div>
      )}

      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} />
      <ExportImportModal isOpen={showExportImport} onClose={() => setShowExportImport(false)} />
      {showContactAdmin && (
        <ContactAdminModal isOpen={showContactAdmin} onClose={() => setShowContactAdmin(false)} />
      )}
      {showProfile && (
        <UpdateProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}