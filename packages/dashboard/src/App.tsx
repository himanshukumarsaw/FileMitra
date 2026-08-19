import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { RoleProvider } from '@/providers/RoleProvider'
import { EmployeeAuthProvider } from '@/providers/EmployeeAuthProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { Layout } from '@/components/layout/Layout'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { Home } from '@/pages/Home'
import { Dashboard } from '@/pages/Dashboard'
import { Alerts } from '@/pages/Alerts'
import { MapPage } from '@/pages/Map'
import { Nodes } from '@/pages/Nodes'
import { Analytics } from '@/pages/Analytics'
import { DispatchPage } from '@/pages/DispatchPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { Settings } from '@/pages/Settings'
import { AuditLogPage } from '@/pages/AuditLogPage'
import { NodePage } from '@/pages/NodePage'
import { Login as EmployeeLogin } from '@/pages/auth/Login'
import { Signup } from '@/pages/auth/Signup'
import { OtpVerification } from '@/pages/auth/OtpVerification'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { EmployeeDashboard } from '@/pages/EmployeeDashboard'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminEmployees } from '@/pages/admin/AdminEmployees'
import { AdminRegistrations } from '@/pages/admin/AdminRegistrations'
import { AdminAuditLogs } from '@/pages/admin/AdminAuditLogs'
import { AnalystDashboard } from '@/pages/AnalystDashboard'
import { Payment } from '@/pages/Payment'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'dispatch', element: <DispatchPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'nodes', element: <Nodes /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'analytics/analyst', element: <AnalystDashboard /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: 'settings', element: <Settings /> },
      { path: 'payment', element: <Payment /> },
      { path: 'employee/dashboard', element: <EmployeeDashboard /> },
    ],
  },
  { path: '/node', element: <AuthGuard><NodePage /></AuthGuard> },
  { path: '/auth/login', element: <EmployeeLogin /> },
  { path: '/auth/signup', element: <Signup /> },
  { path: '/auth/otp-verification', element: <OtpVerification /> },
  { path: '/auth/forgot-password', element: <ForgotPassword /> },
  { path: '/admin', element: <AuthGuard><AdminDashboard /></AuthGuard> },
  { path: '/admin/employees', element: <AuthGuard><AdminEmployees /></AuthGuard> },
  { path: '/admin/registrations', element: <AuthGuard><AdminRegistrations /></AuthGuard> },
  { path: '/admin/audit-logs', element: <AuthGuard><AdminAuditLogs /></AuthGuard> },
])

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RoleProvider>
          <ToastProvider>
            <EmployeeAuthProvider>
              <RouterProvider router={router} />
            </EmployeeAuthProvider>
          </ToastProvider>
        </RoleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}