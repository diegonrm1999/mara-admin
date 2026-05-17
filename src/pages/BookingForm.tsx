import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { Treatment, Stylist } from '../types';

const bookingSchema = z.object({
  contactName: z.string().min(2, 'Nombre requerido'),
  contactPhone: z.string().min(6, 'Teléfono requerido'),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  treatmentIds: z.array(z.string()).min(1, 'Selecciona al menos un tratamiento'),
  scheduledAt: z.string().min(1, 'Fecha y hora requerida'),
  durationMinutes: z.number().min(15, 'Duración mínima 15 min'),
  stylistId: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function BookingForm() {
  const navigate = useNavigate();
  const shopId = useAuthStore((state) => state.user?.shopId);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch treatments
  const { data: treatmentsData, isLoading: loadingTreatments } = useQuery({
    queryKey: ['treatments', shopId],
    queryFn: async () => {
      const response = await api.get<Treatment[]>('/treatments/all');
      return response.data;
    },
    enabled: !!shopId,
  });

  // Fetch stylists
  const { data: stylists, isLoading: loadingStylists } = useQuery({
    queryKey: ['stylists', shopId],
    queryFn: async () => {
      const response = await api.get<Stylist[]>('/users/stylists');
      return response.data;
    },
    enabled: !!shopId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      treatmentIds: [],
      durationMinutes: 120,
    },
  });

  const selectedTreatments = watch('treatmentIds');

  const toggleTreatment = (id: string) => {
    const current = selectedTreatments || [];
    if (current.includes(id)) {
      setValue('treatmentIds', current.filter((t) => t !== id));
    } else {
      setValue('treatmentIds', [...current, id]);
    }
  };

  const onSubmit = async (data: BookingFormValues) => {
    try {
      setError(null);
      
      // Convert datetime-local to ISO-8601
      const date = new Date(data.scheduledAt);
      const isoDate = date.toISOString();

      const payload = {
        shopId,
        ...data,
        scheduledAt: isoDate,
        stylistId: data.stylistId || undefined,
        contactEmail: data.contactEmail || undefined,
      };

      await api.post('/scheduled-orders/public', payload, {
        headers: {
          'x-shop-id': shopId,
          'x-public-key': import.meta.env.VITE_SHOP_PUBLIC_KEY || '',
        }
      });
      
      setSuccess(true);
      reset();
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al agendar la cita. Verifica que el horario esté disponible.');
    }
  };

  if (loadingTreatments || loadingStylists) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 animate-scale-in">
        <div className="glass-strong p-12 rounded-[2rem] text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-primary)] mb-4">¡Cita Registrada!</h2>
          <p className="text-[var(--color-text-body)] mb-8">
            La cita manual ha sido agendada exitosamente en el sistema.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-light)] transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Agendar Cita Manual</h1>
        <p className="text-[var(--color-text-muted)] text-lg">
          Registra una cita confirmada previamente por WhatsApp u otro medio.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Contact Info Section */}
        <section className="glass rounded-[2rem] p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-primary)]">
            <User className="w-5 h-5" />
            Datos del Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Nombre Completo *</label>
              <input
                type="text"
                {...register('contactName')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors"
                placeholder="Ej. María Pérez"
              />
              {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                <Phone className="w-4 h-4 text-gray-400" />
                Teléfono *
              </label>
              <input
                type="tel"
                {...register('contactPhone')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors"
                placeholder="+51 999 999 999"
              />
              {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                {...register('contactEmail')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors"
                placeholder="correo@ejemplo.com"
              />
              {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail.message}</p>}
            </div>
          </div>
        </section>

        {/* Treatments Section */}
        <section className="glass rounded-[2rem] p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-primary)]">
            <Plus className="w-5 h-5" />
            Tratamientos *
          </h2>
          {errors.treatmentIds && <p className="text-red-500 text-sm mb-4">{errors.treatmentIds.message}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {treatmentsData?.map((treatment: Treatment) => {
              const isSelected = selectedTreatments?.includes(treatment.id);
              return (
                <div
                  key={treatment.id}
                  onClick={() => toggleTreatment(treatment.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                      : 'border-white/50 bg-white/40 hover:bg-white/60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-[var(--color-text-body)]">{treatment.name}</span>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Schedule & Specialist */}
        <section className="glass rounded-[2rem] p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-primary)]">
            <CalendarIcon className="w-5 h-5" />
            Detalles de la Cita
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                Fecha y Hora *
              </label>
              <input
                type="datetime-local"
                {...register('scheduledAt')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors"
              />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                Duración (min) *
              </label>
              <input
                type="number"
                {...register('durationMinutes', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="15"
                step="15"
                disabled
              />
              {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                <User className="w-4 h-4 text-gray-400" />
                Especialista (Opcional)
              </label>
              <select
                {...register('stylistId')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors"
              >
                <option value="">Cualquiera disponible</option>
                {stylists?.map((stylist: Stylist) => (
                  <option key={stylist.id} value={stylist.id}>
                    {stylist.firstName} {stylist.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold mb-2">Notas Adicionales</label>
            <textarea
              {...register('notes')}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-tertiary)]/50 bg-white/50 focus:bg-white transition-colors resize-none"
              rows={3}
              placeholder="Detalles acordados por WhatsApp..."
            ></textarea>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-light)] transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirmar y Agendar'}
          </button>
        </div>
      </form>
    </div>
  );
}
