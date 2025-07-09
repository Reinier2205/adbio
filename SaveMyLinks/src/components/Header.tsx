import { useState } from 'react';
import { BookMarked, Menu, Star, Clock, Share2, Import, KeyRound, Home as HomeIcon, X, Mail, User as UserIcon, LogOut } from 'lucide-react';
import { CloudSyncStatus } from './CloudSyncStatus';
import { AuthModal } from './AuthModal';
import { useApp } from '../context/AppContext';
import { ShareModal } from './ShareModal';
import { ExportImportModal } from './ExportImportModal';
import { ContactAdminModal } from './ContactAdminModal';
import { useAuth } from '../hooks/useAuth';
import { UpdateProfileModal } from './UpdateProfileModal';
import { Link } from 'react-router-dom';

// Declare global constant for Vite build version
// eslint-disable-next-line no-var
declare var __APP_VERSION__: string;

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { setShowStarredOnly, clearAllFilters, setShowRecentsOnly } = useApp();
  const [showShare, setShowShare] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <>
      <header
        style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16">
            <div className="flex items-center space-x-3">
              <img src="/SaveMyLinks/images/logo.png" alt="SaveMyLinks logo" className="w-10 h-10 rounded-xl shadow-sm bg-white object-contain" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold font-sans text-gray-900 dark:text-white truncate">
                  SaveMyLinks
                </h1>
                {user && user.user_metadata?.firstName && (
                  <p className="text-base font-semibold font-sans text-blue-600 dark:text-blue-400 mt-1 mb-2 truncate">
                    Welcome, {user.user_metadata.firstName}!
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 pr-2">
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
              <span className="text-lg font-bold font-sans text-gray-900 dark:text-white">SaveMyLinks</span>
            </div>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { clearAllFilters(); setShowRecentsOnly(false); setShowMenu(false); }}>
              <HomeIcon className="w-5 h-5" /> Home
            </button>
            {!user && (
              <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowAuthModal(true); setShowMenu(false); }}>
                <KeyRound className="w-5 h-5" /> Login
              </button>
            )}
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowProfile(true); setShowMenu(false); }}>
              <UserIcon className="w-5 h-5" /> Profile
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowStarredOnly(true); setShowRecentsOnly(false); setShowMenu(false); }}>
              <Star className="w-5 h-5" /> Favourites
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowRecentsOnly(true); setShowMenu(false); }}>
              <Clock className="w-5 h-5" /> Recents
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowShare(true); setShowMenu(false); }}>
              <Share2 className="w-5 h-5" /> Share Collection
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowExportImport(true); setShowMenu(false); }}>
              <Import className="w-5 h-5" /> Export/Import
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => { setShowContactAdmin(true); setShowMenu(false); }}>
              <Mail className="w-5 h-5" /> Contact Admin
            </button>
            <Link to="/feature-guide" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={() => setShowMenu(false)}>
              <BookMarked className="w-5 h-5" /> Feature Guide
            </Link>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-medium font-sans text-gray-900 dark:text-white transition-colors duration-200 ease-in-out active:bg-gray-100 dark:active:bg-gray-800 min-h-[44px]" onClick={async () => { setShowMenu(false); await signOut(); }}>
              <LogOut className="w-5 h-5" /> Logout
            </button>
            <span className="text-xs text-gray-400 mt-4 block text-center select-none">
              Version: {typeof __APP_VERSION__ !== 'undefined' && !isNaN(Date.parse(__APP_VERSION__))
                ? new Date(__APP_VERSION__).toLocaleString('sv-SE', { hour12: false }).replace('T', ' ').slice(0, 19)
                : 'dev'}
            </span>
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