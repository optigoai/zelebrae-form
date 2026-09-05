import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
  onStepClick: (stepIndex: number) => void;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  totalSteps,
  stepNames,
  onStepClick
}) => {
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="stepper-container" aria-label="Booking Progress">
      <div className="stepper-progress-bar">
        <div className="stepper-track-bg" />
        <div 
          className="stepper-track-fill" 
          style={{ width: `${progressPercent}%` }} 
        />

        {stepNames.map((name, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isClickable = stepNumber < currentStep;

          return (
            <button
              key={name}
              type="button"
              className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => isClickable && onStepClick(stepNumber)}
              disabled={!isClickable && !isActive}
              aria-label={`Step ${stepNumber}: ${name} ${isActive ? '(Current)' : isCompleted ? '(Completed)' : ''}`}
              title={`${name}`}
            >
              {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNumber}
            </button>
          );
        })}
      </div>

      <div className="stepper-labels">
        {stepNames.map((name, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <span
              key={name}
              className={`${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
};
