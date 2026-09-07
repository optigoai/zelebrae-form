import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProgressStepper } from './components/ProgressStepper';
import { StepLocation } from './components/StepLocation';
import { StepOccasionGuests } from './components/StepOccasionGuests';
import { StepDateTime } from './components/StepDateTime';
import { StepCustomize } from './components/StepCustomize';
import { StepCustomerDetails } from './components/StepCustomerDetails';
import { StepReview } from './components/StepReview';
import { SuccessScreen } from './components/SuccessScreen';
import { MobileBottomBar } from './components/MobileBottomBar';
import { bookingApi } from './services/bookingApi';
import { AppConfig, BookingState } from './types/booking';
import { DEFAULT_APP_CONFIG } from './config/constants';
import { getKolkataToday } from './utils/dateUtils';
import { AlertTriangle, X } from 'lucide-react';

const STEP_NAMES = [
  'Celebration',
  'Occasion',
  'Date & Time',
  'Customize',
  'Details',
  'Review'
];

export const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Form validation errors for Step 5
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Main Booking State
  const [bookingState, setBookingState] = useState<BookingState>({
    location: 'pantheerankavu',
    occasion: 'birthday',
    customOccasion: '',
    guests: 4,
    date: getKolkataToday(),
    timeSlot: '',
    amenities: ['basic_decorations', 'music_mic', 'ac_hall', 'welcome_drink'],
    combo: 'none',
    comboPackage: '',
    comboPrice: 0,
    name: '',
    customerLocation: '',
    countryCode: '+91',
    whatsapp: '',
    email: '',
    additionalRequirements: '',
    guidelinesAgreed: false
  });

  // Fetch initial config from remote (if API URL configured)
  useEffect(() => {
    bookingApi.fetchConfig().then(cfg => {
      setConfig(cfg);
    }).catch(err => {
      console.warn('Config fetch fallback:', err);
    });
  }, []);

  // Handlers for state updates
  const handleSelectLocation = (locId: string) => {
    setBookingState(prev => ({ ...prev, location: locId }));
  };

  const handleSelectOccasion = (occId: string) => {
    setBookingState(prev => {
      if (prev.occasion === occId) return prev;
      return {
        ...prev,
        occasion: occId,
        combo: 'none',
        comboPackage: undefined,
        comboPrice: 0
      };
    });
  };

  const handleChangeCustomOccasion = (val: string) => {
    setBookingState(prev => ({ ...prev, customOccasion: val }));
  };

  const handleChangeGuests = (num: number) => {
    setBookingState(prev => ({ ...prev, guests: num }));
  };

  const handleSelectDate = (date: string) => {
    setBookingState(prev => ({ ...prev, date }));
  };

  const handleSelectSlot = (slot: string) => {
    setBookingState(prev => ({ ...prev, timeSlot: slot }));
  };

  const handleToggleAmenity = (amenityId: string) => {
    setBookingState(prev => {
      const exists = prev.amenities.includes(amenityId);
      const nextAmenities = exists
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId];
      return { ...prev, amenities: nextAmenities };
    });
  };

  const handleSelectCombo = (comboId: string, defaultPackageCode?: string, defaultPrice?: number) => {
    setBookingState(prev => ({
      ...prev,
      combo: comboId,
      comboPackage: defaultPackageCode || '',
      comboPrice: defaultPrice ?? 0
    }));
  };

  const handleSelectPackage = (pkgCode: string, price: number) => {
    setBookingState(prev => ({
      ...prev,
      comboPackage: pkgCode,
      comboPrice: price
    }));
  };

  const handleChangeField = (field: string, value: string) => {
    setBookingState(prev => ({ ...prev, [field]: value }));
    // Clear error for field on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleToggleGuidelines = (agreed: boolean) => {
    setBookingState(prev => ({ ...prev, guidelinesAgreed: agreed }));
  };

  // Pure check for step completion without side effects
  const isStepComplete = (step: number): boolean => {
    if (step === 1) {
      return Boolean(bookingState.location);
    }
    if (step === 2) {
      if (!bookingState.occasion) return false;
      if (bookingState.occasion === 'other' && !bookingState.customOccasion?.trim()) {
        return false;
      }
      return bookingState.guests >= config.minGuests && bookingState.guests <= config.maxGuests;
    }
    if (step === 3) {
      return Boolean(bookingState.date && bookingState.timeSlot);
    }
    if (step === 4) {
      return true;
    }
    if (step === 5) {
      const cleanPhone = bookingState.whatsapp.replace(/\D/g, '');
      const hasValidName = Boolean(bookingState.name.trim() && bookingState.name.trim().length >= 2);
      const hasValidLocation = Boolean(bookingState.customerLocation.trim());
      const hasValidPhone = Boolean(cleanPhone && cleanPhone.length >= 10);
      let hasValidEmail = true;
      if (bookingState.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        hasValidEmail = emailRegex.test(bookingState.email.trim());
      }
      return hasValidName && hasValidLocation && hasValidPhone && hasValidEmail;
    }
    if (step === 6) {
      return bookingState.guidelinesAgreed;
    }
    return true;
  };

  // Explicit validation that sets fieldErrors ONLY when user clicks Next on Step 5
  const validateAndSetErrors = (step: number): boolean => {
    if (step === 5) {
      const errors: Record<string, string> = {};
      if (!bookingState.name.trim() || bookingState.name.trim().length < 2) {
        errors.name = 'Please enter your full name';
      }
      if (!bookingState.customerLocation.trim()) {
        errors.customerLocation = 'Please enter your city / area';
      }
      const cleanPhone = bookingState.whatsapp.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        errors.whatsapp = 'Please enter a valid 10-digit WhatsApp number';
      }
      if (bookingState.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookingState.email.trim())) {
          errors.email = 'Please enter a valid email address';
        }
      }
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return isStepComplete(step);
  };

  // Step Navigation
  const handleNext = () => {
    if (!validateAndSetErrors(currentStep)) return;

    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Step 6: Submit Booking to Google Apps Script
      handleFinalSubmission();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepJump = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final submission with double-booking race condition handling
  const handleFinalSubmission = async () => {
    if (!bookingState.guidelinesAgreed) return;

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await bookingApi.submitBooking(bookingState);

      if (response.success && response.bookingId) {
        setConfirmedBookingId(response.bookingId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (response.error === 'SLOT_ALREADY_BOOKED') {
        // Double booking collision handled cleanly!
        setGlobalError('Sorry, that slot was just booked by someone else. Please choose another time.');
        // Redirect customer to Step 3 so they can pick a new slot
        setCurrentStep(3);
        setBookingState(prev => ({ ...prev, timeSlot: '' }));
      } else {
        setGlobalError(response.message || 'Something went wrong while confirming your booking. Please try again.');
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Unable to connect to the booking service. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset reservation
  const handleReset = () => {
    setConfirmedBookingId(null);
    setCurrentStep(1);
    setBookingState({
      location: 'pantheerankavu',
      occasion: 'birthday',
      customOccasion: '',
      guests: 4,
      date: getKolkataToday(),
      timeSlot: '',
      amenities: ['basic_decorations', 'music_mic', 'ac_hall', 'welcome_drink'],
      combo: 'none',
      comboPackage: '',
      comboPrice: 0,
      name: '',
      customerLocation: '',
      countryCode: '+91',
      whatsapp: '',
      email: '',
      additionalRequirements: '',
      guidelinesAgreed: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute if Next button is disabled for current step (Step 5 remains clickable to show validation errors)
  const isNextDisabled = currentStep === 5 ? false : !isStepComplete(currentStep);

  const currentLocation = config.locations.find(l => l.id === bookingState.location);

  return (
    <div className="app-container">
      <Header 
        onRestart={confirmedBookingId ? handleReset : undefined} 
        locationName={currentLocation?.name}
      />

      <main className="main-content">
        {/* Global Error Banner */}
        {globalError && (
          <div 
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-lg)',
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#DC2626" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer' }}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {confirmedBookingId ? (
          <SuccessScreen
            bookingId={confirmedBookingId}
            state={bookingState}
            locations={config.locations}
            onReset={handleReset}
            businessWhatsApp={config.whatsappNumber}
          />
        ) : (
          <>
            <ProgressStepper
              currentStep={currentStep}
              totalSteps={6}
              stepNames={STEP_NAMES}
              onStepClick={handleStepJump}
            />

            {currentStep === 1 && (
              <StepLocation
                locations={config.locations}
                selectedLocationId={bookingState.location}
                onSelectLocation={handleSelectLocation}
                onContinue={handleNext}
              />
            )}

            {currentStep === 2 && (
              <StepOccasionGuests
                occasions={config.occasions}
                selectedOccasion={bookingState.occasion}
                customOccasion={bookingState.customOccasion}
                onSelectOccasion={handleSelectOccasion}
                onChangeCustomOccasion={handleChangeCustomOccasion}
                guests={bookingState.guests}
                minGuests={config.minGuests}
                maxGuests={config.maxGuests}
                onChangeGuests={handleChangeGuests}
              />
            )}

            {currentStep === 3 && (
              <StepDateTime
                location={bookingState.location}
                selectedDate={bookingState.date}
                selectedSlot={bookingState.timeSlot}
                onSelectDate={handleSelectDate}
                onSelectSlot={handleSelectSlot}
                bookingWindowDays={config.bookingWindowDays}
              />
            )}

            {currentStep === 4 && (
              <StepCustomize
                occasion={bookingState.occasion}
                amenities={config.amenities}
                selectedAmenities={bookingState.amenities}
                onToggleAmenity={handleToggleAmenity}
                combos={config.combos}
                selectedCombo={bookingState.combo}
                selectedPackage={bookingState.comboPackage}
                selectedPrice={bookingState.comboPrice}
                onSelectCombo={handleSelectCombo}
                onSelectPackage={handleSelectPackage}
                menuPdfUrl={config.menuPdfUrl}
              />
            )}

            {currentStep === 5 && (
              <StepCustomerDetails
                name={bookingState.name}
                customerLocation={bookingState.customerLocation}
                countryCode={bookingState.countryCode}
                whatsapp={bookingState.whatsapp}
                email={bookingState.email}
                additionalRequirements={bookingState.additionalRequirements}
                onChangeField={handleChangeField}
                errors={fieldErrors}
              />
            )}

            {currentStep === 6 && (
              <StepReview
                state={bookingState}
                locations={config.locations}
                occasions={config.occasions}
                amenities={config.amenities}
                combos={config.combos}
                onEditStep={handleStepJump}
                onToggleGuidelines={handleToggleGuidelines}
              />
            )}
          </>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation (only shown during booking flow) */}
      {!confirmedBookingId && (
        <MobileBottomBar
          currentStep={currentStep}
          totalSteps={6}
          onBack={handleBack}
          onNext={handleNext}
          isNextDisabled={isNextDisabled}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
