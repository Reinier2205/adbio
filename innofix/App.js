import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar.js';
import Footer from './components/Footer.js';
import { SHOWCASE_IMAGES, WHATSAPP_LINK } from './constants.js';

const Category = {
  ALL: 'All',
  KITCHEN: 'Kitchen',
  LAUNDRY: 'Laundry',
  SOLAR: 'Solar',
  HVAC: 'HVAC'
};

const App = () => {
  const [filter, setFilter] = useState(Category.ALL);

  const filteredItems = useMemo(() => {
    if (filter === Category.ALL) return SHOWCASE_IMAGES;
    return SHOWCASE_IMAGES.filter(item => item.category === filter);
  }, [filter]);

  return React.createElement('div', { className: "min-h-screen flex flex-col bg-bg-main" },
    React.createElement(Navbar),
    
    React.createElement('main', { className: "flex-grow pt-28 pb-20" },
      // Hero Area
      React.createElement('section', { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center" },
        React.createElement('div', { className: "inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20" },
          React.createElement('span', { className: "text-primary font-mono text-xs font-bold uppercase tracking-wider" }, "Expert Repair Portfolio")
        ),
        React.createElement('h1', { className: "text-4xl md:text-5xl font-black font-heading text-text-main mb-6" },
          "Proven Results, ",
          React.createElement('span', { className: "text-primary" }, "Happy Homes.")
        ),
        React.createElement('p', { className: "max-w-2xl mx-auto text-lg text-text-muted mb-10 leading-relaxed" },
          "Take a look at some of the recent repairs I've completed across Fourways and Sandton. From complex solar systems to everyday kitchen essentials, I fix it right the first time."
        ),

        // Filter Bar
        React.createElement('div', { className: "flex flex-wrap justify-center gap-2 mb-12" },
          Object.values(Category).map((cat) =>
            React.createElement('button', {
              key: cat,
              onClick: () => setFilter(cat),
              className: `px-6 py-2 rounded-full text-sm font-bold transition-all ${
                filter === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white border border-gray-200 text-text-muted hover:border-primary hover:text-primary'
              }`
            }, cat)
          )
        )
      ),

      // Gallery Grid
      React.createElement('section', { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" },
        React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" },
          filteredItems.map((item) =>
            React.createElement('div', {
              key: item.id,
              className: "group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
            },
              // Image Container
              React.createElement('div', { className: "relative aspect-[4/3] overflow-hidden bg-gray-100" },
                React.createElement('img', {
                  src: item.fileName,
                  alt: item.title,
                  className: "w-full h-full object-cover group-hover:scale-110 transition-transform duration-700",
                  onError: (e) => {
                    e.target.src = 'https://picsum.photos/seed/' + item.id + '/800/600';
                  }
                }),
                // Category Badge
                React.createElement('div', { className: "absolute top-4 left-4" },
                  React.createElement('span', {
                    className: `px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg ${
                      item.category === Category.SOLAR 
                      ? 'bg-solar text-white' 
                      : 'bg-primary text-white'
                    }`
                  }, item.category)
                ),
                // "Fixed" Overlay
                React.createElement('div', { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" },
                  React.createElement('span', { className: "bg-white/90 backdrop-blur text-primary font-black px-6 py-2 rounded-full transform -rotate-12 border-2 border-primary scale-125" },
                    "FIXED!"
                  )
                )
              ),

              // Content
              React.createElement('div', { className: "p-6" },
                React.createElement('h3', { className: "text-xl font-bold text-text-main mb-2 group-hover:text-primary transition-colors" },
                  item.title
                ),
                React.createElement('p', { className: "text-text-muted text-sm leading-relaxed mb-4" },
                  item.description
                ),
                React.createElement('div', { className: "flex items-center justify-between pt-4 border-t border-gray-100" },
                  React.createElement('span', { className: "flex items-center gap-1 text-xs font-semibold text-text-light" },
                    React.createElement('i', { className: "ph ph-map-pin" }),
                    " Sandton / Fourways"
                  ),
                  React.createElement('a', {
                    href: WHATSAPP_LINK,
                    className: "text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                  },
                    "Ask about this ",
                    React.createElement('i', { className: "ph ph-arrow-right" })
                  )
                )
              )
            )
          )
        ),

        filteredItems.length === 0 && React.createElement('div', { className: "text-center py-20" },
          React.createElement('i', { className: "ph ph-wrench text-6xl text-gray-300 mb-4 inline-block" }),
          React.createElement('p', { className: "text-text-muted italic" }, "No items found in this category. More coming soon!")
        )
      ),

      // Motivation Section
      React.createElement('section', { className: "max-w-4xl mx-auto px-4 mt-24 text-center" },
        React.createElement('div', { className: "bg-gradient-to-br from-primary/5 to-solar/5 rounded-3xl p-10 border border-primary/10 shadow-sm" },
          React.createElement('h2', { className: "text-2xl md:text-3xl font-heading font-bold text-text-main mb-4" }, "Why choose Innocent to fix your appliances?"),
          React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-8" },
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('div', { className: "w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary" },
                React.createElement('i', { className: "ph-bold ph-check text-xl" })
              ),
              React.createElement('div', null,
                React.createElement('h4', { className: "font-bold text-text-main" }, "Transparent Pricing"),
                React.createElement('p', { className: "text-sm text-text-muted" }, "Honest quotes before work starts. No hidden \"surprise\" fees.")
              )
            ),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('div', { className: "w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary" },
                React.createElement('i', { className: "ph-bold ph-calendar text-xl" })
              ),
              React.createElement('div', null,
                React.createElement('h4', { className: "font-bold text-text-main" }, "Same Day Response"),
                React.createElement('p', { className: "text-sm text-text-muted" }, "I live in Fourways, so I'm often around the corner when you need me.")
              )
            ),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('div', { className: "w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary" },
                React.createElement('i', { className: "ph-bold ph-shield text-xl" })
              ),
              React.createElement('div', null,
                React.createElement('h4', { className: "font-bold text-text-main" }, "Quality Parts"),
                React.createElement('p', { className: "text-sm text-text-muted" }, "I only use reliable replacement parts that I'd use in my own home.")
              )
            ),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('div', { className: "w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary" },
                React.createElement('i', { className: "ph-bold ph-chat text-xl" })
              ),
              React.createElement('div', null,
                React.createElement('h4', { className: "font-bold text-text-main" }, "Direct Communication"),
                React.createElement('p', { className: "text-sm text-text-muted" }, "Speak to the technician directly, not an automated call center.")
              )
            )
          )
        )
      )
    ),

    React.createElement(Footer),

    // Floating Action Button
    React.createElement('div', { className: "fixed bottom-6 right-6 z-50 group" },
      React.createElement('a', {
        href: WHATSAPP_LINK,
        className: "relative bg-primary text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-dark transition-all duration-300 transform hover:scale-110"
      },
        React.createElement('i', { className: "ph-fill ph-whatsapp-logo text-3xl" }),
        // Pulsing indicator
        React.createElement('span', { className: "absolute inset-0 rounded-full bg-primary animate-ping opacity-25" }),
        
        // Tooltip on desktop
        React.createElement('span', { className: "absolute right-20 bg-white text-text-main px-4 py-2 rounded-lg text-sm font-bold shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-gray-200 whitespace-nowrap" },
          " Need a fix? Message me!"
        )
      )
    )
  );
};

export default App;