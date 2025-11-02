import React from 'react';

export default function TechnicalGuide() {
  return (
    <>
      {/* Page Title and Back to App button below global header */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-between">
        <h1 className="heading-3 text-main">Technical & Investor Guide</h1>
        <a href="https://savemylinks.pages.dev" className="btn btn-secondary">Back to App</a>
      </div>
      <div className="min-h-screen w-full welcome-gradient-bg py-16 px-4">
        <div className="max-w-2xl mx-auto card shadow-xl rounded-2xl p-8 md:p-8 p-4 relative">
        <section className="mb-6">
          <h2 className="heading-3 mb-4 text-main">Overview</h2>
          <p className="body text-main">
            SaveMyLinks is a modern, cloud-enabled bookmark manager built with React, Vite, TailwindCSS, and Supabase. It offers secure, real-time link management, user authentication, and cloud sync features.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="heading-3 mb-4 text-main">Key Technical Features</h2>
          <ul className="list-disc pl-6 space-y-2 body text-main">
            <li><b>Modern, Responsive UI:</b> iOS-inspired design, dark mode, mobile-first, large tap targets.</li>
            <li><b>Sidebar Menu & Navigation:</b> Hamburger menu, sticky header, easy access to all features.</li>
            <li><b>Link Management:</b> Add, edit, delete, star, tag, and organize links. Three-dot menu for actions.</li>
            <li><b>Search & Filtering:</b> Instant search, tag filtering, favorites, and recents.</li>
            <li><b>Cloud Sync & Local Use:</b> Use with or without an account, offline support, cloud backup for signed-in users.</li>
            <li><b>Authentication & Profile:</b> Email/password, social login, profile management, email verification.</li>
            <li><b>Export, Import, and Sharing:</b> Export/import links, share collections with a public link.</li>
            <li><b>User Experience & Performance:</b> Lazy loading, skeleton loaders, haptic feedback, smooth transitions.</li>
            <li><b>Accessibility & Usability:</b> Large tap targets, color contrast, keyboard navigation.</li>
            <li><b>Connectivity Awareness:</b> Offline banner, error handling, retry sync.</li>
            <li><b>Versioning & Updates:</b> Build version and timestamp in the sidebar.</li>
          </ul>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Architecture</h3>
          <p className="body text-main">
            The app is a single-page application (SPA) with client-side routing. All user data is stored securely in Supabase, with Row Level Security (RLS) enabled. Authentication supports email/password and social logins (Google, GitHub).
          </p>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Supabase Integration</h3>
          <ul className="list-disc pl-6 space-y-2 body text-main">
            <li>Uses <code>@supabase/supabase-js</code> for all database and auth operations</li>
            <li>Cloud sync for links, user profiles, and settings</li>
            <li>Row Level Security (RLS) and policies for user data isolation</li>
          </ul>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Environment Variables</h3>
          <ul className="list-disc pl-6 space-y-2 body text-main">
            <li><code>VITE_SUPABASE_URL</code>: Supabase project URL</li>
            <li><code>VITE_SUPABASE_ANON_KEY</code>: Supabase anon/public API key</li>
          </ul>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Deployment</h3>
          <p className="body text-main">
            The app is designed for easy deployment on platforms like Vercel, Netlify, or Cloudflare Pages. Static assets are served from the <code>public</code> folder. Environment variables must be set in the deployment platform.
          </p>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Business & Investor Information</h3>
          <p className="body text-main">
            SaveMyLinks targets users who want a secure, cloud-synced, and user-friendly bookmark manager. The architecture is scalable and can support premium features, team plans, and integrations with other platforms.
          </p>
        </section>
        <section className="mb-6">
          <h3 className="heading-3 mb-2 text-main">Contact</h3>
          <p className="body text-main">Email: <a href="mailto:reinier.olivier@gmail.com" className="text-primary hover:underline">reinier.olivier@gmail.com</a></p>
          <p className="body text-main">Website: <a href="https://SaveMyLinks.pages.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SaveMyLinks.pages.dev</a></p>
        </section>
        </div>
      </div>
      {/* Back to App Button at Bottom */}
      <div className="w-full flex justify-center py-8 gradient-bg border-t border-gray-800">
        <a href="https://savemylinks.pages.dev" className="btn btn-secondary">Back to App</a>
      </div>
    </>
  );
} 