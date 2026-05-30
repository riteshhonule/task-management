import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { authApi } from '../services/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setFormError(null);
    try {
      await login(values.email, values.password);
      // Wait for auth context state to settle and profile load
      setTimeout(() => {
        navigate('/');
      }, 300);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    setForgotSuccess(null);
    setFormError(null);
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      setForgotSuccess('A password reset code has been sent to your email.');
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-655/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-655/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-650 shadow-xl shadow-indigo-600/25 border border-indigo-400/20">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-heading font-extrabold tracking-tight text-slate-800">
            {isForgotMode ? 'Recover Password' : 'Sign in to Taskflow'}
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 max-w-xs leading-normal">
            {isForgotMode
              ? 'Enter your registered email address to request a temporary access token.'
              : 'Enterprise Employee Task & Performance Management System.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200/80">
          {formError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-medium text-rose-600">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-medium text-emerald-600">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {!isForgotMode ? (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@company.com"
                    className="block w-full rounded-xl bg-white border border-slate-200 py-3.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className="block w-full rounded-xl bg-white border border-slate-200 py-3.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-rose-550">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all active:translate-y-0 hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-405">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="block w-full rounded-xl bg-white border border-slate-205 py-3.5 pl-10 pr-4 text-sm text-slate-805 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !forgotEmail}
                className="w-full rounded-xl bg-indigo-650 py-3.5 text-sm font-semibold text-white hover:bg-indigo-550 transition-all cursor-pointer shadow-lg"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Request Access Code'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setFormError(null);
                  setForgotSuccess(null);
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 py-1 cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
