/**
 * Admin API client — talks to the Forest Department backend admin endpoints.
 */

import { apiFetch } from '@/services/api'

export interface AdminEmployee {
  _id?: string
  id?: string
  employee_code: string
  full_name: string
  department: string
  designation: string
  role: string
  office?: string
  district?: string
  division?: string
  status: string
  registration_status?: string
  email?: string
  phone?: string
  createdAt?: string
  updatedAt?: string
}

export interface AdminRegistration {
  _id?: string
  id?: string
  employee_code: string
  full_name: string
  dob: string
  email?: string
  phone?: string
  department?: string
  designation?: string
  status: 'PENDING' | 'OTP_VERIFIED' | 'ACCOUNT_CREATED' | 'REJECTED'
  captchaVerified?: boolean
  otpVerified?: boolean
  createdAt: string
  updatedAt?: string
}

export interface AdminAuditLog {
  _id?: string
  id?: string
  timestamp: string
  event_type: string
  employee_code?: string
  employee_name?: string
  ip: string
  user_agent?: string
  success: boolean
  metadata?: Record<string, unknown>
  action?: string
  actor?: string
  target?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminStats {
  totalEmployees: number
  activeRegistrations: number
  pendingApprovals: number
  auditEvents: number
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats')
}

export async function fetchAdminEmployees(params: {
  page?: number
  limit?: number
  search?: string
  department?: string
  status?: string
} = {}): Promise<PaginatedResponse<AdminEmployee>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.search) qs.set('search', params.search)
  if (params.department) qs.set('department', params.department)
  if (params.status) qs.set('status', params.status)
  const query = qs.toString()
  return apiFetch<PaginatedResponse<AdminEmployee>>(`/admin/employees${query ? `?${query}` : ''}`)
}

export async function updateAdminEmployee(id: string, data: Partial<AdminEmployee>): Promise<AdminEmployee> {
  const raw = await apiFetch<AdminEmployee>(`/admin/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return raw
}

export async function updateEmployeeStatus(id: string, status: string): Promise<AdminEmployee> {
  const raw = await apiFetch<AdminEmployee>(`/admin/employees/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return raw
}

export async function resetEmployeeAccess(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/admin/employees/${encodeURIComponent(id)}/reset-access`, {
    method: 'POST',
    body: '{}',
  })
}

export async function fetchAdminRegistrations(params: {
  page?: number
  limit?: number
  status?: string
} = {}): Promise<PaginatedResponse<AdminRegistration>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.status) qs.set('status', params.status)
  const query = qs.toString()
  return apiFetch<PaginatedResponse<AdminRegistration>>(`/admin/registrations${query ? `?${query}` : ''}`)
}

export async function approveRegistration(id: string): Promise<AdminRegistration> {
  return apiFetch<AdminRegistration>(`/admin/registrations/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: '{}',
  })
}

export async function rejectRegistration(id: string): Promise<AdminRegistration> {
  return apiFetch<AdminRegistration>(`/admin/registrations/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: '{}',
  })
}

export async function fetchAdminAuditLogs(params: {
  page?: number
  limit?: number
  event_type?: string
  start_date?: string
  end_date?: string
} = {}): Promise<PaginatedResponse<AdminAuditLog>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.event_type) qs.set('event_type', params.event_type)
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date) qs.set('end_date', params.end_date)
  const query = qs.toString()
  return apiFetch<PaginatedResponse<AdminAuditLog>>(`/admin/audit-logs${query ? `?${query}` : ''}`)
}
