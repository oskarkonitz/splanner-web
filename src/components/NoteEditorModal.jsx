import { useState, useEffect } from 'react';

export default function NoteEditorModal({ isOpen, onClose, initialNote, onSave, title = "Edit Note" }) {
  const [note, setNote] = useState('');

  // Ustawienie notatki przy otwarciu
  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        {/* ZMIANA: Dodano pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 */}
        <header className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">
            Cancel
          </button>
          <h1 className="text-lg font-bold text-white truncate max-w-[200px] text-center">
            {title}
          </h1>
          <button onClick={() => { onSave(note); onClose(); }} className="text-[#3498db] text-lg font-bold active:opacity-70">
            Save
          </button>
        </header>

        <div className="flex-1 p-4 md:p-6 bg-[#121212] md:bg-transparent">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type your notes, links, or references here..."
            className="w-full h-full min-h-[300px] bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none resize-none leading-relaxed text-base"
            autoFocus
          />
        </div>

      </div>
    </div>
  );
}