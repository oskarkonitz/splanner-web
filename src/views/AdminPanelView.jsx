import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../api/supabase'; 
import { useData } from '../context/DataContext';

export default function AdminPanelView({ onBack }) {
  const { 
    isAdmin, appConfig, updateAppConfig, dailyTasks, exams, subjects, 
    feedback, replyToFeedback,
    userMessages, sendUserMessage
  } = useData();

  // Ustawiamy domyślny widok na siatkę kafelków (Grid)
  const [activeTab, setActiveTab] = useState('Grid'); 
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

  // Stany dla Systemu Zgłoszeń
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [isReplying, setIsReplying] = useState(false);

  // Stany dla Systemu Zaproszeń
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Stany dla Systemu Użytkowników
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Stany dla Modalu Użytkownika
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  // Stany dla wiadomości do użytkownika
  const [newMessageTitle, setNewMessageTitle] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Filtrowanie i sortowanie zgłoszeń
  const sortedFeedback = useMemo(() => {
    const safeFeedback = feedback || [];
    return [...safeFeedback].sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [feedback]);

  // Filtrowanie użytkowników
  const filteredUsers = useMemo(() => {
    return usersList.filter(user => 
      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [usersList, userSearchQuery]);

  // Pobranie wiadomości konkretnego użytkownika
  const selectedUserMessages = useMemo(() => {
    if (!selectedUser || !userMessages) return [];
    return userMessages
      .filter(m => m.user_id === selectedUser.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [selectedUser, userMessages]);

  // Synchronizacja lokalnych stanów configu
  useEffect(() => {
    if (appConfig?.windows_support?.installer_url) setInstallerUrl(appConfig.windows_support.installer_url);
    if (appConfig?.global_message) {
      setMessageText(appConfig.global_message.text || '');
      setMessageType(appConfig.global_message.type || 'info');
    }
    if (appConfig?.toast_message) {
      setToastTitle(appConfig.toast_message.title || '');
      setToastText(appConfig.toast_message.text || '');
    }
  }, [appConfig]);

  // Pobieranie użytkowników przy wejściu w zakładkę Users
  useEffect(() => {
    if (activeTab === 'Users') {
      fetchUsers();
    }
  }, [activeTab]);

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

  // Funkcja sprawdzająca status "Online"
  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const handleBackNavigation = () => {
    if (activeTab === 'Grid') {
      onBack(); // Wróć całkowicie do ustawień
    } else {
      setActiveTab('Grid'); // Wróć do widoku kafelków
    }
  };

  const fetchGlobalStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_global_stats');
      if (error) throw error;
      setGlobalDataStats(data);
    } catch (err) {
      console.error("Błąd pobierania statystyk:", err);
      alert("Nie udało się pobrać statystyk. Upewnij się, że dodałeś funkcję get_global_stats w SQL.");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_sign_in_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error("Błąd pobierania użytkowników:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setSelectedUserStats(null); 
    setVideoUrlInput(user.custom_splash_video_url || ''); 
    setNewMessageTitle(''); 
    setNewMessageContent('');
  };

  const fetchSpecificUserStats = async (userId) => {
    setIsLoadingUserStats(true);
    try {
      const { data, error } = await supabase.rpc('get_user_personal_stats', { user_uuid: userId });
      if (error) throw error;
      setSelectedUserStats(data);
    } catch (err) {
      console.error("Błąd pobierania statystyk użytkownika:", err);
      alert("Aby to zadziałało, musisz dodać funkcję get_user_personal_stats w Supabase.");
    } finally {
      setIsLoadingUserStats(false);
    }
  };

  const handleToggleAdminStatus = async () => {
    if (!selectedUser) return;
    const isCurrentlyAdmin = selectedUser.is_admin;
    if (!window.confirm(`Are you sure you want to ${isCurrentlyAdmin ? 'revoke' : 'grant'} admin rights for ${selectedUser.email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isCurrentlyAdmin })
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      
      const updatedUser = { ...selectedUser, is_admin: !isCurrentlyAdmin };
      setSelectedUser(updatedUser);
      setUsersList(usersList.map(u => u.id === selectedUser.id ? updatedUser : u));
    } catch (err) {
      console.error("Błąd zmiany uprawnień:", err);
      alert("Failed to update user role.");
    }
  };

  const handleSendPasswordReset = async () => {
    if (!selectedUser || !selectedUser.email) return;
    if (!window.confirm(`Send a password reset email to ${selectedUser.email}?`)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
      if (error) throw error;
      alert(`Password reset email sent to ${selectedUser.email}.`);
    } catch (err) {
      console.error("Błąd resetu hasła:", err);
      alert("Failed to send password reset email.");
    }
  };

  const handleDeleteUser = () => {
    alert("Delete Action: Modifying auth.users requires a secure Edge Function with a service_role key. You need to implement an 'admin-delete-user' function in Supabase first.");
  };

  const handleUpdateVideoUrl = async () => {
    if (!selectedUser) return;
    try {
      const urlToSave = videoUrlInput.trim() === '' ? null : videoUrlInput.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ custom_splash_video_url: urlToSave })
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      
      const updatedUser = { ...selectedUser, custom_splash_video_url: urlToSave };
      setSelectedUser(updatedUser);
      setUsersList(usersList.map(u => u.id === selectedUser.id ? updatedUser : u));
      alert("Custom splash video URL updated successfully!");
    } catch (err) {
      console.error("Błąd aktualizacji URL wideo:", err);
      alert("Failed to update video URL.");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessageTitle.trim() || !newMessageContent.trim()) return;
    setIsSendingMessage(true);
    await sendUserMessage(selectedUser.id, newMessageTitle.trim(), newMessageContent.trim());
    setNewMessageTitle('');
    setNewMessageContent('');
    setIsSendingMessage(false);
    alert('Message sent successfully!');
  };

  const handleWindowsToggle = (key) => {
    const current = appConfig?.windows_support || {};
    updateAppConfig('windows_support', { ...current, [key]: !current[key] });
  };
  const handleSaveWindowsUrl = () => {
    const current = appConfig?.windows_support || {};
    updateAppConfig('windows_support', { ...current, installer_url: installerUrl });
    alert('Installer URL saved successfully!');
  };
  const handleMessageToggle = () => {
    const current = appConfig?.global_message || {};
    updateAppConfig('global_message', { ...current, active: !current.active });
  };
  const handleSaveMessage = () => {
    const current = appConfig?.global_message || {};
    updateAppConfig('global_message', { ...current, text: messageText, type: messageType });
    alert('Global message saved successfully!');
  };
  const handleToastToggle = () => {
    const current = appConfig?.toast_message || {};
    updateAppConfig('toast_message', { ...current, active: !current.active });
  };
  const handleSaveToast = () => {
    const current = appConfig?.toast_message || {};
    updateAppConfig('toast_message', { ...current, title: toastTitle, text: toastText });
    alert('Toast popup saved successfully!');
  };
  const handleMaintenanceToggle = () => {
    const current = appConfig?.maintenance || {};
    updateAppConfig('maintenance', { active: !current.active });
  };
  const handleRegistrationToggle = () => {
    const current = appConfig?.registration || {};
    updateAppConfig('registration', { enabled: !current.enabled });
  };
  
  const handleSendInvite = async () => {
    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail }
      });
      if (error) throw error;
      alert(`Official invitation sent successfully to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (err) {
      console.error(err);
      alert('Error sending invite: ' + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); 
  };

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
    setSelectedTicket(null);
  };

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
          <button onClick={handleBackNavigation} className="p-2 md:-ml-2 text-[#3498db] hover:bg-white/5 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          {/* Pokazujemy przycisk menu hamburgerowego tylko jeśli nie jesteśmy na siatce kafelków */}
          {activeTab !== 'Grid' && (
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          )}

          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-[#e74c3c] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              <span className="truncate">Admin Panel</span>
            </h1>
          </div>
        </div>
      </header>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* WIDOK KAFELKÓW (GRID) */}
        {activeTab === 'Grid' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Wybierz moduł</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                <button onClick={() => handleTabClick('General')} className="bg-[#1c1c1e] hover:bg-[#3498db]/10 border border-white/5 hover:border-[#3498db]/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-[#3498db]/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-[#3498db] group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">General</h3>
                  <p className="text-sm text-gray-500">Przegląd panelu i podstawowe informacje</p>
                </button>

                <button onClick={() => handleTabClick('Distribution')} className="bg-[#1c1c1e] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-indigo-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Distribution</h3>
                  <p className="text-sm text-gray-500">Zarządzaj instalatorem i dystrybucją PC</p>
                </button>

                <button onClick={() => handleTabClick('Announcements')} className="bg-[#1c1c1e] hover:bg-yellow-500/10 border border-white/5 hover:border-yellow-500/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-yellow-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-yellow-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Announcements</h3>
                  <p className="text-sm text-gray-500">Globalne wiadomości i pop-upy</p>
                </button>

                <button onClick={() => handleTabClick('System')} className="bg-[#1c1c1e] hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-red-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-red-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">System</h3>
                  <p className="text-sm text-gray-500">Przerwy techniczne, rejestracja i zaproszenia</p>
                </button>

                <button onClick={() => handleTabClick('Users')} className="bg-[#1c1c1e] hover:bg-green-500/10 border border-white/5 hover:border-green-500/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-green-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Users</h3>
                  <p className="text-sm text-gray-500">Zarządzanie kontami i uprawnieniami</p>
                </button>

                <button onClick={() => handleTabClick('Analytics')} className="bg-[#1c1c1e] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 p-6 rounded-3xl transition-all text-left group">
                  <div className="bg-purple-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Analytics</h3>
                  <p className="text-sm text-gray-500">Globalne statystyki bazy danych</p>
                </button>

                <button onClick={() => handleTabClick('Feedback')} className="bg-[#1c1c1e] hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 p-6 rounded-3xl transition-all text-left group relative">
                  <div className="bg-pink-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-pink-400 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Feedback</h3>
                  <p className="text-sm text-gray-500">Zgłoszenia i błędy od użytkowników</p>
                  
                  {(feedback || []).filter(f => f.status === 'open').length > 0 && (
                    <span className="absolute top-6 right-6 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      {(feedback || []).filter(f => f.status === 'open').length} Nowych
                    </span>
                  )}
                </button>

              </div>
            </div>
          </div>
        ) : (
          // WIDOK SZCZEGÓŁÓW Z BOCZNYM MENU
          <>
            {isMobileMenuOpen && (
              <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#121212] border-r border-gray-800 p-4 flex flex-col gap-2 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="md:hidden flex justify-end pb-2 mb-2 border-b border-gray-800">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              {['General', 'Distribution', 'Announcements', 'System', 'Users', 'Analytics', 'Feedback'].map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`text-left px-4 py-3 rounded-xl font-medium transition-all flex justify-between items-center ${activeTab === tab ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span>{tab}</span>
                  {tab === 'Feedback' && (feedback || []).filter(f => f.status === 'open').length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {(feedback || []).filter(f => f.status === 'open').length}
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
                    <ToggleSwitch label="Enable Windows Download" description="Shows the download option in the Settings view." checked={appConfig?.windows_support?.enabled || false} onChange={() => handleWindowsToggle('enabled')} />
                    <ToggleSwitch label="Show Windows Promo Toast" description="Displays a pop-up toast suggesting the app to Windows users." checked={appConfig?.windows_support?.show_toast || false} onChange={() => handleWindowsToggle('show_toast')} />
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
                      <ToggleSwitch label="Activate Top Banner" description="Displays a banner at the very top of the app." checked={appConfig?.global_message?.active || false} onChange={handleMessageToggle} />
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
                      <ToggleSwitch label="Activate Popup Toast" description="Displays a floating notification in the bottom right corner." checked={appConfig?.toast_message?.active || false} onChange={handleToastToggle} />
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
                    <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Maintenance & Access</h3>
                    
                    <ToggleSwitch label="Maintenance Mode" description="Locks down the app for non-admins." checked={appConfig?.maintenance?.active || false} onChange={handleMaintenanceToggle} />
                    
                    <ToggleSwitch 
                      label="Enable Public Registration" 
                      description="Allows anyone to create a new account from the login screen." 
                      checked={appConfig?.registration?.enabled ?? true} 
                      onChange={handleRegistrationToggle} 
                    />

                    <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 space-y-4 mt-6">
                      <div>
                        <h4 className="text-white font-medium mb-1">Invite User via Official API</h4>
                        <p className="text-sm text-gray-400">Sends a formal Supabase invitation bypassing the registration block.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Recipient Email</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="flex-1 bg-[#2b2b2b] text-white px-4 py-2.5 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none"
                              placeholder="user@example.com"
                            />
                            <button
                              onClick={handleSendInvite}
                              disabled={isInviting || !inviteEmail}
                              className="bg-[#3498db] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#2980b9] transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isInviting ? 'Sending...' : 'Send Official Invite'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {activeTab === 'Users' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-2">
                      <h3 className="text-xl font-bold text-white">Manage Users</h3>
                      <button 
                        onClick={fetchUsers} 
                        disabled={isLoadingUsers}
                        className="text-sm text-[#3498db] hover:text-[#2980b9] transition-colors disabled:opacity-50"
                      >
                        {isLoadingUsers ? 'Refreshing...' : 'Refresh List'}
                      </button>
                    </div>

                    <div className="bg-[#1c1c1e] p-2 rounded-2xl border border-white/5 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-gray-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      <input 
                        type="text" 
                        placeholder="Search by email..." 
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-white focus:outline-none w-full py-2 placeholder-gray-500"
                      />
                    </div>

                    {isLoadingUsers && usersList.length === 0 ? (
                      <div className="text-gray-500 text-center py-10 bg-[#1c1c1e] rounded-3xl border border-white/5">
                        Loading users...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-10 bg-[#1c1c1e] rounded-3xl border border-white/5">
                        No users found matching your search.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredUsers.map(user => (
                          <div 
                            key={user.id} 
                            onClick={() => openUserModal(user)}
                            className="bg-[#1c1c1e] p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${user.is_admin ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-white'}`}>
                                  {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#1c1c1e] rounded-full ${isOnline(user.last_seen_at) ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                                    {user.email || 'No email'}
                                  </h4>
                                  {user.is_admin && (
                                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-500 text-xs mt-0.5">
                                  Last active: {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="text-gray-500 shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                        <button 
                          onClick={fetchGlobalStats}
                          disabled={isLoadingStats}
                          className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {isLoadingStats ? 'Loading...' : (globalDataStats ? 'Refresh Stats' : 'Load Stats')}
                        </button>
                      </div>
                      
                      {!globalDataStats ? (
                        <div className="bg-[#1c1c1e] p-8 rounded-2xl border border-white/5 text-center text-gray-500 text-sm">
                          Click the button above to manually fetch global database metrics.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-[#3498db]/30 shadow-[0_0_15px_rgba(52,152,219,0.1)]">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Registered Users</span>
                            <div className="text-3xl font-black text-[#3498db] mt-1">{globalDataStats.users}</div>
                          </div>
                          <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Tasks</span>
                            <div className="text-3xl font-black text-white mt-1">{globalDataStats.tasks}</div>
                          </div>
                          <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Exams</span>
                            <div className="text-3xl font-black text-white mt-1">{globalDataStats.exams}</div>
                          </div>
                          <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Subjects</span>
                            <div className="text-3xl font-black text-white mt-1">{globalDataStats.subjects}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        Your Personal Stats
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 opacity-80">
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Your Tasks</span>
                          <div className="text-2xl font-black text-white mt-1">{dailyTasks?.length || 0}</div>
                        </div>
                        <div className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 opacity-80">
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Your Exams</span>
                          <div className="text-2xl font-black text-white mt-1">{exams?.length || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
          </>
        )}
      </div>

      {/* MODAL DO OBSŁUGI ZGŁOSZENIA */}
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

      {/* MODAL DO OBSŁUGI UŻYTKOWNIKA */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4">
          <div className="bg-[#1c1c1e] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-[#1c1c1e] z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                User Details
                {selectedUser.is_admin && <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md uppercase tracking-wide">Admin</span>}
              </h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white p-2 bg-black/20 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sekcja Info */}
              <div className="bg-[#2b2b2b] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold bg-gray-700 text-white text-xl">
                    {selectedUser.email ? selectedUser.email.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{selectedUser.email}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">ID: {selectedUser.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700/50 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Joined</span>
                    <span className="text-gray-300">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Last Active</span>
                    <span className="text-gray-300">{selectedUser.last_seen_at ? new Date(selectedUser.last_seen_at).toLocaleString() : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Sekcja Statystyk */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">App Usage Stats</span>
                  <button 
                    onClick={() => fetchSpecificUserStats(selectedUser.id)}
                    disabled={isLoadingUserStats}
                    className="text-xs font-bold text-[#3498db] hover:text-[#2980b9] transition-colors"
                  >
                    {isLoadingUserStats ? 'Loading...' : 'Load Stats'}
                  </button>
                </div>
                
                {selectedUserStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#2b2b2b] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Tasks</span>
                      <span className="text-2xl font-black text-white">{selectedUserStats.tasks}</span>
                    </div>
                    <div className="bg-[#2b2b2b] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Exams</span>
                      <span className="text-2xl font-black text-white">{selectedUserStats.exams}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#2b2b2b] p-4 rounded-xl border border-white/5 text-center text-sm text-gray-500">
                    Click "Load Stats" to fetch this user's data from the database.
                  </div>
                )}
              </div>

              {/* Sekcja Custom Video Splash */}
              <div className="bg-[#2b2b2b] p-4 rounded-2xl border border-white/5 space-y-3">
                <span className="text-xs font-bold text-[#3498db] uppercase">Custom Splash Video</span>
                <p className="text-xs text-gray-400">Provide an MP4 URL. If set, this user will see the video instead of the normal loading screen upon login.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="flex-1 bg-[#1c1c1e] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleUpdateVideoUrl}
                    className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                  >
                    Save URL
                  </button>
                </div>
              </div>

              {/* Sekcja Direct Message (Wysyłanie wiadomości do użytkownika) */}
              <div className="border-t border-gray-800 pt-6">
                <span className="text-xs font-bold text-[#3498db] uppercase block mb-4">Direct Message</span>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Message Title" 
                    value={newMessageTitle} 
                    onChange={e => setNewMessageTitle(e.target.value)} 
                    className="w-full bg-[#1c1c1e] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none text-sm"
                  />
                  <textarea 
                    placeholder="Message Content..." 
                    value={newMessageContent} 
                    onChange={e => setNewMessageContent(e.target.value)} 
                    className="w-full h-24 bg-[#1c1c1e] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-[#3498db] focus:outline-none text-sm resize-none"
                  />
                  <button 
                    onClick={handleSendMessage} 
                    disabled={isSendingMessage || !newMessageTitle.trim() || !newMessageContent.trim()}
                    className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white py-2 px-4 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {isSendingMessage ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>

              {/* Historia Wiadomości Użytkownika */}
              <div className="border-t border-gray-800 pt-6">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-4">Message History</span>
                {selectedUserMessages.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs bg-[#2b2b2b] p-4 rounded-xl border border-white/5">
                    No direct messages sent to this user yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedUserMessages.map(msg => (
                      <div key={msg.id} className="bg-[#2b2b2b] p-3 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white">{msg.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${msg.is_read ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {msg.is_read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{msg.content}</p>
                        <span className="text-[10px] text-gray-500 mt-2 block">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sekcja Akcji (Danger Zone) */}
              <div className="border-t border-gray-800 pt-6">
                <span className="text-xs font-bold text-[#e74c3c] uppercase block mb-4">Danger Zone & Admin Actions</span>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleToggleAdminStatus}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-colors border ${
                      selectedUser.is_admin 
                        ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' 
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                    }`}
                  >
                    <span>{selectedUser.is_admin ? 'Revoke Admin Privileges' : 'Grant Admin Privileges'}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  </button>

                  <button 
                    onClick={handleSendPasswordReset}
                    className="w-full bg-[#2b2b2b] hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-colors border border-gray-700"
                  >
                    <span>Send Password Reset Email</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </button>

                  <button 
                    onClick={handleDeleteUser}
                    className="w-full bg-red-500/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-colors border border-red-500/10 hover:border-red-500/30"
                  >
                    <span>Delete User Account</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}