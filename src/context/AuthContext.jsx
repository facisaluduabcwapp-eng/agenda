import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando sesión
  const [role, setRole] = useState(null)
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
      return
    }

    let cancelled = false
    setRoleLoading(true)

    supabase
      .from('user_roles')
      .select('rol')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setRole(error ? null : data.rol)
        setRoleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const value = {
    session,
    role,
    // "cargando" cubre tanto la sesión inicial como el rol, una vez
    // que sabemos que hay sesión — así ProtectedRoute solo checa un flag.
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