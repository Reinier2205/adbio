import React from 'react';

export default function FeatureGuide() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-4">SaveMyLinks – Feature Guide</h1>
      <p className="mb-6 text-gray-700 dark:text-gray-300">
        SaveMyLinks is a modern, mobile-first bookmark manager designed for seamless use on iOS, Android, and desktop. It combines the simplicity of local storage with the power of cloud sync, robust authentication, and a beautiful, iOS-inspired interface.
      </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Key Features</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
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
        <li><b>Contact & Support:</b> Contact Admin option in the menu.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">How to Use SaveMyLinks</h2>
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300">
        <li>Sign up with email/social or use locally without an account.</li>
        <li>Add links with title, notes, and tags.</li>
        <li>Edit or delete links using the three-dot menu.</li>
        <li>Star favorites, filter by tags, search instantly.</li>
        <li>Export/import your links or share your collection.</li>
        <li>Manage your profile and settings from the menu.</li>
        <li>Contact Admin for support or feedback.</li>
      </ol>
      <h2 className="text-xl font-semibold mt-8 mb-2">FAQ</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
        <li><b>Do I need an account?</b> No, you can use SaveMyLinks locally. Sign up for cloud sync and backup.</li>
        <li><b>Is my data private?</b> Yes, your links are private and only synced to your account if you sign in.</li>
        <li><b>Can I use it offline?</b> Absolutely. All features work offline; changes sync when you're back online.</li>
        <li><b>How do I export/import my links?</b> Use the Export/Import option in the menu.</li>
        <li><b>How do I contact support?</b> Use the "Contact Admin" option in the sidebar menu.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">Contact & More Info</h2>
      <p className="text-gray-700 dark:text-gray-300">
        Website: <a href="/" className="text-blue-600 dark:text-blue-400 underline">your-app-url.com</a><br />
        Support: <a href="mailto:support@your-app-url.com" className="text-blue-600 dark:text-blue-400 underline">support@your-app-url.com</a><br />
        GitHub: <a href="https://github.com/your-github-link" className="text-blue-600 dark:text-blue-400 underline">your-github-link</a>
      </p>
    </div>
  );
} 