import React from 'react';
import { MessageCircle, CalendarCheck } from 'lucide-react';

interface HeaderProps {
  onRestart?: () => void;
  whatsappNumber?: string;
  onOpenManageBookings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRestart,
  whatsappNumber = '918585855859',
  onOpenManageBookings
}) => {
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
          {onOpenManageBookings && (
            <button
              type="button"
              className="btn btn-manage-header"
              onClick={onOpenManageBookings}
              title="Look up and manage your celebration bookings"
              aria-label="Check Booking"
            >
              <CalendarCheck size={15} strokeWidth={2.2} />
              <span>Cancel Booking</span>
            </button>
          )}

          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20Zelebrae%2C%20I%20have%20an%20inquiry%20regarding%20the%20Celebration%20Point.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <MessageCircle size={20} color="#25D366" />
          </a>
        </div>
      </div>
    </header>
  );
};
