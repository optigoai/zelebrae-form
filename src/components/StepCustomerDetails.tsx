import React from 'react';
import { User, MapPin, Phone, Mail, MessageSquare, Sparkles } from 'lucide-react';

interface StepCustomerDetailsProps {
  name: string;
  customerLocation: string;
  countryCode: string;
  whatsapp: string;
  email: string;
  additionalRequirements: string;
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
  onChangeField,
  errors
}) => {
  return (
    <div className="animate-fade-in">
      <div className="step-header">
        <span className="step-tag">
          <Sparkles size={14} />
          Step 5 of 5
        </span>
        <h1 className="step-title">Customer Details</h1>
        <p className="step-subtitle">
          Please provide your contact details so our team can coordinate your reservation and cake prep.
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
            placeholder="e.g. Rahul "
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
              placeholder="98765 43210"
              value={whatsapp}
              onChange={(e) => {
                // Allow digits and spaces
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
    </div>
  );
};
