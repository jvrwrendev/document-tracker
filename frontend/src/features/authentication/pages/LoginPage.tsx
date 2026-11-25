import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | undefined>();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const res = await login(username, password);
    if (res.ok) {
      if (res.mustChangePassword) {
        toast.info(
          'Temporary password detected',
          'Please set a new password to continue.',
        );
        navigate('/change-password', { replace: true });
      } else {
        toast.success('Welcome back', 'You have been signed in successfully.');
        navigate('/dashboard');
      }
    } else if (res.code === 'EMAIL_NOT_VERIFIED') {
      const email = res.email ?? username;
      toast.info(
        'Verify your email',
        'Enter the six-digit code we sent to your email address.',
      );
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
        state: { email },
      });
    } else {
      setError(res.error ?? 'Sign in failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-10">
      <div className="w-full max-w-[26rem]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <header>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to continue to the document management system.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Username or Email"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="yourname@city.gov"
              leftIcon={<User className="h-4 w-4" />}
            />

            <div>
              <Input
                label="Password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
                  />
                  Keep me signed in
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3',
                )}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-xs leading-relaxed text-rose-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={!username || !password}
              rightIcon={loading ? undefined : <ArrowRight className="h-4 w-4" />}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          New employee? Contact your system administrator for access.
        </p>
      </div>
    </div>
  );
}
