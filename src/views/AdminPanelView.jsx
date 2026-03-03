import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../api/supabase'; 
import { useData } from '../context/DataContext';

export default function AdminPanelView({ onBack }) {
  // POBIERAMY NOWE FUNKCJE I STAN Z DATA CONTEXT
  const { isAdmin, appConfig, updateAppConfig, dailyTasks, exams, subjects, feedback, replyToFeedback } = useData();

  const [activeTab, setActiveTab] = useState('Distribution'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Stany configu
  const [installerUrl, setInstallerUrl] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [toastTitle, setToastTitle] = useState('');
  const [toastText, setToastText] = useState('');

  // Stany dla Globalnych Statystyk
  const [globalDataStats, setGlobalDataStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // --- STANY DLA SYSTEMU ZGŁOSZEŃ ---
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [isReplying, setIsReplying] = useState(false);

  // Filtrowanie i sortowanie zgłoszeń
  const sortedFeedback = useMemo(() => {
    if (!feedback) return [];
    return [...feedback].sort((a, b) => {
      // Najpierw otwarte, potem zamknięte
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      // Potem po dacie
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [feedback]);

  // Synchronizacja lokalnych stanów configu
  useEffect(() => {
    if (appConfig.windows_support?.installer_url) setInstallerUrl(appConfig.windows_support.installer_url);
    if (appConfig.global_message) {
      setMessageText(appConfig.global_message.text || '');
      setMessageType(appConfig.global_message.type || 'info');
    }
    if (appConfig.toast_message) {
      setToastTitle(appConfig.toast_message.title || '');
      setToastText(appConfig.toast_message.text || '');
    }
  }, [appConfig]);

  // Pobieranie statystyk
  useEffect(() => {
    if (activeTab === 'Analytics' && !globalDataStats) {
      const fetchGlobalStats = async () => {
        setIsLoadingStats(true);
        const { data, error } = await supabase.rpc('get_global_stats');
        if (!error && data) setGlobalDataStats(data);
        setIsLoadingStats(false);
      };
      fetchGlobalStats();
    }
  }, [activeTab, globalDataStats]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 h-full bg-[#2b2b2b] p-6">
        <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-400 mt-2">You do not have permission to view this page.</p>
        <button onClick={onBack} className="mt-6 bg-[#1c1c1e] text-white px-6 py-2 rounded-xl border border-gray-800 hover:bg-gray-800 transition-colors">Go Back</button>
      </div>
    );
  }

  // --- HANDLERY KONFIGURACJI ---
  const handleWindowsToggle = (key) => {
    const current = appConfig.windows_support || {};
    updateAppConfig('windows_support', { ...current, [key]: !current[key] });
  };
  const handleSaveWindowsUrl = () => {
    const current = appConfig.windows_support || {};
    updateAppConfig('windows_support', { ...current, installer_url: installerUrl });
    alert('Installer URL saved successfully!');
  };
  const handleMessageToggle = () => {
    const current = appConfig.global_message || {};
    updateAppConfig('global_message', { ...current, active: !current.active });
  };
  const handleSaveMessage = () => {
    const current = appConfig.global_message || {};
    updateAppConfig('global_message', { ...current, text: messageText, type: messageType });
    alert('Global message saved successfully!');
  };
  const handleToastToggle = () => {
    const current = appConfig.toast_message || {};
    updateAppConfig('toast_message', { ...current, active: !current.active });
  };
  const handleSaveToast = () => {
    const current = appConfig.toast_message || {};
    updateAppConfig('toast_message', { ...current, title: toastTitle, text: toastText });
    alert('Toast popup saved successfully!');
  };
  const handleMaintenanceToggle = () => {
    const current = appConfig.maintenance || {};
    updateAppConfig('maintenance', { active: !current.active });
  };
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); 
  };

  // --- HANDLERY ZGŁOSZEŃ ---
  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.admin_reply || '');
    setTicketStatus(ticket.status || 'open');
  };

  const handleSendReply = async () => {
    if (!selectedTicket) return;
    setIsReplying(true);
    await replyToFeedback(selectedTicket.id, replyText, ticketStatus);
    setIsReplying(false);
    setSelectedTicket(null); // Zamknij modal powrotny
  };

  // Komponent pomocniczy
  const ToggleSwitch = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-[#1c1c1e] rounded-2xl border border-white/5">
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${checked ? 'bg-[#3498db]' : 'bg-gray-700'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#2b2b2b] text-white overflow-hidden relative">
      <header className="flex items-center justify-between px-4 md:px-10 pb-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onBack} className="p-2 md:-ml-2 text-[#3498db] hover:bg-white/5 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-[#e74c3c] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              <span className="truncate">Admin Panel</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#121212] border-r border-gray-800 p-4 flex flex-col gap-2 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="md:hidden flex justify-end pb-2 mb-2 border-b border-gray-800">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          {/* NOWA ZAKŁADKA FEEDBACK */}
          {['General', 'Distribution', 'Announcements', 'System', 'Analytics', 'Feedback'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`text-left px-4 py-3 rounded-xl font-medium transition-all flex justify-between items-center ${activeTab === tab ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span>{tab}</span>
              {/* Odznaka z ilością otwartych ticketów */}
              {tab === 'Feedback' && feedback.filter(f => f.status === 'open').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {feedback.filter(f => f.status === 'open').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">

            {activeTab === 'General' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Overview</h3>
                <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                  <p className="text-gray-300">Welcome to the SPlanner Admin Control Panel. Select a category from the sidebar to manage app features, announcements, and global settings.</p>
                </div>
              </div>
            )}

            {activeTab === 'Distribution' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Windows App Distribution</h3>
                <ToggleSwitch label="Enable Windows Download" description="Shows the download option in the Settings view." checked={appConfig.windows_support?.enabled || false} onChange={() => handleWindowsToggle('enabled')} />
                <ToggleSwitch label="Show Windows Promo Toast" description="Displays a pop-up toast suggesting the app to Windows users." checked={appConfig.windows_support?.show_toast || false} onChange={() => handleWindowsToggle('show_toast')} />
                <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 space-y-3">
                  <label className="block text-sm font-medium text-gray-400">Installer Direct URL</label>
                  <input type="text" value={installerUrl} onChange={(e) => setInstallerUrl(e.target.value)} className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none" placeholder="https://github.com/..." />
                  <button onClick={handleSaveWindowsUrl} className="bg-[#3498db] text-white px-5 py-2 rounded-xl font-medium hover:bg-[#2980b9] transition-colors w-full md:w-auto">Save URL</button>
                </div>
              </div>
            )}

            {activeTab === 'Announcements' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Top Banner Message</h3>
                  <ToggleSwitch label="Activate Top Banner" description="Displays a banner at the very top of the app." checked={appConfig.global_message?.active || false} onChange={handleMessageToggle} />
                  <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Message Type (Color)</label>
                      <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none">
                        <option value="info">Info (Blue)</option>
                        <option value="success">Success (Green)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="error">Error (Red)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Banner Content</label>
                      <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} className="w-full h-20 bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none resize-none" placeholder="Type the announcement here..." />
                    </div>
                    <button onClick={handleSaveMessage} className="bg-[#3498db] text-white px-5 py-2 rounded-xl font-medium hover:bg-[#2980b9] transition-colors w-full md:w-auto">Save Banner</button>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Popup Toast (Bottom Right)</h3>
                  <ToggleSwitch label="Activate Popup Toast" description="Displays a floating notification in the bottom right corner." checked={appConfig.toast_message?.active || false} onChange={handleToastToggle} />
                  <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Popup Title</label>
                      <input type="text" value={toastTitle} onChange={(e) => setToastTitle(e.target.value)} className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none" placeholder="e.g. New Feature!" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Popup Text</label>
                      <textarea value={toastText} onChange={(e) => setToastText(e.target.value)} className="w-full h-20 bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none resize-none" placeholder="Description..." />
                    </div>
                    <button onClick={handleSaveToast} className="bg-purple-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-purple-700 transition-colors w-full md:w-auto">Save Popup</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'System' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Maintenance & Danger Zone</h3>
                <ToggleSwitch label="Maintenance Mode" description="Locks down the app for non-admins." checked={appConfig.maintenance?.active || false} onChange={handleMaintenanceToggle} />
              </div>
            )}

            {activeTab === 'Analytics' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Global Platform Stats
                    </h3>
                    {isLoadingStats && <span className="text-xs font-bold text-[#3498db] animate-pulse">Loading...</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[#3498db]/30 shadow-[0_0_15px_rgba(52,152,219,0.1)]">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Registered Users</span>
                      <div className="text-3xl font-black text-[#3498db] mt-1">{globalDataStats ? globalDataStats.users : '-'}</div>
                    </div>
                    <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Tasks</span>
                      <div className="text-3xl font-black text-white mt-1">{globalDataStats ? globalDataStats.tasks : '-'}</div>
                    </div>
                    <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Exams</span>
                      <div className="text-3xl font-black text-white mt-1">{globalDataStats ? globalDataStats.exams : '-'}</div>
                    </div>
                    <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Subjects</span>
                      <div className="text-3xl font-black text-white mt-1">{globalDataStats ? globalDataStats.subjects : '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOWA ZAKŁADKA FEEDBACK */}
            {activeTab === 'Feedback' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">User Feedback & Reports</h3>
                
                {sortedFeedback.length === 0 ? (
                  <div className="text-gray-500 text-center py-10 bg-[#1c1c1e] rounded-3xl border border-white/5">
                    No feedback received yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedFeedback.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => openTicket(item)}
                        className="bg-[#1c1c1e] p-4 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors flex justify-between items-center"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'open' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-green-500'}`}></span>
                            <h4 className="font-bold text-white truncate">{item.title}</h4>
                          </div>
                          <p className="text-gray-400 text-xs truncate ml-5">{item.description}</p>
                        </div>
                        <div className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL DO OBSŁUGI ZGŁOSZENIA (Zamiast na nowej podstronie, jest jako nakładka) */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4">
          <div className="bg-[#1c1c1e] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Ticket Details</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">User Report</span>
                <h3 className="text-xl font-bold text-white mt-1 mb-2">{selectedTicket.title}</h3>
                <div className="bg-[#2b2b2b] p-4 rounded-xl text-gray-300 text-sm whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-right">User ID: {selectedTicket.user_id}</div>
              </div>

              <div className="border-t border-gray-800 pt-6">
                <span className="text-xs font-bold text-[#3498db] uppercase">Developer Action</span>
                
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Reply to user</label>
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response here... (Leave blank for no response)"
                      className="w-full h-32 bg-[#2b2b2b] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-400">Status:</label>
                      <select 
                        value={ticketStatus}
                        onChange={(e) => setTicketStatus(e.target.value)}
                        className="bg-[#2b2b2b] text-white px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none text-sm"
                      >
                        <option value="open">Open (Needs Action)</option>
                        <option value="resolved">Resolved (Closed)</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleSendReply}
                      disabled={isReplying}
                      className="bg-[#3498db] hover:bg-[#2980b9] text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      {isReplying ? 'Saving...' : 'Update Ticket'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}