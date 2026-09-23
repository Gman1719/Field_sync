import React from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import Input from '../../components/ui/Input.tsx';
import Button from '../../components/ui/Button.tsx';
import Card from '../../components/ui/Card.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = React.useState('officer@fieldsync.com');
  const [password, setPassword] = React.useState('Password123!');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
    } catch (err: any) {
      let message = err.response?.data?.error;
      if (!message) {
        if (err.response?.status === 500 || err.code === 'ERR_NETWORK') {
          message = 'Cannot connect to backend server on http://localhost:5000. Please ensure the backend is running.';
        } else {
          message = err.message || 'Authentication failed. Please check credentials.';
        }
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 border-slate-200 shadow-md">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500">
          Access the offline-first field registration &amp; reporting portal
        </p>
      </div>

      {/* Quick-Fill Demo Pill Selector */}
      <div className="mb-6 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
        <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Quick-Fill Seed Accounts (Phase 2):
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill('officer@fieldsync.com')}
            className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-center ${
              email === 'officer@fieldsync.com'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Officer
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('supervisor@fieldsync.com')}
            className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-center ${
              email === 'supervisor@fieldsync.com'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Supervisor
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('manager@fieldsync.com')}
            className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-center ${
              email === 'manager@fieldsync.com'
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Manager
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@fieldsync.com"
          required
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default LoginPage;
