import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AddLinkForm } from './components/AddLinkForm';
import { SearchAndFilters } from './components/SearchAndFilters';
import { LinkList } from './components/LinkList';
import { ExportImportModal } from './components/ExportImportModal';
import { ShareModal } from './components/ShareModal';
import { SharedCollectionView } from './components/SharedCollectionView';
import { AppProvider } from './context/AppContext';

function AppContent() {
  const [showExportImport, setShowExportImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'share'>('main');
  const [shareId, setShareId] = useState<string>('');

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <AddLinkForm />
          <SearchAndFilters />
          <LinkList />
        </div>
      </main>

      <ExportImportModal
        isOpen={showExportImport}
        onClose={() => setShowExportImport(false)}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;