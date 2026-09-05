import React from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

interface MobileBottomBarProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  isSubmitting?: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isNextDisabled,
  isSubmitting = false
}) => {
  const isFinalStep = currentStep === totalSteps;

  const getCtaText = () => {
    if (isSubmitting) return 'Confirming Celebration...';
    if (isFinalStep) return 'Confirm Celebration';
    if (currentStep === 1) return 'Continue';
    if (currentStep === 2) return 'Select Date & Time';
    if (currentStep === 3) return 'Customize Celebration';
    if (currentStep === 4) return 'Enter Your Details';
    if (currentStep === 5) return 'Review Reservation';
    return 'Continue';
  };

  return (
    <div className="mobile-bottom-bar" role="region" aria-label="Step Navigation">
      <div className="bottom-bar-inner">
        <div className="bottom-bar-left">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBack}
              disabled={isSubmitting}
              style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              aria-label="Go back to previous step"
            >
              <ArrowLeft size={16} />
              <span style={{ marginLeft: '4px' }}>Back</span>
            </button>
          )}
        </div>

        <div className="bottom-bar-right">
          <button
            type="button"
            className="btn btn-cta bottom-bar-cta"
            onClick={onNext}
            disabled={isNextDisabled || isSubmitting}
            aria-label={getCtaText()}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Confirming...</span>
              </>
            ) : isFinalStep ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                <span>Confirm Celebration</span>
              </>
            ) : (
              <>
                <span>{getCtaText()}</span>
                <ArrowRight size={16} style={{ marginLeft: '4px' }} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
