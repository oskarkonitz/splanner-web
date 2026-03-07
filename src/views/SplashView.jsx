import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'

export default function SplashView({ onFinish, videoUrl }) {
  const { isLoading } = useData()
  const [statusText, setStatusText] = useState("Initializing...")
  const [progressValue, setProgressValue] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1) // 1 = widoczny, 0 = ukryty
  const [finalScale, setFinalScale] = useState(1)
  const [finalOpacity, setFinalOpacity] = useState(1)
  
  // Stan do płynnego znikania wideo
  const [videoOpacity, setVideoOpacity] = useState(1)

  // Faza 1: Uruchomienie Splasha w tym samym czasie co ładują się dane
  useEffect(() => {
    if (videoUrl) return;

    setProgressValue(30)
    setStatusText("Loading data...")

    // Mały update paska, żeby interfejs żył dla wolniejszych połączeń
    const timer = setTimeout(() => {
      if (isLoading) {
         setProgressValue(65)
         setStatusText("Syncing dashboard...")
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [videoUrl, isLoading])

  // Faza 2: Gotowość (kiedy pierwsza partia danych z DataContext się załadowała)
  useEffect(() => {
    if (videoUrl || isLoading) return; 

    setStatusText("Preparing dashboard...")
    setProgressValue(90)

    const t1 = setTimeout(() => {
      setStatusText("Ready!")
      setProgressValue(100)
    }, 400)

    const t2 = setTimeout(() => {
      setTextOpacity(0)
    }, 800)

    const t3 = setTimeout(() => {
      setFinalScale(15)
      setFinalOpacity(0)
    }, 1200)

    const t4 = setTimeout(() => {
      onFinish()
    }, 1700)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [isLoading, videoUrl, onFinish])

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