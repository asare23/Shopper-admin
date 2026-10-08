import { useEffect, useState } from 'react'
import { supabase } from './config'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  return session ? <Dashboard user={session.user} /> : <Login />
}
