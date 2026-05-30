import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '../services/api';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export const ChangePassword: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      setSuccessMsg('Password updated successfully!');
      reset();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <KeyRound size={20} />
        </div>
        <div>
          <h2 className="text-xl font-heading font-extrabold text-slate-800">Security Credentials</h2>
          <p className="text-xs text-slate-500">Update your access passwords below.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
        {errorMsg && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-medium text-rose-600">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-medium text-emerald-600">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Current Password
            </label>
            <input
              type="password"
              {...register('oldPassword')}
              placeholder="Enter current password"
              className="block w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {errors.oldPassword && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.oldPassword.message}</p>
            )}
          </div>

          <div className="border-t border-slate-100 my-4 pt-4" />

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type="password"
              {...register('newPassword')}
              placeholder="Minimum 6 characters"
              className="block w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              {...register('confirmPassword')}
              placeholder="Confirm new password"
              className="block w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all active:translate-y-0 hover:-translate-y-0.5 shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <ShieldCheck size={16} /> Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
