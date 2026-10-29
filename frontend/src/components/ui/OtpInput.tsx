import { useEffect, useRef } from 'react';
import type { ClipboardEvent, ChangeEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const LENGTH = 6;

interface OtpInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  /** Increment to move focus back to the first box (e.g. after a failed attempt). */
  resetKey?: number;
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
  resetKey = 0,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetKey > 0) refs.current[0]?.focus();
  }, [resetKey]);

  const commit = (next: string[]) => {
    onChange(next);
    if (next.every(digit => digit.length === 1)) {
      onComplete?.(next.join(''));
    }
  };

  const fillFrom = (start: number, digits: string) => {
    const next = [...value];
    let cursor = start;
    for (const digit of digits) {
      if (cursor >= LENGTH) break;
      next[cursor] = digit;
      cursor += 1;
    }
    commit(next);
    const focusAt = Math.min(cursor, LENGTH - 1);
    refs.current[focusAt]?.focus();
    refs.current[focusAt]?.setSelectionRange(1, 1);
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const raw = digitsOnly(event.target.value);
    if (!raw) {
      const next = [...value];
      next[index] = '';
      onChange(next);
      return;
    }
    if (raw.length > 1) {
      fillFrom(index, raw.slice(0, LENGTH - index));
      return;
    }

    const next = [...value];
    next[index] = raw;
    commit(next);
    if (index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
      refs.current[index + 1]?.setSelectionRange(1, 1);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (value[index]) {
        const next = [...value];
        next[index] = '';
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = '';
        onChange(next);
        refs.current[index - 1]?.focus();
      }
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
      event.preventDefault();
      return;
    }
    if (event.key === 'Delete') {
      const next = [...value];
      next[index] = '';
      onChange(next);
      event.preventDefault();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = digitsOnly(event.clipboardData.getData('text'));
    if (!pasted) return;
    fillFrom(index, pasted.slice(0, LENGTH - index));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5" role="group" aria-label="Six-digit verification code">
      {Array.from({ length: LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={element => {
            refs.current[index] = element;
          }}
          value={value[index] ?? ''}
          onChange={event => handleChange(index, event)}
          onKeyDown={event => handleKeyDown(index, event)}
          onPaste={event => handlePaste(index, event)}
          onFocus={event => event.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={LENGTH}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={cn(
            'h-14 w-11 rounded-xl border bg-white text-center text-2xl font-semibold text-slate-900 shadow-sm sm:h-16 sm:w-12',
            'transition-all focus:outline-none focus:ring-4',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20',
            'disabled:bg-slate-50 disabled:text-slate-400',
          )}
        />
      ))}
    </div>
  );
}
