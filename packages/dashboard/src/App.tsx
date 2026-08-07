import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Alerts } from '@/pages/Alerts'
import { MapPage } from '@/pages/Map'
import { Nodes } from '@/pages/Nodes'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'map', element: <MapPage /> },
      { path: 'nodes', element: <Nodes /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
