import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import LoginForm from './components/LoginForm'
import AdminRoles from './components/AdminRoles'

function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p>Cargando...</p>
  if (!session) return <LoginForm />

  return (
    <div>
      <div style={{ textAlign: 'right', padding: '1rem' }}>
        <span style={{ marginRight: 12 }}>{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
      <AdminRoles />
    </div>
  )
}

export default App