import React, { useState, useRef } from 'react';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  QrCode, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  ZoomIn, 
  X,
  CreditCard
} from 'lucide-react';
import { compressPaymentImage } from '../utils/imageUtils';

interface StepCustomerDetailsProps {
  name: string;
  customerLocation: string;
  countryCode: string;
  whatsapp: string;
  email: string;
  additionalRequirements: string;
  paymentScreenshot?: string;
  paymentScreenshotName?: string;
  onChangeField: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export const StepCustomerDetails: React.FC<StepCustomerDetailsProps> = ({
  name,
  customerLocation,
  countryCode,
  whatsapp,
  email,
  additionalRequirements,
  paymentScreenshot,
  paymentScreenshotName,
  onChangeField,
  errors
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiId = 'pinelabs.stq3698549@pineaxis';

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2200);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = upiId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2200);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsCompressing(true);

    try {
      const processed = await compressPaymentImage(file);
      onChangeField('paymentScreenshot', processed.base64);
      onChangeField('paymentScreenshotName', processed.fileName);
    } catch (err: any) {
      setUploadError(err.message || 'Could not process image. Please try another screenshot.');
    } finally {
      setIsCompressing(false);
      // Reset input value so same file can be re-uploaded if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveScreenshot = () => {
    onChangeField('paymentScreenshot', '');
    onChangeField('paymentScreenshotName', '');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Step 5 of 5
        </span>
        <h1 className="step-title">Customer Details & Advance Payment</h1>
        <p className="step-subtitle">
          Please provide your contact details and complete the ₹500 slot confirmation advance payment.
        </p>
      </div>

      <div className="form-card">
        {/* Full Name */}
        <div className="input-group">
          <label htmlFor="fullNameInput" className="input-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="#592F7C" />
              Full Name <span className="required-star">*</span>
            </span>
          </label>
          <input
            id="fullNameInput"
            type="text"
            className={`input-field ${errors.name ? 'error' : ''}`}
            placeholder="e.g. Rahul"
            value={name}
            onChange={(e) => onChangeField('name', e.target.value)}
            autoComplete="name"
          />
          {errors.name && <span className="input-error-msg">{errors.name}</span>}
        </div>

        {/* Customer Location */}
        <div className="input-group">
          <label htmlFor="customerLocationInput" className="input-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={15} color="#592F7C" />
              Your City / Area <span className="required-star">*</span>
            </span>
          </label>
          <input
            id="customerLocationInput"
            type="text"
            className={`input-field ${errors.customerLocation ? 'error' : ''}`}
            placeholder="e.g. Ashokapuram, Kozhikode"
            value={customerLocation}
            onChange={(e) => onChangeField('customerLocation', e.target.value)}
            autoComplete="address-level2"
          />
          {errors.customerLocation && (
            <span className="input-error-msg">{errors.customerLocation}</span>
          )}
        </div>

        {/* WhatsApp Number with Country Code */}
        <div className="input-group">
          <label htmlFor="whatsappInput" className="input-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={15} color="#592F7C" />
              WhatsApp Number <span className="required-star">*</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-brand-rose)', fontWeight: 600 }}>
              Confirmation sent here
            </span>
          </label>
          <div className="phone-input-wrap">
            <select
              className="country-code-select"
              value={countryCode}
              onChange={(e) => onChangeField('countryCode', e.target.value)}
              aria-label="Country Code"
            >
              <option value="+91">IN (+91)</option>
              <option value="+971">UAE (+971)</option>
              <option value="+966">KSA (+966)</option>
              <option value="+974">QA (+974)</option>
              <option value="+44">UK (+44)</option>
              <option value="+1">US (+1)</option>
            </select>
            <input
              id="whatsappInput"
              type="tel"
              className={`input-field ${errors.whatsapp ? 'error' : ''}`}
              placeholder="85858 55859"
              value={whatsapp}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\d\s]/g, '');
                onChangeField('whatsapp', clean);
              }}
              autoComplete="tel"
            />
          </div>
          {errors.whatsapp && <span className="input-error-msg">{errors.whatsapp}</span>}
        </div>

        {/* Email Address (Optional) */}
        <div className="input-group">
          <label htmlFor="emailInput" className="input-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={15} color="#592F7C" />
              Email Address
            </span>
            <span className="optional-tag">Optional</span>
          </label>
          <input
            id="emailInput"
            type="email"
            className={`input-field ${errors.email ? 'error' : ''}`}
            placeholder="e.g. rahul@example.com"
            value={email}
            onChange={(e) => onChangeField('email', e.target.value)}
            autoComplete="email"
          />
          {errors.email && <span className="input-error-msg">{errors.email}</span>}
        </div>

        {/* Additional Requirements */}
        <div className="input-group">
          <label htmlFor="requirementsInput" className="input-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={15} color="#592F7C" />
              Additional Celebration Notes
            </span>
            <span className="optional-tag">Optional</span>
          </label>
          <textarea
            id="requirementsInput"
            className="input-field textarea-field"
            placeholder="Tell us about the flavour, theme, decorations or dietary needs..."
            value={additionalRequirements}
            onChange={(e) => onChangeField('additionalRequirements', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* ===================================================================
          ADVANCE PAYMENT (₹500) SECTION
          =================================================================== */}
      <div className="payment-card-section" style={{ marginTop: '1.5rem' }}>
        <div className="payment-card-header">
          <div className="payment-title-wrap">
            <span className="payment-badge">
              <CreditCard size={13} />
              Advance Deposit
            </span>
            <h3 className="payment-title">₹500 Booking Confirmation Advance</h3>
          </div>
          <span className="payment-amount-pill">₹500 Required</span>
        </div>

        {/* Notice Box */}
        <div className="payment-notice-box">
          <AlertCircle size={18} className="payment-notice-icon" />
          <div className="payment-notice-content">
            <p className="payment-notice-main">
              <strong>Minimum ₹500 advance payment</strong> is required to lock and reserve your private celebration slot.
            </p>
            <p className="payment-notice-sub">
              This advance amount will be fully deducted from your final bill at the venue. Your slot is held and verified once the screenshot is attached.
            </p>
          </div>
        </div>

        <div className="payment-content-grid">
          {/* Left Column: QR Code & UPI ID */}
          <div className="payment-qr-col">
            <div 
              className="payment-qr-card"
              onClick={() => setIsQrZoomOpen(true)}
              title="Click to zoom QR Code"
            >
              <div className="payment-qr-image-wrap">
                <img 
                  src="/images/payment-qr.png" 
                  alt="Pine Labs Scan & Pay UPI QR Code" 
                  className="payment-qr-img"
                />
                <span className="payment-qr-zoom-tag">
                  <ZoomIn size={12} />
                  Tap to Zoom
                </span>
              </div>
            </div>

            {/* UPI ID Pill with Copy */}
            <div className="payment-upi-box">
              <div className="payment-upi-details">
                <span className="payment-upi-label">UPI ID</span>
                <span className="payment-upi-id">{upiId}</span>
              </div>
              <button
                type="button"
                className={`copy-upi-btn ${copiedUpi ? 'copied' : ''}`}
                onClick={handleCopyUpi}
                aria-label="Copy UPI ID"
              >
                {copiedUpi ? (
                  <>
                    <Check size={13} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="payment-supported-apps">
              <span>Scan using GPay, PhonePe, Paytm or any UPI App</span>
            </div>
          </div>

          {/* Right Column: Upload Payment Screenshot */}
          <div className="payment-upload-col">
            <label className="input-label" style={{ marginBottom: '0.4rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                <QrCode size={15} color="#592F7C" />
                Upload Payment Screenshot <span className="required-star">*</span>
              </span>
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              After completing the ₹500 UPI transfer, take a screenshot of the transaction success screen and upload it below.
            </p>

            {/* Upload Area or Preview */}
            {!paymentScreenshot ? (
              <div 
                className={`payment-dropzone ${errors.paymentScreenshot ? 'dropzone-error' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                  aria-label="Upload Payment Screenshot"
                />
                <div className="dropzone-inner">
                  <div className="dropzone-icon-circle">
                    {isCompressing ? (
                      <div className="dropzone-spinner" />
                    ) : (
                      <UploadCloud size={24} color="#592F7C" />
                    )}
                  </div>
                  <div className="dropzone-text">
                    <span className="dropzone-primary-text">
                      {isCompressing ? 'Optimizing Image...' : 'Tap to Upload Screenshot'}
                    </span>
                    <span className="dropzone-sub-text">
                      PNG, JPG or WebP from your Gallery or Camera
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Attached Screenshot Card */
              <div className="payment-preview-card">
                <div className="payment-preview-left">
                  <img 
                    src={paymentScreenshot} 
                    alt="Payment Screenshot Preview" 
                    className="payment-preview-thumb"
                  />
                  <div className="payment-preview-info">
                    <span className="payment-preview-tag">
                      <CheckCircle2 size={13} color="#059669" />
                      ₹500 Payment Screenshot Attached
                    </span>
                    <span className="payment-preview-filename">
                      {paymentScreenshotName || 'payment_receipt.jpg'}
                    </span>
                  </div>
                </div>

                <div className="payment-preview-actions">
                  <button
                    type="button"
                    className="payment-remove-btn"
                    onClick={handleRemoveScreenshot}
                    title="Remove Screenshot"
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {errors.paymentScreenshot && (
              <div className="payment-error-banner">
                <AlertCircle size={14} />
                <span>{errors.paymentScreenshot}</span>
              </div>
            )}
            {uploadError && (
              <div className="payment-error-banner">
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Zoom for Payment QR */}
      {isQrZoomOpen && (
        <div className="combo-preview-overlay" onClick={() => setIsQrZoomOpen(false)}>
          <div className="combo-preview-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="combo-preview-header">
              <h3 className="combo-preview-title">Zelebrae UPI Payment QR</h3>
              <button 
                type="button" 
                className="combo-modal-close" 
                onClick={() => setIsQrZoomOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="combo-preview-img-container" style={{ background: '#FFFFFF', padding: '1rem' }}>
              <img 
                src="/images/payment-qr.png" 
                alt="Pine Labs Scan & Pay UPI QR Code" 
                style={{ maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>
            <div className="combo-preview-footer" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-brand-purple)' }}>
                {upiId}
              </span>
              <button 
                type="button" 
                className="btn-modal-primary" 
                onClick={handleCopyUpi}
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              >
                {copiedUpi ? 'Copied!' : 'Copy UPI ID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
