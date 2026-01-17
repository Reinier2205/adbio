
import React from 'react';
import { WHATSAPP_LINK, WHATSAPP_NUMBER } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-text-main border-t border-gray-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Got a broken appliance?</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">Don't wait until it gets worse. Send me a photo of the issue on WhatsApp for a quick quote.</p>
          <a href={WHATSAPP_LINK} className="inline-flex items-center gap-2 text-3xl font-bold text-primary hover:text-primary-light transition-colors">
            <i className="ph-fill ph-whatsapp-logo"></i> 062 796 2943
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400 border-b border-gray-600 pb-8 mb-8">
          <div>
            <h4 className="text-white font-bold mb-2">InnoFix</h4>
            <p>Expert Appliance & Solar Repair Specialists in Sandton & Fourways.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-2">Service Hours</h4>
            <p>Mon - Fri: 08:00 - 17:00</p>
            <p>Sat: 09:00 - 13:00</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-2">Coverage</h4>
            <p>Fourways, Sandton, Bryanston,</p>
            <p>Lonehill, & surrounding areas.</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 font-sans tracking-wide">
          &copy; {new Date().getFullYear()} InnoFix Appliance & Solar. Quality workmanship guaranteed.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
