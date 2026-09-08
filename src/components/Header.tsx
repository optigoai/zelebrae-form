import React from 'react';
import { CalendarCheck } from 'lucide-react';

export const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    <path
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"
      fill="#25D366"
    />
    <path
      d="M17.53 14.37C17.23 14.22 15.75 13.49 15.47 13.39C15.19 13.29 14.99 13.24 14.79 13.54C14.59 13.84 14.02 14.52 13.84 14.72C13.66 14.92 13.49 14.95 13.19 14.8C12.89 14.65 11.92 14.33 10.77 13.31C9.88 12.51 9.28 11.52 9.1 11.22C8.92 10.92 9.08 10.76 9.23 10.61C9.37 10.48 9.53 10.26 9.68 10.09C9.83 9.92 9.88 9.79 9.98 9.59C10.08 9.39 10.03 9.22 9.96 9.07C9.88 8.92 9.28 7.44 9.03 6.84C8.79 6.25 8.54 6.33 8.36 6.32C8.18 6.31 7.98 6.31 7.78 6.31C7.58 6.31 7.26 6.39 6.98 6.69C6.7 6.99 5.93 7.72 5.93 9.2C5.93 10.68 7.01 12.11 7.16 12.31C7.31 12.51 9.28 15.55 12.3 16.85C13.02 17.16 13.58 17.35 14.02 17.49C14.74 17.72 15.4 17.69 15.92 17.61C16.5 17.52 17.7 16.88 17.95 16.18C18.2 15.48 18.2 14.88 18.13 14.75C18.05 14.62 17.85 14.52 17.53 14.37Z"
      fill="white"
    />
  </svg>
);

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
            className="btn btn-ghost btn-header-whatsapp"
            style={{ padding: '0.25rem', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon size={26} />
          </a>
        </div>
      </div>
    </header>
  );
};
