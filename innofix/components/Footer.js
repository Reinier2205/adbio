import React from 'react';
import { WHATSAPP_LINK } from '../constants.js';

const Footer = () => {
  return React.createElement('footer', { className: "bg-text-main border-t border-gray-300 pt-16 pb-8" },
    React.createElement('div', { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" },
      React.createElement('div', { className: "mb-12" },
        React.createElement('h2', { className: "text-3xl font-bold text-white mb-4" }, "Got a broken appliance?"),
        React.createElement('p', { className: "text-gray-400 mb-6 max-w-lg mx-auto" }, "Don't wait until it gets worse. Send me a photo of the issue on WhatsApp for a quick quote."),
        React.createElement('a', { 
          href: WHATSAPP_LINK, 
          className: "inline-flex items-center gap-2 text-3xl font-bold text-primary hover:text-primary-light transition-colors" 
        },
          React.createElement('i', { className: "ph-fill ph-whatsapp-logo" }),
          " 062 796 2943"
        )
      ),

      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400 border-b border-gray-600 pb-8 mb-8" },
        React.createElement('div', null,
          React.createElement('h4', { className: "text-white font-bold mb-2" }, "InnoFix"),
          React.createElement('p', null, "Expert Appliance & Solar Repair Specialists in Sandton & Fourways.")
        ),
        React.createElement('div', null,
          React.createElement('h4', { className: "text-white font-bold mb-2" }, "Service Hours"),
          React.createElement('p', null, "Mon - Fri: 08:00 - 17:00"),
          React.createElement('p', null, "Sat: 09:00 - 13:00")
        ),
        React.createElement('div', null,
          React.createElement('h4', { className: "text-white font-bold mb-2" }, "Coverage"),
          React.createElement('p', null, "Fourways, Sandton, Bryanston,"),
          React.createElement('p', null, "Lonehill, & surrounding areas.")
        )
      ),

      React.createElement('p', { className: "text-xs text-gray-500 font-sans tracking-wide" },
        `© ${new Date().getFullYear()} InnoFix Appliance & Solar. Quality workmanship guaranteed.`
      )
    )
  );
};

export default Footer;