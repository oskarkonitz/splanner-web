import { useState, useEffect } from 'react'

export default function SplashView({ onFinish, videoUrl }) {
  // Stany odpowiadające Twoim ze Swifta
  const [statusText, setStatusText] = useState("Initializing...")
  const [progressValue, setProgressValue] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1) // 1 = widoczny, 0 = ukryty
  const [finalScale, setFinalScale] = useState(1)
  const [finalOpacity, setFinalOpacity] = useState(1)
  
  // Stan do płynnego znikania wideo
  const [videoOpacity, setVideoOpacity] = useState(1)

  useEffect(() => {
    // Jeżeli dostaliśmy wideo, nie odpalaj timerów z logiem
    if (videoUrl) return;

    // Start - 0s
    setTimeout(() => {
      setProgressValue(20)
    }, 50)

    // Etap 1 - 0.5s
    setTimeout(() => {
      setStatusText("Loading data...")
      setProgressValue(65)
    }, 200)

    // Etap 2 - 1.4s
    setTimeout(() => {
      setStatusText("Preparing dashboard...")
      setProgressValue(95)
    }, 700)

    // Etap 3 (Finisz) - 2.2s
    setTimeout(() => {
      setStatusText("Ready!")
      setProgressValue(100)
    }, 500)

    // Wybuch i ukrycie tekstu - 2.5s
    setTimeout(() => {
      setTextOpacity(0)
    }, 600)

    // Powiększenie loga (Blast off) - 2.7s
    setTimeout(() => {
      setFinalScale(15)
      setFinalOpacity(0)
    }, 1000)

    // Zakończenie splasha - 3.1s (po animacji wybuchu)
    setTimeout(() => {
      onFinish()
    }, 3100)
  }, [onFinish, videoUrl])

  // Funkcja obsługująca koniec filmu (lub pominięcie) z płynnym przejściem
  const handleVideoEnd = () => {
    setVideoOpacity(0); // Zmieniamy krycie na 0, odpala się animacja CSS
    
    // Czekamy 500ms (tyle ile trwa animacja 'duration-500'), a potem wpuszczamy do apki
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  // Jeśli jest ustawiony link z wideo - wyświetl wideo
  if (videoUrl) {
    return (
      <div 
        className="fixed inset-0 bg-[#2b2b2b] z-50 flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-in-out"
        style={{ opacity: videoOpacity }}
      >
        <video 
          src={videoUrl} 
          autoPlay 
          muted 
          playsInline 
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
        >
          Your browser does not support the video tag.
        </video>

        {/* NOWE: Elegancki przycisk Skip w prawym dolnym rogu */}
        <button 
          onClick={handleVideoEnd}
          className="absolute bottom-8 right-8 z-10 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-md transition-all border border-white/10 shadow-lg"
        >
          Skip
        </button>
      </div>
    )
  }

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
        {/* LOGO - animacja CSS + Twój plik z folderu public */}
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