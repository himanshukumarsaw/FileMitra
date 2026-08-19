import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth/login', { replace: true, state: { from: location } })
    }
  }, [isAuthenticated, isLoading, navigate, location])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-light border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
