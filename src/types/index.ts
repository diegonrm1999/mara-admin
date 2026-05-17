// ─── Auth Types ──────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  role: string;
  id: string;
  name: string;
  shopId: string;
}

export interface AuthUser {
  token: string;
  refreshToken: string;
  role: string;
  id: string;
  name: string;
  shopId: string;
}

// ─── Treatment Types ────────────────────────────
export interface Treatment {
  id: string;
  name: string;
  description?: string;
  basePrice?: number;
  percentage: number;
  categoryId?: string;
  category?: TreatmentCategory;
  shopId: string;
}

export interface TreatmentCategory {
  id: string;
  name: string;
  displayOrder: number;
  treatments: Treatment[];
}

// ─── User / Stylist Types ───────────────────────
export interface Stylist {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
}

// ─── Scheduled Order Types ──────────────────────
export type ScheduledOrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Cancelled'
  | 'NoShow'
  | 'Completed';

export interface ScheduledOrderTreatment {
  id: string;
  treatmentId: string;
  treatment: {
    id: string;
    name: string;
    basePrice?: number;
  };
}

export interface ScheduledOrder {
  id: string;
  shopId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  clientId?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
  stylistId?: string;
  stylist?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  scheduledAt: string;
  durationMinutes: number;
  treatments: ScheduledOrderTreatment[];
  status: ScheduledOrderStatus;
  notes?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledOrdersResponse {
  data: ScheduledOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Create Booking DTO ─────────────────────────
export interface CreateScheduledOrderDto {
  shopId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  treatmentIds: string[];
  scheduledAt: string;
  durationMinutes: number;
  stylistId?: string;
  notes?: string;
}

// ─── Query DTO ──────────────────────────────────
export interface QueryScheduledOrdersDto {
  shopId: string;
  page?: number;
  limit?: number;
  status?: ScheduledOrderStatus;
  date?: string;
  stylistId?: string;
}
