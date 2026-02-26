import { useState, useEffect } from 'react'
import { supabase } from './api/supabase'
import SplashView from './views/SplashView'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'

import { DataProvider } from './context/DataContext'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="bg-[#2b2b2b] min-h-screen text-white relative flex flex-col">
      <div className="flex-1 flex flex-col">
        {!session ? (
          <div className="flex-1 flex flex-col justify-center">
            <LoginView />
          </div>
        ) : (
          <DataProvider session={session}>
            <HomeView />
          </DataProvider>
        )}
      </div>

      {showSplash && (
        <div className="absolute inset-0 z-50">
          <SplashView onFinish={() => setShowSplash(false)} />
        </div>
      )}
    </div>
  )
}

export default App