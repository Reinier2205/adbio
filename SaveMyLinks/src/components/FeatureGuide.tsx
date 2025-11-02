import React from 'react';

export default function FeatureGuide() {
  return (
    <>
      {/* Page Title and Back to App button below global header */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-between">
        <h1 className="heading-3 text-main">Welcome to SaveMyLinks!</h1>
        <a href="https://savemylinks.pages.dev" className="btn btn-secondary">Back to App</a>
      </div>
      <div className="min-h-screen w-full welcome-gradient-bg py-16 px-4">
        <div className="max-w-2xl mx-auto card shadow-xl rounded-2xl p-8 md:p-8 p-4 relative">
          <p className="body mb-6 text-main">
            SaveMyLinks is your personal space to save, organize, and quickly find your favorite websites, videos, articles, and more. Whether you’re a social media lover, a content creator, or just someone who wants to keep their best links in one place, this app is for you!
          </p>
          <h2 className="heading-3 mt-8 mb-4 text-main">What Can You Do Here?</h2>
          <ul className="list-disc pl-4 space-y-2 body text-main">
            <li><b>Save Links:</b> Found something cool online? Add it to your collection with just a click.</li>
            <li><b>Organize with Tags:</b> Group your links by topic, mood, or anything you like using tags.</li>
            <li><b>Star Your Favorites:</b> Mark your best finds so you can get to them fast.</li>
            <li><b>Search Instantly:</b> Can’t remember where you saved that meme or recipe? Just search!</li>
            <li><b>Access Anywhere:</b> Use SaveMyLinks on your phone, tablet, or computer—your links are always with you.</li>
            <li><b>Share Collections:</b> Want to show off your favorite links? Share a collection with friends.</li>
            <li><b>Stay Private:</b> Your links are yours. Only you can see them unless you choose to share.</li>
          </ul>
          <h2 className="heading-3 mt-8 mb-4 text-main">How to Get Started</h2>
          <ol className="list-decimal pl-6 space-y-2 body text-main">
            <li>Click <b>Add New Link</b> at the top to save your first link. Paste the website address and give it a name if you want.</li>
            <li>Organize with tags, star your favorites, and use search to find anything instantly.</li>
            <li>Share collections with friends or keep them private—your choice.</li>
          </ol>
          <h3 className="heading-3 mt-8 mb-2 text-main">Frequently Asked Questions</h3>
          <ul className="list-disc pl-6 space-y-2 body text-main">
            <li><b>Do I need an account?</b> Nope! You can start saving links right away. But if you want to keep them safe and use them on other devices, sign up for free.</li>
            <li><b>Are my links private?</b> Yes! Only you can see your links unless you choose to share a collection.</li>
            <li><b>Can I use this on my phone?</b> Absolutely! SaveMyLinks works great on any device.</li>
            <li><b>How do I get help?</b> Use the "Contact Admin" option in the menu if you need support or have feedback.</li>
          </ul>
          <div className="mt-8 text-center text-sm text-muted">
            <div>Contact: <a href="mailto:reinier.olivier@gmail.com" className="text-primary hover:underline">reinier.olivier@gmail.com</a></div>
            <div>Website: <a href="https://SaveMyLinks.pages.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SaveMyLinks.pages.dev</a></div>
            <div>For technical details and information for developers/investors, see our <a href="/technical-guide" className="text-primary hover:underline">Technical Guide</a>.
              {' '}|{' '}
              <a href="/style-demo" className="text-primary hover:underline">Style Demo</a>.
            </div>
          </div>
        </div>
      </div>
      {/* Back to App Button at Bottom */}
      <div className="w-full flex justify-center py-8 gradient-bg border-t border-gray-800">
        <a href="https://savemylinks.pages.dev" className="btn btn-secondary">Back to App</a>
      </div>
    </>
  );
} 