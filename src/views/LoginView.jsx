import { useState } from 'react'
import { supabase } from '../api/supabase'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Główna funkcja obsługująca logowanie, rejestrację i reset hasła
  const handleSubmit = async (e) => {
    e.preventDefault() 
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      let error;
      
      if (isForgotPassword) {
        // Resetowanie hasła
        const res = await supabase.auth.resetPasswordForEmail(email)
        error = res.error
        if (!error) {
          setSuccessMsg("Password reset link has been sent to your email.")
        }
      } else if (isRegistering) {
        // Rejestracja
        const res = await supabase.auth.signUp({ email, password })
        error = res.error
      } else {
        // Logowanie
        const res = await supabase.auth.signInWithPassword({ email, password })
        error = res.error
      }

      if (error) throw error

    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Funkcja resetująca stan formularza przy przełączaniu widoków
  const toggleMode = (mode) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (mode === 'register') {
      setIsRegistering(!isRegistering)
      setIsForgotPassword(false)
    } else if (mode === 'forgot') {
      setIsForgotPassword(true)
      setIsRegistering(false)
    } else if (mode === 'login') {
      setIsForgotPassword(false)
      setIsRegistering(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-8 w-full md:max-w-md md:mx-auto md:my-auto md:border md:border-white/30 md:rounded-3xl md:bg-[#1c1c1e] md:p-10 md:shadow-2xl md:flex-none">
      
      {/* Nagłówek */}
      <div className="flex flex-col items-center mb-10 mt-8 md:mt-0">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Splanner</h1>
        <p className="text-gray-400 text-sm text-center px-4">
          {isForgotPassword 
            ? "Enter your email to receive a password reset link" 
            : isRegistering 
              ? "Create your account" 
              : "Sign in to continue"}
        </p>
      </div>

      {/* Formularz */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#2b2b2b] text-white border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#3498db] transition-colors"
        />
        
        {!isForgotPassword && (
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#2b2b2b] text-white border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#3498db] transition-colors"
            />
            {!isRegistering && (
              <div className="flex justify-end mt-2 pr-1">
                <button 
                  type="button"
                  onClick={() => toggleMode('forgot')}
                  className="text-sm text-[#3498db] hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}

        {/* Komunikat o błędzie */}
        {errorMsg && (
          <div className="text-red-400 text-sm text-center bg-red-400/10 py-2.5 rounded-lg font-medium px-3">
            {errorMsg}
          </div>
        )}

        {/* Komunikat o sukcesie */}
        {successMsg && (
          <div className="text-green-400 text-sm text-center bg-green-400/10 py-2.5 rounded-lg font-medium px-3">
            {successMsg}
          </div>
        )}

        {/* Główny przycisk z animacją ładowania */}
        <button
          type="submit"
          disabled={isLoading || !email || (!isForgotPassword && !password)}
          className="w-full bg-[#3498db] hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl px-4 py-3.5 mt-2 transition-colors flex justify-center items-center h-14"
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
          ) : (
            isForgotPassword 
              ? "Send Reset Link" 
              : isRegistering 
                ? "Create Account" 
                : "Login"
          )}
        </button>
      </form>

      {/* Przełącznik na dole ekranu */}
      <div className="mt-6 mb-8 md:mb-0 text-center w-full">
        {isForgotPassword ? (
          <button
            onClick={() => toggleMode('login')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Login
          </button>
        ) : (
          <button
            onClick={() => toggleMode('register')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isRegistering ? "Already have an account? Login" : "No account? Register here"}
          </button>
        )}
      </div>

    </div>
  )
}