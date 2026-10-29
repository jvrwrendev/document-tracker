import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { authService } from '@/features/authentication/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/useToast';

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [employeeNo, setEmployeeNo] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    if (!employeeNo.trim()) {
      setError('Enter your employee number.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.register({
        employeeNo: employeeNo.trim(),
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        password,
      });
      toast.success('Account created', 'Enter the code sent to your email.');
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, {
        state: result,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not create your account. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <Logo />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">CityDocs DMS</p>
            <p className="text-xs text-slate-500">Document Management System</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <header>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Register with your employee number. We&apos;ll email a six-digit
              code to verify your address before you can sign in.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Employee number"
              required
              autoComplete="off"
              value={employeeNo}
              onChange={event => setEmployeeNo(event.target.value)}
              placeholder="EMP-0001"
              leftIcon={<IdCard className="h-4 w-4" />}
              hint="Must match your record in the city's employee directory."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Username"
                autoComplete="username"
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="Optional"
                leftIcon={<User className="h-4 w-4" />}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Optional"
                leftIcon={<Mail className="h-4 w-4" />}
                hint="Must match your employee record."
              />
            </div>

            <Input
              label="Password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="At least 8 characters with a letter and a number"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <Input
              label="Confirm password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={event => setConfirm(event.target.value)}
              placeholder="Re-enter your password"
              leftIcon={<Lock className="h-4 w-4" />}
            />

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-xs leading-relaxed text-rose-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={!employeeNo || !password || !confirm}
              rightIcon={submitting ? undefined : <ArrowRight className="h-4 w-4" />}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
