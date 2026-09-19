import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando sesión
  const [role, setRole] = useState(null)
  const [isActive, setIsActive] = useState(undefined)
  const [requestStatus, setRequestStatus] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setRole(null)
      setIsActive(null)
      setRequestStatus(null)
      return
    }

    let cancelled = false
    setRoleLoading(true)

    Promise.all([
      supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', session.user.id)
        .single(),
      supabase
        .from('profiles')
        .select('activo, estado_solicitud')
        .eq('id', session.user.id)
        .single(),
    ]).then(([roleResult, profileResult]) => {
      if (cancelled) return

      const currentRole = roleResult.error ? null : roleResult.data?.rol ?? null
      setRole(currentRole)
      setIsActive(
        currentRole === 'admin' ||
          (!profileResult.error &&
            !!profileResult.data?.activo &&
            profileResult.data?.estado_solicitud !== 'pendiente' &&
            profileResult.data?.estado_solicitud !== 'rechazada' &&
            profileResult.data?.estado_solicitud !== 'bloqueada')
      )
      setRequestStatus(profileResult.error ? null : profileResult.data?.estado_solicitud ?? null)
      setRoleLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [session])

  const value = {
    session,
    role,
    isActive,
    requestStatus,
    loading: session === undefined || (!!session && roleLoading),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}