import { useState } from 'react'
import { supabase } from '../api/supabase'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Funkcja obsługująca logowanie i rejestrację z Supabase
  const handleAuth = async (e) => {
    e.preventDefault() // Zapobiega przeładowaniu strony
    setIsLoading(true)
    setErrorMsg(null)

    try {
      let error;
      if (isRegistering) {
        // Rejestracja
        const res = await supabase.auth.signUp({ email, password })
        error = res.error
      } else {
        // Logowanie
        const res = await supabase.auth.signInWithPassword({ email, password })
        error = res.error
      }

      // Jeśli Supabase wyrzuci błąd (np. złe hasło), pokazujemy go
      if (error) throw error

    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // KONTENER RESPANSYWNY:
    // Na telefonie: flex-1 (wypełnia ekran), brak ramki
    // Na kompie (md:): maksymalna szerokość 400px, wyśrodkowany, biała ramka, zaokrąglony, własne tło
    <div className="flex-1 flex flex-col justify-center px-8 w-full md:max-w-md md:mx-auto md:my-auto md:border md:border-white/30 md:rounded-3xl md:bg-[#1c1c1e] md:p-10 md:shadow-2xl md:flex-none">
      
      {/* Nagłówek */}
      <div className="flex flex-col items-center mb-10 mt-8 md:mt-0">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">StudyPlanner</h1>
        <p className="text-gray-400 text-sm">
          {isRegistering ? "Create your account" : "Sign in to continue"}
        </p>
      </div>

      {/* Formularz */}
      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#2b2b2b] text-white border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#3498db] transition-colors"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-[#2b2b2b] text-white border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#3498db] transition-colors"
        />

        {/* Komunikat o błędzie */}
        {errorMsg && (
          <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Główny przycisk z animacją ładowania */}
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full bg-[#3498db] hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold rounded-xl px-4 py-3.5 mt-4 transition-colors flex justify-center items-center h-14"
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
          ) : (
            isRegistering ? "Create Account" : "Login"
          )}
        </button>
      </form>

      {/* Przełącznik Logowanie / Rejestracja */}
      <button
        onClick={() => {
          setIsRegistering(!isRegistering)
          setErrorMsg(null)
        }}
        className="mt-6 mb-8 md:mb-0 text-sm text-gray-400 hover:text-white transition-colors text-center w-full"
      >
        {isRegistering ? "Already have an account? Login" : "No account? Register here"}
      </button>

    </div>
  )
}