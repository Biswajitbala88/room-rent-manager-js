import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'superadmin@example.com',
      password: 'password123',
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-mint/10 text-mint">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Room Rent Manager</h1>
            <p className="text-sm text-steel">Sign in to manage tenants and invoices.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            {form.formState.errors.email ? <span className="mt-1 block text-xs text-coral">{form.formState.errors.email.message}</span> : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <span className="mt-1 block text-xs text-coral">{form.formState.errors.password.message}</span>
            ) : null}
          </label>

          {error ? <div className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div> : null}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="h-10 w-full rounded-md bg-mint px-4 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
