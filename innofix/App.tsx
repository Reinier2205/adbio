
import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { SHOWCASE_IMAGES, WHATSAPP_LINK } from './constants';
import { Category, GalleryItem } from './types';

const App: React.FC = () => {
  const [filter, setFilter] = useState<Category>(Category.ALL);

  const filteredItems = useMemo(() => {
    if (filter === Category.ALL) return SHOWCASE_IMAGES;
    return SHOWCASE_IMAGES.filter(item => item.category === filter);
  }, [filter]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-main">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        {/* Hero Area */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-primary font-mono text-xs font-bold uppercase tracking-wider">Expert Repair Portfolio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-heading text-text-main mb-6">
            Proven Results, <span className="text-primary">Happy Homes.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-text-muted mb-10 leading-relaxed">
            Take a look at some of the recent repairs I've completed across Fourways and Sandton. From complex solar systems to everyday kitchen essentials, I fix it right the first time.
          </p>

          {/* Filter Bar */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {Object.values(Category).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  filter === cat
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white border border-gray-200 text-text-muted hover:border-primary hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={item.fileName}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://picsum.photos/seed/' + item.id + '/800/600';
                    }}
                  />
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg ${
                      item.category === Category.SOLAR 
                      ? 'bg-solar text-white' 
                      : 'bg-primary text-white'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  {/* "Fixed" Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-white/90 backdrop-blur text-primary font-black px-6 py-2 rounded-full transform -rotate-12 border-2 border-primary scale-125">
                      FIXED!
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-text-main mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-xs font-semibold text-text-light">
                      <i className="ph ph-map-pin"></i> Sandton / Fourways
                    </span>
                    <a 
                      href={WHATSAPP_LINK}
                      className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Ask about this <i className="ph ph-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20">
              <i className="ph ph-wrench text-6xl text-gray-300 mb-4 inline-block"></i>
              <p className="text-text-muted italic">No items found in this category. More coming soon!</p>
            </div>
          )}
        </section>

        {/* Motivation Section */}
        <section className="max-w-4xl mx-auto px-4 mt-24 text-center">
            <div className="bg-gradient-to-br from-primary/5 to-solar/5 rounded-3xl p-10 border border-primary/10 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-main mb-4">Why choose Innocent to fix your appliances?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-8">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <i className="ph-bold ph-check text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main">Transparent Pricing</h4>
                            <p className="text-sm text-text-muted">Honest quotes before work starts. No hidden "surprise" fees.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <i className="ph-bold ph-calendar text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main">Same Day Response</h4>
                            <p className="text-sm text-text-muted">I live in Fourways, so I'm often around the corner when you need me.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <i className="ph-bold ph-shield text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main">Quality Parts</h4>
                            <p className="text-sm text-text-muted">I only use reliable replacement parts that I'd use in my own home.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <i className="ph-bold ph-chat text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main">Direct Communication</h4>
                            <p className="text-sm text-text-muted">Speak to the technician directly, not an automated call center.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </main>

      <Footer />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <a 
          href={WHATSAPP_LINK}
          className="relative bg-primary text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-dark transition-all duration-300 transform hover:scale-110"
        >
          <i className="ph-fill ph-whatsapp-logo text-3xl"></i>
          {/* Pulsing indicator */}
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25"></span>
          
          {/* Tooltip on desktop */}
          <span className="absolute right-20 bg-white text-text-main px-4 py-2 rounded-lg text-sm font-bold shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-gray-200 whitespace-nowrap">
             Need a fix? Message me!
          </span>
        </a>
      </div>
    </div>
  );
};

export default App;
