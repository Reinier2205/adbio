import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Header } from './components/Header';
import { AddLinkForm } from './components/AddLinkForm';
import { SearchAndFilters } from './components/SearchAndFilters';
import { LinkList } from './components/LinkList';
import { SharedCollectionView } from './components/SharedCollectionView';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ResetPassword from './components/ResetPassword';
import FeatureGuide from './components/FeatureGuide';
import TechnicalGuide from './components/TechnicalGuide';
import StyleDemo from './components/StyleDemo';
import { MainContentScrollContext } from './components/AddLinkForm';
import { useApp } from './context/AppContext'; // Import useApp

const ExportImportModal = lazy(() => import('./components/ExportImportModal').then(module => ({ default: module.ExportImportModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then(module => ({ default: module.ShareModal })));

function AppContent() {
  const [showExportImport, setShowExportImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'share'>('main');
  const [shareId, setShareId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const mainContentRef = useRef<HTMLElement>(null);
  const { user } = useApp(); // Get user from AppContext

  // Handle routing for shared collections
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/share/')) {
        const id = hash.substring(8);
        setShareId(id);
        setCurrentView('share');
      } else {
        setCurrentView('main');
        setShareId('');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, []);

  const handleBackToMain = () => {
    window.history.pushState(null, '', window.location.pathname);
    setCurrentView('main');
    setShareId('');
  };

  if (currentView === 'share' && shareId) {
    return <SharedCollectionView shareId={shareId} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen gradient-bg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* <Header /> -- removed to prevent double header */}
      <main ref={mainContentRef} className="flex-1 max-w-3xl mx-auto p-4 w-full">
        <MainContentScrollContext.Provider value={mainContentRef}>
          {user && <AddLinkForm />} {/* Conditionally render AddLinkForm */}
        </MainContentScrollContext.Provider>
        {user && <SearchAndFilters />} {/* Conditionally render SearchAndFilters */}
        <LinkList />
      </main>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#181C2A] via-[#232946] to-[#1a1a2e] text-main">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/feature-guide" element={<FeatureGuide />} />
          <Route path="/technical-guide" element={<TechnicalGuide />} />
          <Route path="/style-demo" element={<StyleDemo />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;