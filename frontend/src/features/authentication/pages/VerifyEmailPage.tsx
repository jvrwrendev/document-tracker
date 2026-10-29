import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { authService } from '@/features/authentication/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { OtpInput } from '@/components/ui/OtpInput';
import { useToast } from '@/hooks/useToast';

const CODE_LENGTH = 6;
const DEFAULT_EXPIRY_SECONDS = 10 * 60;
const DEFAULT_COOLDOWN_SECONDS = 60;
const EMPTY_CODE = Array.from({ length: CODE_LENGTH }, () => '');

interface VerifyLocationState {
  email?: string;
  expiresInSeconds?: number;
  resendAvailableInSeconds?: number;
}

function formatSeconds(total: number): string {
  const safe = Math.max(0, total);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { updateCurrentUser } = useAuth();

  const locationState = (location.state as VerifyLocationState | null) ?? {};
  const initialEmail = searchParams.get('email') ?? locationState.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [emailDraft, setEmailDraft] = useState(initialEmail);
  const [editingEmail, setEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [expiresAt, setExpiresAt] = useState(
    () =>
      Date.now() +
      (locationState.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS) * 1000,
  );
  const [resendAt, setResendAt] = useState(
    () =>
      Date.now() +
      (locationState.resendAvailableInSeconds ?? DEFAULT_COOLDOWN_SECONDS) *
        1000,
  );
  const [now, setNow] = useState(() => Date.now());

  const verifyingRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiryRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const cooldownRemaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const code = digits.join('');
  const codeComplete = code.length === CODE_LENGTH;

  const handleVerify = useCallback(
    async (submitted?: string) => {
      const value = submitted ?? code;
      if (verifyingRef.current) return;
      if (!/^\d{6}$/.test(value)) {
        setError('Enter the full six-digit code from your email.');
        return;
      }
      if (!email) {
        setEditingEmail(true);
        setError('Enter the email address you registered with.');
        return;
      }

      verifyingRef.current = true;
      setVerifying(true);
      setError(undefined);
      setNotice(undefined);

      try {
        const user = await authService.verifyEmail({ email, code: value });
        updateCurrentUser(user);
        toast.success('Email verified', 'Your account is ready to use.');
        navigate(
          user.mustChangePassword ? '/change-password' : '/dashboard',
          { replace: true },
        );
      } catch (err) {
        setDigits(EMPTY_CODE);
        setOtpResetKey(key => key + 1);
        setError(
          err instanceof Error
            ? err.message
            : 'We could not verify that code. Please try again.',
        );
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    },
    [code, email, navigate, toast, updateCurrentUser],
  );

  const handleResend = async () => {
    if (resending || cooldownRemaining > 0) return;
    if (!email) {
      setEditingEmail(true);
      setError('Enter the email address you registered with.');
      return;
    }

    setResending(true);
    setError(undefined);
    setNotice(undefined);

    try {
      const result = await authService.resendVerification({ email });
      setResendAt(Date.now() + result.resendAvailableInSeconds * 1000);
      setExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      setDigits(EMPTY_CODE);
      setOtpResetKey(key => key + 1);
      setNotice(
        result.sent
          ? 'A new six-digit code has been sent to your email.'
          : 'A code was sent recently. Please wait before requesting another.',
      );
      if (result.sent) {
        toast.success('Code sent', 'Check your inbox for the new code.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not resend the code. Please try again.',
      );
    } finally {
      setResending(false);
    }
  };

  const applyEmail = () => {
    const next = emailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setError('Enter a valid email address.');
      return;
    }
    setEmail(next);
    setEditingEmail(false);
    setError(undefined);
    setNotice(undefined);
    setDigits(EMPTY_CODE);
    setOtpResetKey(key => key + 1);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <Logo />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">CityDocs DMS</p>
            <p className="text-xs text-slate-500">Document Management System</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
          </div>

          <header>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Verify your email
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {editingEmail ? (
                'Enter the email address you registered with.'
              ) : (
                <>
                  We sent a six-digit code to{' '}
                  <span className="font-medium text-slate-700">{email}</span>.
                  Enter it below to activate your account.
                </>
              )}
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed text-rose-700">{error}</p>
            </div>
          )}

          {notice && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs leading-relaxed text-emerald-700">{notice}</p>
            </div>
          )}

          {editingEmail && (
            <div className="mt-6 flex items-start gap-2">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                value={emailDraft}
                onChange={event => setEmailDraft(event.target.value)}
                placeholder="yourname@city.gov"
                leftIcon={<Mail className="h-4 w-4" />}
              />
              <Button
                type="button"
                className="mt-7"
                variant="outline"
                onClick={applyEmail}
                disabled={!emailDraft.trim()}
              >
                Use
              </Button>
            </div>
          )}

          {!editingEmail && (
            <>
              <div className="mt-6 flex items-center justify-between text-xs">
                <span
                  className={
                    expiryRemaining > 0
                      ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100'
                      : 'inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700 ring-1 ring-rose-100'
                  }
                >
                  <span
                    className={
                      expiryRemaining > 0
                        ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                        : 'h-1.5 w-1.5 rounded-full bg-rose-500'
                    }
                  />
                  {expiryRemaining > 0
                    ? `Code expires in ${formatSeconds(expiryRemaining)}`
                    : 'Code expired'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDraft(email);
                    setEditingEmail(true);
                    setError(undefined);
                  }}
                  className="font-medium text-slate-500 hover:text-brand-700"
                >
                  Change email
                </button>
              </div>

              <div className="mt-6">
                <OtpInput
                  value={digits}
                  onChange={next => {
                    setDigits(next);
                    if (error && next.some(Boolean)) setError(undefined);
                  }}
                  onComplete={next => {
                    void handleVerify(next);
                  }}
                  disabled={verifying}
                  error={Boolean(error)}
                  resetKey={otpResetKey}
                />
              </div>

              <Button
                type="button"
                fullWidth
                size="lg"
                className="mt-6"
                loading={verifying}
                disabled={!codeComplete || verifying}
                onClick={() => void handleVerify()}
              >
                {verifying ? 'Verifying…' : 'Verify email'}
              </Button>

              <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={resending}
                  disabled={cooldownRemaining > 0 || resending}
                  onClick={() => void handleResend()}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  {cooldownRemaining > 0
                    ? `Resend code in ${formatSeconds(cooldownRemaining)}`
                    : 'Resend code'}
                </Button>
                <p className="text-center text-xs text-slate-400">
                  Didn&apos;t receive it? Check your spam folder or resend the
                  code.
                </p>
              </div>
            </>
          )}

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
