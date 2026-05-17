import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, Calendar, BookOpen, Loader2, X, Plus } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { Stylist, Treatment } from '../types';

const userSchema = z.object({
  firstName: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().min(2, 'Apellido requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['Stylist', 'Supervisor']),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm requerido'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm requerido'),
});

type UserFormValues = z.infer<typeof userSchema>;
type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function UsersPage() {
  const shopId = useAuthStore((state) => state.user?.shopId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Stylist' | 'Supervisor'>('Stylist');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [treatmentsUser, setTreatmentsUser] = useState<Stylist | null>(null);
  const [schedulesUser, setSchedulesUser] = useState<Stylist | null>(null);

  // Queries
  const { data: stylists, isLoading: loadingStylists } = useQuery({
    queryKey: ['stylists', shopId],
    queryFn: async () => {
      const response = await api.get<Stylist[]>('/users/stylists');
      return response.data;
    },
    enabled: !!shopId,
  });

  const { data: supervisors, isLoading: loadingSupervisors } = useQuery({
    queryKey: ['supervisors', shopId],
    queryFn: async () => {
      const response = await api.get<Stylist[]>('/users/supervisors');
      return response.data;
    },
    enabled: !!shopId,
  });

  const { data: treatmentsList } = useQuery({
    queryKey: ['treatments', shopId],
    queryFn: async () => {
      const response = await api.get<Treatment[]>('/treatments/all');
      return response.data;
    },
    enabled: !!shopId,
  });

  const { data: userTreatments, isLoading: loadingUserTreatments } = useQuery({
    queryKey: ['user-treatments', treatmentsUser?.id],
    queryFn: async () => {
      const response = await api.get<any[]>(`/user-treatments/${treatmentsUser?.id}`);
      return response.data;
    },
    enabled: !!treatmentsUser,
  });

  const { data: userSchedules, isLoading: loadingUserSchedules } = useQuery({
    queryKey: ['user-schedules', schedulesUser?.id],
    queryFn: async () => {
      const response = await api.get<any[]>(`/user-schedules/${schedulesUser?.id}`);
      return response.data;
    },
    enabled: !!schedulesUser,
  });

  // User Mutations
  const createUser = useMutation({
    mutationFn: async (data: UserFormValues) => {
      return api.post('/users/create', { ...data, shopId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylists', shopId] });
      queryClient.invalidateQueries({ queryKey: ['supervisors', shopId] });
      setIsUserModalOpen(false);
      resetUserForm();
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylists', shopId] });
      queryClient.invalidateQueries({ queryKey: ['supervisors', shopId] });
    },
  });

  // Treatments Mutations
  const updateUserTreatments = useMutation({
    mutationFn: async (treatmentIds: string[]) => {
      return api.put(`/user-treatments/${treatmentsUser?.id}`, { treatmentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-treatments', treatmentsUser?.id] });
    },
  });

  // Schedule Mutations
  const createSchedule = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      return api.post('/user-schedules', { ...data, userId: schedulesUser?.id, shopId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-schedules', schedulesUser?.id] });
      resetScheduleForm();
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/user-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-schedules', schedulesUser?.id] });
    },
  });

  const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUserForm, formState: { errors: userErrors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'Stylist' },
  });

  const { register: registerSchedule, handleSubmit: handleScheduleSubmit, reset: resetScheduleForm } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }
  });

  const onUserSubmit = (data: UserFormValues) => createUser.mutate(data);
  const onScheduleSubmit = (data: ScheduleFormValues) => createSchedule.mutate(data);

  // --- Render Treatments Modal ---
  const renderTreatmentsModal = () => {
    if (!treatmentsUser) return null;
    
    const assignedIds = new Set(userTreatments?.map((ut: any) => ut.treatmentId) || []);
    
    const handleToggleTreatment = (treatmentId: string) => {
      const newIds = new Set(assignedIds);
      if (newIds.has(treatmentId)) {
        newIds.delete(treatmentId);
      } else {
        newIds.add(treatmentId);
      }
      updateUserTreatments.mutate(Array.from(newIds));
    };

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setTreatmentsUser(null)}>
        <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">
              Tratamientos - {treatmentsUser.firstName}
            </h2>
            <button onClick={() => setTreatmentsUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {loadingUserTreatments ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-primary)]" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {treatmentsList?.map(treatment => {
                  const isAssigned = assignedIds.has(treatment.id);
                  return (
                    <div 
                      key={treatment.id}
                      onClick={() => handleToggleTreatment(treatment.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isAssigned ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[var(--color-text-body)]">{treatment.name}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isAssigned ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-gray-300'
                        }`}>
                          {isAssigned && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() => setTreatmentsUser(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // --- Render Schedules Modal ---
  const renderSchedulesModal = () => {
    if (!schedulesUser) return null;

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setSchedulesUser(null)}>
        <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">
              Horarios - {schedulesUser.firstName}
            </h2>
            <button onClick={() => setSchedulesUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {/* Add Schedule Form */}
            <form onSubmit={handleScheduleSubmit(onScheduleSubmit)} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Día</label>
                <select {...registerSchedule('dayOfWeek', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Inicio</label>
                <input type="time" {...registerSchedule('startTime')} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Fin</label>
                <input type="time" {...registerSchedule('endTime')} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200" />
              </div>
              <button type="submit" disabled={createSchedule.isPending} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-light)] h-[42px] flex items-center justify-center">
                {createSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            {/* List Schedules */}
            {loadingUserSchedules ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-primary)]" /></div>
            ) : userSchedules?.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-muted)]">No hay horarios configurados.</div>
            ) : (
              <div className="space-y-2">
                {userSchedules?.map((schedule: any) => (
                  <div key={schedule.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <span className="font-bold text-[var(--color-text-body)] w-24 inline-block">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                      <span className="text-[var(--color-text-muted)]">{schedule.startTime} - {schedule.endTime}</span>
                    </div>
                    <button 
                      onClick={() => deleteSchedule.mutate(schedule.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const usersList = activeTab === 'Stylist' ? stylists : supervisors;
  const isLoading = activeTab === 'Stylist' ? loadingStylists : loadingSupervisors;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-[var(--color-primary)]">Personal</h1>
          <p className="text-[var(--color-text-muted)] text-lg">Gestiona a los estilistas y supervisores.</p>
        </div>
        <button
          onClick={() => { resetUserForm({ role: activeTab }); setIsUserModalOpen(true); }}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo {activeTab === 'Stylist' ? 'Estilista' : 'Supervisor'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('Stylist')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            activeTab === 'Stylist' ? 'bg-white text-[var(--color-primary)] shadow-md' : 'text-gray-500 hover:bg-white/40'
          }`}
        >
          Estilistas
        </button>
        <button
          onClick={() => setActiveTab('Supervisor')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            activeTab === 'Supervisor' ? 'bg-white text-[var(--color-primary)] shadow-md' : 'text-gray-500 hover:bg-white/40'
          }`}
        >
          Supervisores
        </button>
      </div>

      {/* List */}
      <div className="glass rounded-[2rem] p-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-[var(--color-primary)] w-8 h-8" />
          </div>
        ) : usersList?.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            No hay {activeTab === 'Stylist' ? 'estilistas' : 'supervisores'} registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/20 text-sm font-semibold text-[var(--color-text-body)]">
                  <th className="py-4 px-4">Nombre</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersList?.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium">{user.firstName} {user.lastName}</td>
                    <td className="py-4 px-4 text-[var(--color-text-muted)]">{user.email || '-'}</td>
                    <td className="py-4 px-4 flex justify-end gap-2">
                      {activeTab === 'Stylist' && (
                        <>
                          <button onClick={() => setSchedulesUser(user)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors tooltip-trigger" title="Horarios">
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button onClick={() => setTreatmentsUser(user)} className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors tooltip-trigger" title="Tratamientos">
                            <BookOpen className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar a ${user.firstName}?`)) {
                            deleteUser.mutate(user.id);
                          }
                        }}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {renderTreatmentsModal()}
      {renderSchedulesModal()}

      {isUserModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setIsUserModalOpen(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-primary)]">
              Nuevo {activeTab === 'Stylist' ? 'Estilista' : 'Supervisor'}
            </h2>
            <form onSubmit={handleUserSubmit(onUserSubmit)} className="space-y-4">
              <input type="hidden" {...registerUser('role')} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Nombre</label>
                  <input {...registerUser('firstName')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                  {userErrors.firstName && <p className="text-red-500 text-xs mt-1">{userErrors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Apellido</label>
                  <input {...registerUser('lastName')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                  {userErrors.lastName && <p className="text-red-500 text-xs mt-1">{userErrors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input type="email" {...registerUser('email')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                {userErrors.email && <p className="text-red-500 text-xs mt-1">{userErrors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Contraseña</label>
                <input type="password" {...registerUser('password')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                {userErrors.password && <p className="text-red-500 text-xs mt-1">{userErrors.password.message}</p>}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors font-semibold">
                  Cancelar
                </button>
                <button type="submit" disabled={createUser.isPending} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors">
                  {createUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
