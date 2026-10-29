import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Lock,
  User,
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  FileCheck2,
  BellRing,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: FileCheck2,
    title: 'Audited workflows',
    description: 'Every action is tracked with a full audit trail.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'Granular permissions across 4 user roles.',
  },
  {
    icon: BellRing,
    title: 'Live notifications',
    description: 'Stay updated on routing, review, and release.',
  },
];

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
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-slate-50">
      {/* Brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-indigo-950 text-white">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:26px_26px]" />

        <header className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <div className="flex items-center gap-3.5">
            <Logo />
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">CityDocs DMS</p>
              <p className="text-xs text-brand-200">Document Management System</p>
            </div>
          </div>
        </header>

        {/* Hero middle */}
        <div className="relative z-10 px-12 py-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Trusted by government offices
          </span>
          <h1 className="mt-5 max-w-md text-4xl xl:text-[2.75rem] font-semibold leading-[1.15] tracking-tight">
            Document management, built for accountability.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-200">
            Register, route, review, and release official documents with a complete audit trail —
            engineered for offices that demand transparency and efficiency.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map(feature => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <feature.icon className="h-5 w-5 text-brand-100" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-brand-200">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="relative z-10 flex items-center justify-between px-12 pb-11 text-xs text-brand-300">
          <p>&copy; 2026 CityDocs. For authorized government use only.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </footer>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[26rem]">
          <div className="lg:hidden mb-9 flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <p className="text-lg font-semibold text-slate-900">CityDocs DMS</p>
              <p className="text-xs text-slate-500">Document Management System</p>
            </div>
          </div>

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
    </div>
  );
}
