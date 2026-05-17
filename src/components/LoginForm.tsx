import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import type { AuthResponse } from '../types';
import maraLogo from '../assets/mara.svg';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      const response = await api.post<AuthResponse>('/auth/login/admin', data);
      const { token, refreshToken, ...user } = response.data;
      setAuth({ ...user, token, refreshToken }, token, refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong p-8 rounded-[2rem] w-full max-w-md animate-scale-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={maraLogo} alt="Mara Studio" className="w-40 h-auto mb-2 drop-shadow-md" />
          <p className="text-[var(--color-text-muted)]">Panel de Administración</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--color-text-body)]">
              Correo Electrónico
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)] bg-white/50 focus:bg-white transition-colors"
              placeholder="admin@marastudio.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--color-text-body)]">
              Contraseña
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)] bg-white/50 focus:bg-white transition-colors"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-8"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
