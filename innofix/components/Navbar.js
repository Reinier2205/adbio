import React, { useState } from 'react';
import Logo from './Logo.js';
import { WHATSAPP_LINK } from '../constants.js';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return React.createElement('nav', { className: "fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300" },
    React.createElement('div', { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" },
      React.createElement('div', { className: "flex items-center justify-between h-20" },
        React.createElement(Logo),
        
        React.createElement('div', { className: "hidden md:flex items-center space-x-8" },
          React.createElement('a', { 
            href: "InnoFix.html", 
            className: "text-text-muted hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors" 
          }, "Home"),
          React.createElement('span', { className: "text-primary font-bold px-3 py-2 text-sm" }, "Our Work"),
          React.createElement('a', { 
            href: WHATSAPP_LINK, 
            target: "_blank", 
            rel: "noopener noreferrer", 
            className: "bg-primary border border-primary text-white hover:bg-primary-dark px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2" 
          },
            React.createElement('i', { className: "ph-bold ph-whatsapp-logo text-lg" }),
            " WhatsApp Me"
          )
        ),

        React.createElement('div', { className: "md:hidden" },
          React.createElement('button', { 
            onClick: () => setIsOpen(!isOpen), 
            className: "text-primary hover:text-primary-dark focus:outline-none p-2" 
          },
            React.createElement('i', { className: `ph-bold ${isOpen ? 'ph-x' : 'ph-list'} text-2xl` })
          )
        )
      )
    ),

    isOpen && React.createElement('div', { className: "md:hidden bg-white border-b border-gray-200 shadow-lg animate-in slide-in-from-top duration-300" },
      React.createElement('div', { className: "px-2 pt-2 pb-3 space-y-1 sm:px-3" },
        React.createElement('a', { 
          href: "InnoFix.html", 
          className: "text-text-muted hover:text-primary block px-3 py-2 rounded-md text-base font-medium" 
        }, "Home"),
        React.createElement('span', { className: "text-primary block px-3 py-2 rounded-md text-base font-bold" }, "Our Work Gallery"),
        React.createElement('a', { 
          href: WHATSAPP_LINK, 
          className: "text-primary block px-3 py-2 rounded-md text-base font-bold flex items-center gap-2" 
        },
          React.createElement('i', { className: "ph-fill ph-whatsapp-logo" }),
          " Chat on WhatsApp"
        )
      )
    )
  );
};

export default Navbar;