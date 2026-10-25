import { useEffect, useState } from 'react';
import { BookMarked, Menu, Star, Clock, Share2, Import, KeyRound, Home as HomeIcon, X, Mail, User as UserIcon, LogOut, HelpCircle } from 'lucide-react';
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
  // Removed local showAuthModal state
  const [showMenu, setShowMenu] = useState(false);
  const { setShowStarredOnly, clearAllFilters, setShowRecentsOnly, darkMode, openAuthModal, closeAuthModal, showAuthModal } = useApp(); // Get showAuthModal and closeAuthModal
  const [showShare, setShowShare] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, signOut } = useAuth();
  // Removed unused navigate import

  // Dark mode is now controlled by AppContext, no direct useEffect here needed.

  return (
    <>
      <header className="sticky top-0 z-50 welcome-gradient-bg shadow header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16">
            <div className="flex items-center space-x-3">
              <img src="/images/logo.png" alt="SaveMyLinks logo" className="w-10 h-10 rounded-xl shadow-sm bg-[#181C2A] object-contain" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold font-sans truncate text-main">
                  <span>Save</span>
                  <span className="text-blue-400">My</span>
                  <span>Links</span>
                </h1>
                {user && user.user_metadata?.firstName && (
                  <p className="text-base font-semibold font-sans text-blue-400 mt-1 mb-2 truncate">
                    Welcome, {user.user_metadata.firstName}!
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 pr-2">
              <CloudSyncStatus onSignInClick={openAuthModal} />
              <button
                className="p-2 rounded-lg bg-input hover:bg-[#334155] transition-colors"
                aria-label="Open menu"
                onClick={() => setShowMenu(true)}
              >
                <Menu className="w-6 h-6 text-main" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal} // Correctly pass state from AppContext
        onClose={closeAuthModal} // Correctly pass close function from AppContext
      />

      {/* Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowMenu(false)} />
          {/* Sidebar */}
          <nav className="relative w-64 card h-full shadow-xl p-6 flex flex-col gap-2 animate-fade-in sidebar-menu">
            <button className="absolute top-4 right-4 p-2 rounded hover:bg-input" onClick={() => setShowMenu(false)} aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-8 flex items-center gap-3">
              <BookMarked className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold font-sans text-main">SaveMyLinks</span>
            </div>
            <a href="/" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]">
              <HomeIcon className="w-5 h-5" /> Home
            </a>
            <a href="/welcome.html" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => setShowMenu(false)}>
              <Import className="w-5 h-5" /> Welcome
            </a>
            <a href="/quiz.html" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => setShowMenu(false)}>
              <HelpCircle className="w-5 h-5" /> Quiz
            </a>
            {!user && (
              <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { openAuthModal(); setShowMenu(false); }}>
                <KeyRound className="w-5 h-5" /> Login
              </button>
            )}
            {user && ( // Only show these if user is logged in
              <>
                <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowProfile(true); setShowMenu(false); }}>
                  <UserIcon className="w-5 h-5" /> Profile
                </button>
                <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowStarredOnly(true); setShowRecentsOnly(false); setShowMenu(false); }}>
                  <Star className="w-5 h-5" /> Favourites
                </button>
                <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowRecentsOnly(true); setShowMenu(false); }}>
                  <Clock className="w-5 h-5" /> Recents
                </button>
                <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowShare(true); setShowMenu(false); }}>
                  <Share2 className="w-5 h-5" /> Share Collection
                </button>
                <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowExportImport(true); setShowMenu(false); }}>
                  <Import className="w-5 h-5" /> Export/Import
                </button>
              </>
            )}
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => { setShowContactAdmin(true); setShowMenu(false); }}>
              <Mail className="w-5 h-5" /> Contact Admin
            </button>
            <Link to="/feature-guide" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={() => setShowMenu(false)}>
              <BookMarked className="w-5 h-5" /> Feature Guide
            </Link>
            <button className="flex items-center gap-3 px-3 py-2 rounded hover:bg-input text-base font-medium font-sans text-main transition-colors duration-200 ease-in-out min-h-[44px]" onClick={async () => {
              try {
                await signOut();
                setTimeout(() => {
                  window.location.href = '/';
                }, 500);
              } catch (err: any) {
                if (!(err && err.name === "AuthSessionMissingError")) {
                  console.error(err);
                }
                window.location.href = '/';
              }
            }}>
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