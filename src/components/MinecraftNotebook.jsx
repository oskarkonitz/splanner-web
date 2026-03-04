import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';

// --- ZEWNĘTRZNY KOMPONENT EDYTORA ---
const PageEditor = React.memo(({ page, onBlur, registerRef }) => {
  const divRef = useRef(null);
  const initialContent = useRef(page.content || '');

  useEffect(() => {
    if (divRef.current) {
      registerRef(page.id, divRef.current);
    }
    return () => {
      registerRef(page.id, null);
    };
  }, [page.id, registerRef]);

  return (
    <div
      ref={divRef}
      className="minecraft-page-content flex-1 outline-none font-medium leading-relaxed overflow-y-auto no-scrollbar break-words whitespace-pre-wrap relative z-20"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: "#1d140b",
        fontSize: "1.1rem",
        minHeight: "100%",
        paddingBottom: "2.5rem" 
      }}
      contentEditable
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: initialContent.current }}
      onBlur={(e) => onBlur(page.id, e.target.innerHTML)}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.page.id === nextProps.page.id;
});

export default function MinecraftNotebook({ isOpen, onClose, subject }) {
  const { subjectNotes, saveSubjectNote } = useData();
  
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [showCover, setShowCover] = useState(true);
  
  const [pages, setPages] = useState([{ id: 'p1', content: '' }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  
  const [toolbarPos, setToolbarPos] = useState(null);
  
  const pagesRef = useRef(pages); 
  const pageNodesRef = useRef({}); 

  // Inicjalizacja i Animacja startowa
  useEffect(() => {
    if (isOpen && subject) {
      setIsAnimatingIn(true);
      setShowCover(true);
      
      try {
        const safeSubjectNotes = Array.isArray(subjectNotes) ? subjectNotes : [];
        const existingNote = safeSubjectNotes.find(n => n.subject_id === subject.id);
        
        if (existingNote && Array.isArray(existingNote.data?.pages) && existingNote.data.pages.length > 0) {
          const loadedPages = existingNote.data.pages.map(p => ({ ...p }));
          setPages(loadedPages);
          pagesRef.current = loadedPages;
          
          let targetPage = existingNote.last_opened_page || 0;
          if (targetPage >= loadedPages.length) {
            targetPage = loadedPages.length - 1;
          }
          if (isDesktop && targetPage % 2 !== 0) {
            targetPage -= 1;
          }
          setCurrentPage(targetPage);
        } else {
          const defaultPages = [
            { id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_1`, content: '' }, 
            { id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_2`, content: '' }
          ];
          setPages(defaultPages);
          pagesRef.current = defaultPages;
          setCurrentPage(0);
        }
      } catch (err) {
        console.error("Błąd podczas otwierania notatnika:", err);
      }

      // Animacja: Książka czeka zamknięta przez 0.9s, potem odpala się animacja otwierania
      const timer = setTimeout(() => {
        setShowCover(false);
      }, 1700); 
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, subject, subjectNotes, isDesktop]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop && currentPage % 2 !== 0) {
        setCurrentPage(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) {
        setToolbarPos(null);
        return;
      }
      
      const node = selection.anchorNode;
      if (!node || !node.parentElement) return;
      
      const isInsidePage = node.parentElement.closest('.minecraft-page-content');
      if (!isInsidePage) {
        setToolbarPos(null);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setToolbarPos({
        top: rect.top - 45,
        left: rect.left + rect.width / 2
      });
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const registerPageRef = useCallback((pageId, node) => {
    if (node) {
      pageNodesRef.current[pageId] = node;
    } else {
      delete pageNodesRef.current[pageId];
    }
  }, []);

  const handleBlur = useCallback((pageId, htmlContent) => {
    const updatedPages = pagesRef.current.map(p => ({ ...p }));
    const index = updatedPages.findIndex(p => p.id === pageId);
    if (index !== -1) {
      updatedPages[index].content = htmlContent;
      pagesRef.current = updatedPages;
    }
  }, []);

  if (!isOpen || !subject) return null;

  const syncActivePagesToState = () => {
    const updatedPages = pagesRef.current.map(p => ({ ...p }));
    updatedPages.forEach((p, idx) => {
      const node = pageNodesRef.current[p.id];
      if (node) {
        updatedPages[idx].content = node.innerHTML;
      }
    });
    pagesRef.current = updatedPages;
    setPages(updatedPages);
  };

  const handlePrevPage = () => {
    syncActivePagesToState();
    const step = isDesktop ? 2 : 1;
    setCurrentPage(prev => Math.max(0, prev - step));
  };

  const handleNextPage = () => {
    syncActivePagesToState();
    const step = isDesktop ? 2 : 1;
    const nextIndex = currentPage + step;

    if (nextIndex >= pages.length) {
      const newPages = pagesRef.current.map(p => ({ ...p }));
      newPages.push({ id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, content: '' });
      if (isDesktop) {
        newPages.push({ id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, content: '' });
      }
      pagesRef.current = newPages;
      setPages(newPages);
    }
    setCurrentPage(nextIndex);
  };

  // Zapisuje i wychodzi (Done)
  const handleDone = async () => {
    syncActivePagesToState();
    if (saveSubjectNote) {
      await saveSubjectNote(subject.id, { pages: pagesRef.current }, currentPage);
    }
    onClose();
  };

  const applyFormat = (e, command, value = null) => {
    e.preventDefault(); 
    document.execCommand(command, false, value);
    syncActivePagesToState();
  };

  const renderPageWrapper = (index) => {
    const page = pages[index];
    if (!page) return null;

    return (
      <div className="flex-1 flex flex-col h-full relative z-10 p-4 pb-12 md:p-10 md:pb-12">
        <PageEditor 
          key={page.id} 
          page={page} 
          onBlur={handleBlur} 
          registerRef={registerPageRef} 
        />
        <div className="absolute bottom-2 md:bottom-4 left-0 right-0 text-center text-[#5c4a31] font-bold text-sm select-none pointer-events-none" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          Page {index + 1}
        </div>
      </div>
    );
  };

  const bgStyle = isDesktop 
    ? 'linear-gradient(to right, #d4c39c 0%, #E5D2A5 5%, #E5D2A5 48%, #c2b088 50%, #E5D2A5 52%, #E5D2A5 95%, #d4c39c 100%)' 
    : 'linear-gradient(to right, #d4c39c 0%, #E5D2A5 5%, #E5D2A5 95%, #d4c39c 100%)'; 

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <style>{`
        @keyframes bookBounceIn {
          0% { transform: scale(0.5) translateY(100px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        @keyframes slideFromLeftToCenter {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }

        @keyframes coverFlipDesktop {
          0% { transform: rotateY(0deg); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: rotateY(-180deg); opacity: 0; }
        }

        @keyframes coverFlipMobile {
          0% { transform: rotateY(0deg); opacity: 1; }
          100% { transform: rotateY(-110deg); opacity: 0; }
        }

        @keyframes revealLeftPage {
          0%, 50% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }

        @keyframes revealLeftBackground {
          0% { clip-path: inset(0 0 0 50%); }
          100% { clip-path: inset(0 0 0 0); }
        }

        .animate-bounce-in {
          animation: bookBounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-slide-desktop {
          animation: slideFromLeftToCenter 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) 0.9s both;
        }

        .animate-cover-desktop {
          transform-origin: left center;
          animation: coverFlipDesktop 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) 0.9s both;
        }

        .animate-cover-mobile {
          transform-origin: left center;
          animation: coverFlipMobile 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) 0.9s both;
        }

        .animate-left-page {
          animation: revealLeftPage 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) 0.9s both;
        }

        .animate-book-open {
          animation: revealLeftBackground 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) 0.9s both;
        }

        .mc-btn {
          background-color: #7b7b7b;
          border: 2px solid #000;
          border-top-color: #a8a8a8;
          border-left-color: #a8a8a8;
          border-bottom-color: #3f3f3f;
          border-right-color: #3f3f3f;
          color: white;
          font-family: 'Courier New', Courier, monospace;
          text-shadow: 1px 1px 0 #3f3f3f;
          cursor: pointer;
        }
        .mc-btn:active:not(:disabled) {
          border-top-color: #3f3f3f;
          border-left-color: #3f3f3f;
          border-bottom-color: #a8a8a8;
          border-right-color: #a8a8a8;
        }
        .mc-btn:hover:not(:disabled) {
          background-color: #8c8c8c;
        }
      `}</style>

      {toolbarPos && !showCover && (
        <div 
          className="fixed z-[200] flex items-center gap-1 bg-[#2b2b2b] p-1.5 rounded-lg border border-[#555] shadow-2xl transform -translate-x-1/2"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          onClick={(e) => e.stopPropagation()} 
        >
          <button onMouseDown={(e) => applyFormat(e, 'bold')} className="w-8 h-8 flex items-center justify-center font-bold text-white hover:bg-white/20 rounded">B</button>
          <div className="w-px h-6 bg-gray-600 mx-1"></div>
          <button onMouseDown={(e) => applyFormat(e, 'foreColor', '#FF5555')} className="w-6 h-6 rounded-full bg-[#FF5555] border border-black hover:scale-110 transition-transform"></button>
          <button onMouseDown={(e) => applyFormat(e, 'foreColor', '#55FF55')} className="w-6 h-6 rounded-full bg-[#55FF55] border border-black hover:scale-110 transition-transform"></button>
          <button onMouseDown={(e) => applyFormat(e, 'foreColor', '#5555FF')} className="w-6 h-6 rounded-full bg-[#5555FF] border border-black hover:scale-110 transition-transform"></button>
          <button onMouseDown={(e) => applyFormat(e, 'foreColor', '#FFAA00')} className="w-6 h-6 rounded-full bg-[#FFAA00] border border-black hover:scale-110 transition-transform"></button>
          <button onMouseDown={(e) => applyFormat(e, 'foreColor', '#1d140b')} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#E5D2A5] border border-black hover:scale-110 transition-transform" title="Reset Color">
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      <div 
        className={`relative w-full max-w-[400px] md:max-w-[800px] aspect-[3/4] md:aspect-[8/5] shadow-2xl ${isAnimatingIn ? 'animate-bounce-in' : ''}`}
        style={{ perspective: '1200px' }} 
        onClick={(e) => e.stopPropagation()} 
      >
        {/* --- NOWY MINECRAFTOWY PRZYCISK ANULUJ 'X' (Pojawia się po animacji i zamyka bez zapisu) --- */}
        {!showCover && (
          <button 
            onClick={onClose} 
            className="absolute -top-12 right-0 md:-top-14 w-10 h-10 flex items-center justify-center font-black text-2xl mc-btn z-[200]"
            title="Anuluj i zamknij"
            style={{ textShadow: '2px 2px 0 #3f3f3f' }}
          >
            X
          </button>
        )}
        
        <div className={`absolute inset-0 w-full h-full ${isAnimatingIn && isDesktop ? 'animate-slide-desktop' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          
          {showCover && (
            <div className={`absolute z-50 ${isDesktop ? 'top-0 bottom-0 right-0 w-1/2 animate-cover-desktop' : 'inset-0 w-full animate-cover-mobile'}`}>
              <div className={`w-full h-full bg-[#4a3320] border-4 border-[#2b1e13] shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative overflow-hidden ${isDesktop ? 'rounded-r-xl' : 'rounded-xl'}`}>
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 120%)' }}></div>
                <div className="w-[80%] border-4 border-[#332214] h-[80%] flex flex-col items-center justify-center p-4 text-center z-10 bg-[#3a2717]">
                  <span className="text-[#FFAA00] text-2xl md:text-3xl font-black uppercase tracking-widest" style={{ fontFamily: "'Courier New', Courier, monospace", textShadow: "2px 2px 0 #111" }}>
                    {subject.name}
                  </span>
                  <span className="text-[#a8a8a8] mt-4 font-bold uppercase text-xs" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                    Notebook
                  </span>
                </div>
              </div>
            </div>
          )}

          <div 
            className={`absolute inset-0 rounded-xl flex shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] overflow-hidden ${isAnimatingIn && isDesktop ? 'animate-book-open' : ''}`}
            style={{ background: bgStyle }}
          >
            {isDesktop && (
              <div className="absolute top-0 bottom-0 left-1/2 w-8 -ml-4 bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none z-30"></div>
            )}

            {isDesktop ? (
              <>
                <div className={`w-1/2 h-full border-r border-[#c2b088] flex flex-col ${isAnimatingIn ? 'animate-left-page' : ''}`}>
                  {renderPageWrapper(currentPage)}
                </div>
                <div className="w-1/2 h-full flex flex-col relative z-10">
                  {currentPage + 1 < pages.length ? renderPageWrapper(currentPage + 1) : (
                     <div className="flex-1 flex flex-col items-center justify-center h-full opacity-50 select-none">
                       <span style={{ fontFamily: "'Courier New', Courier, monospace" }}>Blank Page</span>
                     </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col">
                {renderPageWrapper(currentPage)}
              </div>
            )}
          </div>

        </div>

        {!showCover && (
          <div className="absolute -bottom-16 left-0 right-0 flex justify-between items-center px-4 md:px-0">
            <button 
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`mc-btn w-12 h-10 text-xl font-black ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {"<"}
            </button>
            
            <button 
              onClick={handleDone}
              className="mc-btn px-8 h-10 text-sm font-bold tracking-widest uppercase"
            >
              Done
            </button>

            <button 
              onClick={handleNextPage}
              className="mc-btn w-12 h-10 text-xl font-black"
            >
              {currentPage + (isDesktop ? 2 : 1) >= pages.length ? "+" : ">"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}