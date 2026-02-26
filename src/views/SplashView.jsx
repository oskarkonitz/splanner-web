import { useState, useEffect } from 'react'

export default function SplashView({ onFinish }) {
  // Stany odpowiadające Twoim ze Swifta
  const [statusText, setStatusText] = useState("Initializing...")
  const [progressValue, setProgressValue] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1) // 1 = widoczny, 0 = ukryty
  const [finalScale, setFinalScale] = useState(1)
  const [finalOpacity, setFinalOpacity] = useState(1)

  useEffect(() => {
    // Start - 0s
    setTimeout(() => {
      setProgressValue(20)
    }, 50)

    // Etap 1 - 0.5s
    setTimeout(() => {
      setStatusText("Loading data...")
      setProgressValue(65)
    }, 500)

    // Etap 2 - 1.4s
    setTimeout(() => {
      setStatusText("Preparing dashboard...")
      setProgressValue(95)
    }, 1400)

    // Etap 3 (Finisz) - 2.2s
    setTimeout(() => {
      setStatusText("Ready!")
      setProgressValue(100)
    }, 2200)

    // Wybuch i ukrycie tekstu - 2.5s
    setTimeout(() => {
      setTextOpacity(0)
    }, 2500)

    // Powiększenie loga (Blast off) - 2.7s
    setTimeout(() => {
      setFinalScale(15)
      setFinalOpacity(0)
    }, 2700)

    // Zakończenie splasha - 3.1s (po animacji wybuchu)
    setTimeout(() => {
      onFinish()
    }, 3100)
  }, [onFinish])

  return (
    // Tło z Twoim kolorem ze Swifta: #2b2b2b
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#2b2b2b] z-50 transition-opacity duration-500 ease-in"
      style={{ opacity: finalOpacity }}
    >
      {/* Kontener Loga - skaluje się przy "Blast off" */}
      <div 
        className="transition-transform duration-500 ease-in-out flex flex-col items-center justify-center w-full"
        style={{ transform: `scale(${finalScale})` }}
      >
        {/* LOGO - animacja CSS (opisana w kroku 2) + Twój plik z folderu public */}
        <img 
          src="/icon.png" 
          alt="App Logo" 
          className="w-[120px] h-[120px] rounded-[30px] shadow-[0_5px_10px_rgba(0,0,0,0.3)] animate-idle-float mb-8"
        />

        {/* Sekcja Tekstu i Paska */}
        <div 
          className="flex flex-col items-center gap-4 transition-opacity duration-300"
          style={{ opacity: textOpacity }}
        >
          <span className="text-white font-bold text-sm tracking-wide">
            {statusText}
          </span>

          {/* Pasek postępu (odpowiednik ProgressView) */}
          <div className="w-[250px] h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#3498db] transition-all duration-500 ease-out"
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}