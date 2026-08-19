/**
 * Employee authentication API client — talks to the Forest Department
 * backend through the Vite proxy (/api) for the employee portal.
 */

import type { Employee } from '@/providers/EmployeeAuthProvider'
import { ApiError } from '@/services/api'

const API_BASE = '/api'

export type VerifyEmployeeResponse =
  | ({ success: true } & Employee & { registrationId: string })
  | ({ success: false; message: string; code?: string })

export type RegisterResponse = { success: true; employee: Employee } | { success: false; message: string }

export type LoginResponse = { success: true; token: string; employee: Employee } | { success: false; message: string }

function hasMessage(v: unknown): v is { message: string } {
  return typeof v === 'object' && v !== null && 'message' in v && typeof (v as { message: unknown }).message === 'string'
}

async function employeeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  const json: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = hasMessage(json) ? json.message : `API error ${res.status}`
    throw new ApiError(msg, res.status)
  }

  return json as T
}

export async function generateCaptcha(): Promise<{ challengeId: string; question: string; answer?: string }> {
  return employeeFetch('/auth/employee/captcha')
}

export async function verifyEmployee(data: {
  employeeCode: string
  dob: string
  captchaToken: string
  captchaAnswer: string
}): Promise<VerifyEmployeeResponse> {
  return employeeFetch('/auth/employee/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function sendOtp(registrationId: string): Promise<{ success: boolean; message: string }> {
  return employeeFetch('/auth/employee/otp/send', {
    method: 'POST',
    body: JSON.stringify({ registrationId }),
  })
}

export async function verifyOtp(
  registrationId: string,
  otp: string
): Promise<{ success: boolean; message: string; resetToken?: string }> {
  return employeeFetch('/auth/employee/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ registrationId, otp }),
  })
}

export async function registerAccount(data: {
  registrationId: string
  loginId: string
  password: string
  confirmPassword: string
}): Promise<RegisterResponse> {
  return employeeFetch('/auth/employee/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(data: {
  loginId: string
  password: string
}): Promise<LoginResponse> {
  return employeeFetch('/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function logout(): Promise<{ success: boolean }> {
  const token = localStorage.getItem('employee.token')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/auth/employee/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })

  if (!res.ok) {
    throw new ApiError(`Logout failed ${res.status}`, res.status)
  }

  return { success: true }
}

export async function getMe(): Promise<Employee> {
  const token = localStorage.getItem('employee.token')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/auth/employee/me`, {
    headers,
  })

  if (!res.ok) {
    throw new ApiError(`Failed to fetch profile ${res.status}`, res.status)
  }

  return (await res.json()) as Employee
}

export async function forgotPassword(data: {
  employeeCode: string
  captchaToken: string
  captchaAnswer: string
}): Promise<{ success: boolean; message: string }> {
  return employeeFetch('/auth/employee/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function verifyResetOtp(
  employeeCode: string,
  otp: string
): Promise<{ success: boolean; resetToken: string; message?: string }> {
  return employeeFetch('/auth/employee/forgot-password/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ employeeCode, otp }),
  })
}

export async function resetPassword(data: {
  resetToken: string
  newPassword: string
  confirmPassword: string
}): Promise<{ success: boolean; message: string }> {
  return employeeFetch('/auth/employee/forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function refreshToken(): Promise<{ token: string }> {
  return employeeFetch('/auth/employee/refresh-session', {
    method: 'POST',
  })
}
