import React from 'react';
import { MapPin, MessageCircle } from 'lucide-react';

interface HeaderProps {
  onRestart?: () => void;
  locationName?: string;
}

export const Header: React.FC<HeaderProps> = ({ onRestart, locationName }) => {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div 
          className="header-brand" 
          onClick={onRestart}
          style={{ cursor: onRestart ? 'pointer' : 'default' }}
          title="Zelebrae Pastries"
        >
          <img 
            src="/logo.png" 
            alt="Zelebrae Pastries & Cafe" 
            className="brand-logo-img" 
          />
          <div className="brand-info">
            <span className="brand-title">Zelebrae</span>
            <span className="brand-subtitle">Celebration Point</span>
          </div>
        </div>

        <div className="header-actions">
          {locationName && (
            <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
              <MapPin size={11} />
              {locationName.replace(' Celebration Point', '')}
            </span>
          )}

          <a 
            href="https://wa.me/919072333600?text=Hi%20Zelebrae%2C%20I%20have%20an%20inquiry%20regarding%20the%20Celebration%20Point." 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <MessageCircle size={20} color="#1B8755" />
          </a>
        </div>
      </div>
    </header>
  );
};
