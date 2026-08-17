import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { RoleProvider } from '@/providers/RoleProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { Layout } from '@/components/layout/Layout'
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

const router = createBrowserRouter([
  // Public landing page — deliberately outside the dashboard shell
  { path: '/', element: <Home /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'dispatch', element: <DispatchPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'nodes', element: <Nodes /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  // Standalone full-screen route — open on a phone to turn it into a Forest Guard node
  { path: '/node', element: <NodePage /> },
])

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RoleProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </RoleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
