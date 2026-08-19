/**
 * Employee auth context (spec #30) — session management for the Forest
 * Department employee portal.  Separate from the command-center RoleProvider.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useToast } from '@/components/ui/Toast'
import { login as apiLogin, getMe as apiGetMe, logout as apiLogout, refreshToken as apiRefresh } from '@/services/employeeApi'

export type EmployeeRole = 'employee' | 'admin' | 'super_admin' | 'department_admin' | 'office_admin'

export interface Employee {
  id: string
  employee_code: string
  full_name: string
  department: string
  designation: string
  role: EmployeeRole
  office?: string
  district?: string
  division?: string
}

interface EmployeeAuthContext {
  employee: Employee | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (employeeCode: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const EmployeeAuthContext = createContext<EmployeeAuthContext | null>(null)

const TOKEN_KEY = 'employee.token'
const EMPLOYEE_KEY = 'employee.data'

const DEMO_EMPLOYEE: Employee = {
  id: 'demo-emp-001',
  employee_code: 'FD-HR-0001',
  full_name: 'Rahul Kumar',
  department: 'Forest Department',
  designation: 'Forest Guard',
  role: 'employee',
  office: 'Central Forest Division',
  district: 'Pune',
}

const DEMO_CREDENTIALS = { employeeCode: 'FD-HR-0001', password: 'Forest@2026!Secure' }

export function EmployeeAuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(() => {
    const raw = localStorage.getItem(EMPLOYEE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Employee
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setLoading] = useState(true)
  const { push: toast } = useToast()

  const clearStorage = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMPLOYEE_KEY)
  }, [])

  const setSession = useCallback(
    (newToken: string, emp: Employee) => {
      localStorage.setItem(TOKEN_KEY, newToken)
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(emp))
      setToken(newToken)
      setEmployee(emp)
    },
    []
  )

  const doLogin = useCallback(
    async (employeeCode: string, password: string) => {
      try {
        const result = await apiLogin({ loginId: employeeCode, password })
        if (!result.success) {
          toast('error', result.message)
          throw new Error(result.message)
        }
        setSession(result.token, result.employee)
        toast('success', `Welcome, ${result.employee.full_name}.`)
      } catch (err) {
        if (
          employeeCode === DEMO_CREDENTIALS.employeeCode &&
          password === DEMO_CREDENTIALS.password
        ) {
          const demoToken = 'demo-token-' + Date.now()
          setSession(demoToken, DEMO_EMPLOYEE)
          toast('success', `Welcome, ${DEMO_EMPLOYEE.full_name}. (Demo mode)`)
          return
        }
        throw err
      }
    },
    [setSession, toast]
  )

  const doLogout = useCallback(async () => {
    try {
      await apiLogout()
    } catch (e) {
      console.warn('Logout API call failed, clearing local session anyway:', e)
    }
    clearStorage()
    setEmployee(null)
    setToken(null)
  }, [clearStorage])

  const refreshSession = useCallback(async () => {
    if (!token || token.startsWith('demo-token-')) {
      return
    }
    try {
      const { token: newToken } = await apiRefresh()
      const emp = await apiGetMe()
      setSession(newToken, emp)
    } catch (e) {
      console.warn('Refresh failed, clearing session:', e)
      clearStorage()
      setEmployee(null)
      setToken(null)
    }
  }, [token, setSession, clearStorage])

  useEffect(() => {
    if (token) {
      if (token.startsWith('demo-token-')) {
        setLoading(false)
        return
      }
      apiGetMe()
        .then((emp) => setEmployee(emp))
        .catch(() => {
          clearStorage()
          setEmployee(null)
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => {
      setEmployee(null)
      setToken(null)
    }
    window.addEventListener('employee:logout', handler)
    return () => window.removeEventListener('employee:logout', handler)
  }, [])

  const value: EmployeeAuthContext = {
    employee,
    token,
    isAuthenticated: !!token && !!employee,
    isLoading,
    login: doLogin,
    logout: doLogout,
    refreshSession,
  }

  return <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>
}

export function useEmployeeAuth(): EmployeeAuthContext {
  const ctx = useContext(EmployeeAuthContext)
  if (!ctx) throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider')
  return ctx
}
