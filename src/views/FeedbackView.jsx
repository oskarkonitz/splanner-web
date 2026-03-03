import { useState } from 'react';
import { useData } from '../context/DataContext';

export default function FeedbackView({ onBack }) {
  const { feedback, saveFeedback } = useData();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    await saveFeedback(title, description);
    setTitle('');
    setDescription('');
    setIsSubmitting(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#2b2b2b] text-white">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 md:px-10 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-[#3498db] hover:bg-white/5 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              Feedback & Bug Reports
            </h1>
            <p className="text-gray-400 text-sm mt-1 hidden md:block">Found a bug or have a suggestion? Let us know!</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-6">
        <div className="max-w-3xl mx-auto space-y-10">
          
          {/* SEKCJA: NOWE ZGŁOSZENIE */}
          <section className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-bold mb-4">Submit New Report</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Subject / Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Schedule is not loading properly"
                  className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Please describe the issue or your idea in detail..."
                  className="w-full h-32 bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none resize-none transition-colors"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="w-full md:w-auto bg-[#3498db] hover:bg-[#2980b9] text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Sending...' : 'Send Report'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </section>

          {/* SEKCJA: HISTORIA ZGŁOSZEŃ */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h2 className="text-lg font-bold mb-4 pl-1 text-gray-300">Your Past Reports</h2>
            
            {(!feedback || feedback.length === 0) ? (
              <div className="bg-[#1c1c1e]/50 border border-dashed border-gray-700 p-8 rounded-3xl text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p>You haven't submitted any feedback yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedback.map(item => (
                  <div key={item.id} className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                    {/* Wskaźnik statusu (kolorowa krawędź z lewej) */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status === 'resolved' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    
                    <div className="pl-2">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg">{item.title}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm whitespace-pre-wrap">{item.description}</p>
                      <div className="text-xs text-gray-600 mt-3 font-medium">{formatDate(item.created_at)}</div>

                      {/* Odpowiedź Admina */}
                      {item.admin_reply && (
                        <div className="mt-4 bg-[#2b2b2b] p-4 rounded-xl border border-gray-700">
                          <div className="flex items-center gap-2 mb-1.5 text-[#3498db]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                            <span className="text-xs font-bold uppercase tracking-wider">Developer Reply</span>
                          </div>
                          <p className="text-gray-200 text-sm whitespace-pre-wrap">{item.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}