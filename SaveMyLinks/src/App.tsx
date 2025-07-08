import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { AddLinkForm } from './components/AddLinkForm';
import { SearchAndFilters } from './components/SearchAndFilters';
import { LinkList } from './components/LinkList';
import { SharedCollectionView } from './components/SharedCollectionView';
import { AppProvider } from './context/AppContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ResetPassword from './components/ResetPassword';
import FeatureGuide from './components/FeatureGuide';

const ExportImportModal = lazy(() => import('./components/ExportImportModal'));
const ShareModal = lazy(() => import('./components/ShareModal'));

function AppContent() {
  const [showExportImport, setShowExportImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'share'>('main');
  const [shareId, setShareId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  const handleBackToMain = () => {
    window.history.pushState(null, '', window.location.pathname);
    setCurrentView('main');
    setShareId('');
  };

  if (currentView === 'share' && shareId) {
    return <SharedCollectionView shareId={shareId} onBack={handleBackToMain} />;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <Header />
      <div style={{ height: '2000px', background: '#f3f4f6' }} />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/feature-guide" element={<FeatureGuide />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;