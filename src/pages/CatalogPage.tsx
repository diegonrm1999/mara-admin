import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, BookOpen, Layers } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { TreatmentCategory, Treatment } from '../types';

const categorySchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  displayOrder: z.number().min(0).default(0),
});

const treatmentSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  description: z.string().optional(),
  categoryId: z.string().optional().transform(v => v === '' ? undefined : v),
  percentage: z.number().min(0).max(100, 'Debe ser entre 0 y 100'),
  basePrice: z.number().min(0).optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type TreatmentFormValues = z.infer<typeof treatmentSchema>;

export default function CatalogPage() {
  const shopId = useAuthStore((state) => state.user?.shopId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Categories' | 'Treatments'>('Categories');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);

  // Queries
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', shopId],
    queryFn: async () => {
      const response = await api.get<TreatmentCategory[]>('/treatment-categories/all');
      return response.data;
    },
    enabled: !!shopId,
  });

  const { data: treatments, isLoading: loadingTreatments } = useQuery({
    queryKey: ['treatments', shopId],
    queryFn: async () => {
      const response = await api.get<Treatment[]>('/treatments/all');
      return response.data;
    },
    enabled: !!shopId,
  });

  // Mutations
  const createCategory = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return api.post('/treatment-categories', data, { headers: { 'x-shop-id': shopId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/treatment-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
    },
  });

  const createTreatment = useMutation({
    mutationFn: async (data: TreatmentFormValues) => {
      return api.post('/treatments', data, { headers: { 'x-shop-id': shopId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', shopId] });
      setIsTreatmentModalOpen(false);
      resetTreatmentForm();
    },
  });

  const deleteTreatment = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/treatments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', shopId] });
    },
  });

  const { register: registerCategory, handleSubmit: handleCategorySubmit, reset: resetCategoryForm, formState: { errors: categoryErrors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { displayOrder: 0 },
  });

  const { register: registerTreatment, handleSubmit: handleTreatmentSubmit, reset: resetTreatmentForm, formState: { errors: treatmentErrors } } = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { percentage: 0 },
  });

  const onCategorySubmit = (data: CategoryFormValues) => createCategory.mutate(data);
  const onTreatmentSubmit = (data: TreatmentFormValues) => createTreatment.mutate(data);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-[var(--color-primary)]">Catálogo</h1>
          <p className="text-[var(--color-text-muted)] text-lg">Gestiona las categorías y tratamientos del salón.</p>
        </div>
        <button
          onClick={() => activeTab === 'Categories' ? setIsCategoryModalOpen(true) : setIsTreatmentModalOpen(true)}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva {activeTab === 'Categories' ? 'Categoría' : 'Tratamiento'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('Categories')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'Categories' ? 'bg-white text-[var(--color-primary)] shadow-md' : 'text-gray-500 hover:bg-white/40'
          }`}
        >
          <Layers className="w-5 h-5" />
          Categorías
        </button>
        <button
          onClick={() => setActiveTab('Treatments')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'Treatments' ? 'bg-white text-[var(--color-primary)] shadow-md' : 'text-gray-500 hover:bg-white/40'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Tratamientos
        </button>
      </div>

      {/* Lists */}
      <div className="glass rounded-[2rem] p-8">
        {activeTab === 'Categories' ? (
          loadingCategories ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--color-primary)] w-8 h-8" /></div>
          ) : categories?.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">No hay categorías registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20 text-sm font-semibold text-[var(--color-text-body)]">
                    <th className="py-4 px-4">Nombre</th>
                    <th className="py-4 px-4 text-center">Orden</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.map((cat) => (
                    <tr key={cat.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-medium">{cat.name}</td>
                      <td className="py-4 px-4 text-center">{cat.displayOrder}</td>
                      <td className="py-4 px-4 flex justify-end gap-2">
                        <button 
                          onClick={() => { if (confirm(`¿Eliminar categoría ${cat.name}?`)) deleteCategory.mutate(cat.id); }}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loadingTreatments ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--color-primary)] w-8 h-8" /></div>
          ) : treatments?.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">No hay tratamientos registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20 text-sm font-semibold text-[var(--color-text-body)]">
                    <th className="py-4 px-4">Nombre</th>
                    <th className="py-4 px-4">Categoría</th>
                    <th className="py-4 px-4 text-center">Porcentaje (%)</th>
                    <th className="py-4 px-4 text-center">Precio Base</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {treatments?.map((treatment) => {
                    const cat = categories?.find(c => c.id === treatment.categoryId);
                    return (
                      <tr key={treatment.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-medium">
                          {treatment.name}
                          {treatment.description && <p className="text-xs text-[var(--color-text-muted)] mt-1">{treatment.description}</p>}
                        </td>
                        <td className="py-4 px-4 text-[var(--color-text-muted)]">{cat ? cat.name : '-'}</td>
                        <td className="py-4 px-4 text-center">{treatment.percentage}%</td>
                        <td className="py-4 px-4 text-center">{treatment.basePrice ? `S/ ${treatment.basePrice}` : '-'}</td>
                        <td className="py-4 px-4 flex justify-end gap-2">
                          <button 
                            onClick={() => { if (confirm(`¿Eliminar tratamiento ${treatment.name}?`)) deleteTreatment.mutate(treatment.id); }}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-primary)]">Nueva Categoría</h2>
            <form onSubmit={handleCategorySubmit(onCategorySubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre</label>
                <input {...registerCategory('name')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                {categoryErrors.name && <p className="text-red-500 text-xs mt-1">{categoryErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Orden de visualización</label>
                <input type="number" {...registerCategory('displayOrder', { valueAsNumber: true })} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors font-semibold">Cancelar</button>
                <button type="submit" disabled={createCategory.isPending} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors">
                  {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Treatment Modal */}
      {isTreatmentModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setIsTreatmentModalOpen(false)}>
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-primary)]">Nuevo Tratamiento</h2>
            <form onSubmit={handleTreatmentSubmit(onTreatmentSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre</label>
                <input {...registerTreatment('name')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                {treatmentErrors.name && <p className="text-red-500 text-xs mt-1">{treatmentErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Descripción</label>
                <textarea {...registerTreatment('description')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)] resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Categoría</label>
                <select {...registerTreatment('categoryId')} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]">
                  <option value="">Ninguna</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Porcentaje (%)</label>
                  <input type="number" {...registerTreatment('percentage', { valueAsNumber: true })} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" min="0" max="100" />
                  {treatmentErrors.percentage && <p className="text-red-500 text-xs mt-1">{treatmentErrors.percentage.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Precio Base (Opcional)</label>
                  <input type="number" {...registerTreatment('basePrice', { valueAsNumber: true, setValueAs: v => v === "" ? undefined : parseInt(v, 10) })} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-[var(--color-primary)]" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsTreatmentModalOpen(false)} className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors font-semibold">Cancelar</button>
                <button type="submit" disabled={createTreatment.isPending} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors">
                  {createTreatment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
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
