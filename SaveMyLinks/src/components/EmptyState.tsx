import React from 'react';
import { BookMarked, Search, Star, Tag, Globe, Cloud, Laptop, Smartphone, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from './Button';

export function EmptyState({ onStart }: { onStart?: () => void }) {
  const { links, searchQuery, selectedTags, showStarredOnly, clearAllFilters, openAddLinkModal, openAuthModal } = useApp();
  const hasFilters = searchQuery || selectedTags.length > 0 || showStarredOnly;
  const hasLinks = links.length > 0;
  const handleStart = onStart || (() => {
    // fallback: focus the add link input if available
    const el = document.querySelector('input[type="url"]');
    if (el) (el as HTMLInputElement).focus();
  });

  if (!hasLinks) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 px-4 sm:px-8 text-main">
        {/* Hero Section */}
        <section className="w-full max-w-2xl mx-auto text-center mb-12 animate-fade-in">
          <h1 className="heading-1 mb-3 text-main">
            Declutter your digital life. Save every insight.
          </h1>
          <p className="body mb-6 max-w-xl mx-auto text-main">
            SaveMyLinks is the effortless way to store, organize, and rediscover all your valuable web links, articles, and research.
          </p>
          <Button variant="primary" className="text-lg mb-6" onClick={openAuthModal}>
            Start Organizing Now - It's Free!
          </Button>
          {/* Value Props */}
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <div className="flex items-center gap-2 body">
              <BookMarked className="w-5 h-5 text-muted" />
              Never lose a valuable link again.
            </div>
            <div className="flex items-center gap-2 body">
              <Globe className="w-5 h-5 text-muted" />
              Access your curated knowledge from anywhere.
            </div>
            <div className="flex items-center gap-2 body">
              <Search className="w-5 h-5 text-muted" />
              Find anything instantly with powerful search and tags.
            </div>
          </div>
        </section>

        {/* Feature Showcase Section */}
        <section className="w-full max-w-5xl mx-auto mb-16 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 feature-grid">
            {/* Feature 1 */}
            <div className="card flex flex-col items-center text-center p-4">
              <Tag className="w-8 h-8 text-muted mb-3" />
              <h3 className="heading-4 mb-2 text-main">Intelligent Tagging</h3>
              <p className="body mb-4 text-main">Group your links by topic, mood, or anything you like using smart, flexible tags. Instantly filter and find what you need.</p>
            </div>
            {/* Feature 2 */}
            <div className="card flex flex-col items-center text-center p-4">
              <Search className="w-8 h-8 text-muted mb-3" />
              <h3 className="heading-4 mb-2 text-main">Powerful Search</h3>
              <p className="body mb-4 text-main">Find any link, note, or tag in seconds with lightning-fast search and smart filters. Your knowledge is always at your fingertips.</p>
            </div>
            {/* Feature 3 */}
            <div className="card flex flex-col items-center text-center p-4">
              <Cloud className="w-8 h-8 text-muted mb-3" />
              <h3 className="heading-4 mb-2 text-main">Seamless Access</h3>
              <p className="body mb-4 text-main">Access your links from any device—phone, tablet, or computer. Everything is securely synced and always available.</p>
            </div>
          </div>
        </section>

        {/* Social Proof / Trust Section */}
        <section className="w-full max-w-2xl mx-auto mb-12 animate-fade-in-up">
          <div className="space-y-4">
            <div className="bg-chip rounded-xl p-4">
              <blockquote className="blockquote mb-2 text-main">"SaveMyLinks has transformed how I manage my research – truly indispensable!"</blockquote>
              <div className="text-right caption text-muted">- Thabo Mokoena</div>
            </div>
            <div className="bg-chip rounded-xl p-4">
              <blockquote className="blockquote mb-2 text-main">"I never lose important articles anymore. It's my go-to for organizing everything I find online."</blockquote>
              <div className="text-right caption text-muted">- Lettitia van der Merwe</div>
            </div>
            <div className="bg-chip rounded-xl p-4">
              <blockquote className="blockquote mb-2 text-main">"A must-have for students and professionals alike. Simple, powerful, and always reliable."</blockquote>
              <div className="text-right caption text-muted">- Kenny Naidoo</div>
            </div>
          </div>
          <div className="caption text-center text-muted">
            Your links are private and securely stored.
          </div>
        </section>

        {/* Refined Call to Action */}
        <section className="w-full max-w-2xl mx-auto text-center animate-fade-in-up">
          <h2 className="heading-2 mb-4 text-main">Ready to Get Organized?</h2>
          <Button variant="primary" className="text-lg" onClick={openAuthModal}>
            Start Saving Links Today!
          </Button>
        </section>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="heading-3 mb-2">
          No links match your filters
        </h2>
        <p className="body mb-4">
          Try adjusting your search terms or filters to find what you're looking for.
        </p>
        <Button variant="primary" className="inline-flex items-center gap-2" onClick={clearAllFilters}>
          Clear all filters
        </Button>
      </div>
    );
  }

  return null;
}