import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, User, Scissors } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { ScheduledOrdersResponse, ScheduledOrderStatus, ScheduledOrder, ScheduledOrderTreatment } from '../types';

export default function Dashboard() {
  const shopId = useAuthStore((state) => state.user?.shopId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduled-orders', shopId],
    queryFn: async () => {
      const response = await api.get<ScheduledOrdersResponse>('/scheduled-orders', {
        params: { shopId, limit: 50 },
      });
      return response.data;
    },
    enabled: !!shopId,
  });

  const getStatusBadge = (status: ScheduledOrderStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold badge-pending">Pendiente</span>;
      case 'Confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold badge-confirmed">Confirmada</span>;
      case 'Completed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold badge-completed">Completada</span>;
      case 'Cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold badge-cancelled">Cancelada</span>;
      case 'NoShow':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold badge-noshow">No Asistió</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 rounded-2xl text-center text-red-500">
        Error al cargar las citas.
      </div>
    );
  }

  const orders = data?.data || [];

  return (
    <div>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold mb-2">Citas Programadas</h1>
          <p className="text-[var(--color-text-muted)] text-lg">
            Gestión de reservas de clientes
          </p>
        </div>
      </header>

      <div className="glass rounded-[2rem] p-6 shadow-sm">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay citas programadas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-tertiary)]/30">
                  <th className="pb-4 font-semibold text-[var(--color-text-primary)]">Cliente</th>
                  <th className="pb-4 font-semibold text-[var(--color-text-primary)]">Fecha y Hora</th>
                  <th className="pb-4 font-semibold text-[var(--color-text-primary)]">Tratamientos</th>
                  <th className="pb-4 font-semibold text-[var(--color-text-primary)]">Especialista</th>
                  <th className="pb-4 font-semibold text-[var(--color-text-primary)]">Estado</th>
                </tr>
              </thead>
              <tbody className="stagger-children">
                {orders.map((order: ScheduledOrder) => (
                  <tr key={order.id} className="border-b border-[var(--color-tertiary)]/10 hover:bg-white/40 transition-colors">
                    <td className="py-4">
                      <div className="font-semibold text-[var(--color-text-body)]">
                        {order.client ? `${order.client.firstName} ${order.client.lastName}` : order.contactName}
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                        {order.contactPhone}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 font-medium">
                        <CalendarIcon className="w-4 h-4 text-[var(--color-primary)]" />
                        {format(parseISO(order.scheduledAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mt-1">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(order.scheduledAt), "HH:mm")} ({order.durationMinutes} min)
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        {order.treatments.map((t: ScheduledOrderTreatment) => (
                          <div key={t.id} className="flex items-center gap-1.5 text-sm bg-white/50 px-2 py-1 rounded-md w-fit">
                            <Scissors className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                            {t.treatment.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      {order.stylist ? (
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <User className="w-4 h-4 text-[var(--color-tertiary)]" />
                          {order.stylist.firstName} {order.stylist.lastName}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No asignado</span>
                      )}
                    </td>
                    <td className="py-4">
                      {getStatusBadge(order.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
