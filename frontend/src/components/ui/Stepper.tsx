import type { ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface Step {
  id: number;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  canGoToStep?: (step: number) => boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  showStepNumbers?: boolean;
}

export function Stepper({
  steps,
  currentStep,
  onStepChange,
  canGoToStep,
  orientation = 'horizontal',
  className,
  showStepNumbers = true,
}: StepperProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={cn('w-full', className)}>
      {isHorizontal ? (
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-brand-600 transition-all duration-300"
            style={{
            width: `${((currentStep - 1) / Math.max(steps.length - 1, 1)) * 100}%`,
            }}
          />
          <ol className="relative flex justify-between">
            {steps.map((step) => {
              const stepNumber = step.id;
              const isCompleted = stepNumber < currentStep;
              const isActive = stepNumber === currentStep;
              const isUpcoming = stepNumber > currentStep;
              const canNavigate = onStepChange && canGoToStep?.(stepNumber) && (isCompleted || stepNumber < currentStep + 2);

              const Icon = step.icon;

              return (
                <li key={step.id} className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => canNavigate && onStepChange(stepNumber)}
                    disabled={!canNavigate}
                    className={cn(
                      'relative flex items-center justify-center rounded-full border-2 transition-all duration-200',
                      isCompleted &&
                        'border-brand-600 bg-brand-600 text-white hover:bg-brand-700',
                      isActive &&
                        'border-brand-600 bg-white text-brand-600 ring-2 ring-brand-500 ring-offset-2',
                      isUpcoming &&
                        'border-slate-300 bg-white text-slate-400',
                      canNavigate && isUpcoming && 'hover:border-slate-400',
                      !canNavigate && 'cursor-not-allowed opacity-60',
                    )}
                    style={{ width: '36px', height: '36px' }}
                    aria-label={`Step ${stepNumber}: ${step.title}`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : showStepNumbers ? (
                      <span className="text-sm font-semibold">{stepNumber}</span>
                    ) : (
                      <Circle className="h-2.5 w-2.5" />
                    )}
                  </button>
                  <div className="mt-2 text-center max-w-[120px]">
                    <p
                      className={cn(
                        'text-xs font-medium truncate',
                        isActive && 'text-brand-700',
                        isCompleted && 'text-slate-700',
                        isUpcoming && 'text-slate-400',
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 hidden sm:block">
                        {step.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <ol className="space-y-2">
          {steps.map((step) => {
            const stepNumber = step.id;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;
            const canNavigate = onStepChange && canGoToStep?.(stepNumber) && isCompleted;

            const Icon = step.icon;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => canNavigate && onStepChange(stepNumber)}
                  disabled={!canNavigate}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200 text-left',
                    isActive &&
                      'border-brand-600 bg-brand-50',
                    isCompleted &&
                      'border-slate-200 bg-white hover:border-slate-300',
                    isUpcoming &&
                      'border-slate-200 bg-white opacity-60',
                    !canNavigate && 'cursor-not-allowed',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 shrink-0',
                      isCompleted &&
                        'border-brand-600 bg-brand-600 text-white',
                      isActive &&
                        'border-brand-600 bg-white text-brand-600',
                      isUpcoming &&
                        'border-slate-300 bg-white text-slate-400',
                    )}
                    style={{ width: '32px', height: '32px' }}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : Icon ? (
                      <Icon className="h-4 w-4" />
                    ) : showStepNumbers ? (
                      <span className="text-xs font-semibold">{stepNumber}</span>
                    ) : (
                      <Circle className="h-2 w-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isActive && 'text-brand-700',
                        isCompleted && 'text-slate-700',
                        isUpcoming && 'text-slate-500',
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {isCompleted && (
                    <Check className="h-5 w-5 text-brand-600 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  backLabel?: string;
  submitLabel?: string;
  className?: string;
}

export function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  isNextDisabled = false,
  isSubmitDisabled = false,
  isSubmitting = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  submitLabel = 'Register Document',
  className,
}: StepperNavigationProps) {
  const isLastStep = currentStep === totalSteps;
  const canGoBack = currentStep > 1;

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 pt-4 border-t border-slate-200',
        className,
      )}
    >
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={!canGoBack || isSubmitting}
        type="button"
        className="text-slate-600 hover:text-slate-900"
      >
        {backLabel}
      </Button>
      {!isLastStep ? (
        <Button
          onClick={onNext}
          disabled={isNextDisabled || isSubmitting}
          type="button"
          className="w-[100px]"
        >
          {nextLabel}
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitDisabled || isSubmitting}
          type="button"
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
