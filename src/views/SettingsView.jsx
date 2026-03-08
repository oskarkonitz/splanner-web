// SettingsView.jsx
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useData } from '../context/DataContext'

export default function SettingsView({ onBack }) {
  // Usunąłem 'session' stąd, bo DataContext go nie zwraca
  const { taskLists, settings, updateSetting, appConfig } = useData()
  
  const [activeModal, setActiveModal] = useState(null)
  
  // NOWE: Stan przechowujący aktualnego użytkownika
  const [currentUser, setCurrentUser] = useState(null)

  // Stan wykrywający system operacyjny
  const [isWindows, setIsWindows] = useState(false)

  // Stany dla zmiany hasła
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Stany dla zmiany emaila
  const [newEmail, setNewEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' })
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  // Stany dla zmiany nazwy użytkownika
  const [newUsername, setNewUsername] = useState('')
  const [usernameMessage, setUsernameMessage] = useState({ type: '', text: '' })
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)

  // Stany dla konfiguracji Dashboardu
  const [localDashboardLayout, setLocalDashboardLayout] = useState(null)
  const [layoutTab, setLayoutTab] = useState('desktop')

  const dashboardWidgetsList = [
    { id: 'progress', label: 'Progress Summary (Bars)' },
    { id: 'now_next', label: 'Now / Next Events' },
    { id: 'next_exam', label: 'Next Exam' },
    { id: 'tasks', label: 'Tasks for Today' },
    { id: 'shopping', label: 'Shopping List' },
    { id: 'next_payment', label: 'Next Payment' },
    { id: 'focus', label: 'Today\'s Focus Time' },
    { id: 'gpa', label: 'Current GPA' }
  ];

  // NOWE: Pobieranie użytkownika i sprawdzanie systemu przy montowaniu
  useEffect(() => {
    const checkIsWindows = /Win/i.test(navigator.userAgent);
    setIsWindows(checkIsWindows);

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const shoppingLists = useMemo(() => {
    return taskLists.filter(list => list.list_type === 'shopping');
  }, [taskLists]);

  const currentShoppingListName = useMemo(() => {
    const listId = settings?.main_shopping_list_id;
    if (!listId) return "None";
    const list = shoppingLists.find(l => l.id === listId);
    return list ? list.name : "None";
  }, [settings, shoppingLists]);

  const currentBadgeModeName = useMemo(() => {
    const mode = settings?.badge_mode || 'default';
    if (mode === 'default') return 'Default (Numbers)';
    if (mode === 'dot') return 'Dots Only';
    if (mode === 'off') return 'Off';
    return 'Default (Numbers)';
  }, [settings]);

  const currentNextExamSwitchName = useMemo(() => {
    const mode = settings?.next_exam_switch || settings?.next_exam_switch_hour || 'after_end';
    if (mode === 'after_end') return 'After exam ends (+1.5h)';
    if (mode === '24') return 'At midnight';
    return `At ${mode}:00`;
  }, [settings]);

  const Section = ({ title, children }) => (
    <div className="mb-6">
      {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
      <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
        {children}
      </div>
    </div>
  )

  const Row = ({ icon, title, value, onClick, isDestructive, hasArrow, asLink, href }) => {
    const content = (
      <>
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          {value && <span className="text-sm">{value}</span>}
          {hasArrow && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          )}
        </div>
      </>
    );

    const commonClasses = `w-full flex items-center justify-between p-4 bg-transparent active:bg-white/5 transition-colors text-left border-b border-gray-800 last:border-b-0 ${isDestructive ? 'text-red-500' : 'text-white'}`;

    if (asLink) {
      return (
        <a href={href} className={commonClasses} style={{ textDecoration: 'none' }}>
          {content}
        </a>
      );
    }

    return (
      <button onClick={onClick} className={commonClasses}>
        {content}
      </button>
    );
  }

  const handleSelectShoppingList = async (listId) => {
    await updateSetting('main_shopping_list_id', listId);
    setActiveModal(null);
  };

  const handleSelectBadgeMode = async (mode) => {
    await updateSetting('badge_mode', mode);
    setActiveModal(null);
  };

  const handleSaveDashboardLayout = async () => {
    await updateSetting('dashboard_layout', localDashboardLayout);
    setActiveModal(null);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage({ type: 'info', text: 'Updating password...' });

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setTimeout(() => {
        setActiveModal(null);
        setPasswordMessage({ type: '', text: '' });
      }, 2000);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setEmailMessage({ type: 'info', text: 'Sending confirmation emails...' });

    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    
    setIsUpdatingEmail(false);

    if (error) {
      setEmailMessage({ type: 'error', text: error.message });
    } else {
      setEmailMessage({ type: 'success', text: 'Check both your old and new email inboxes to confirm the change.' });
      setNewEmail('');
      if (data?.user) setCurrentUser(data.user);
    }
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    setIsUpdatingUsername(true);
    setUsernameMessage({ type: 'info', text: 'Updating username...' });

    const { data, error } = await supabase.auth.updateUser({ 
      data: { username: newUsername } 
    });
    
    setIsUpdatingUsername(false);

    if (error) {
      setUsernameMessage({ type: 'error', text: error.message });
    } else {
      setUsernameMessage({ type: 'success', text: 'Username updated successfully!' });
      // Aktualizujemy lokalny stan, żeby UI odświeżyło się od razu
      if (data?.user) setCurrentUser(data.user);
      
      setTimeout(() => {
        setActiveModal(null);
        setUsernameMessage({ type: '', text: '' });
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-[#2b2b2b] text-white">
      
      <header className="relative flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:p-6 md:pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-gray-800 md:border-none shrink-0">
        <div className="flex-1 flex justify-start">
          <button 
            onClick={onBack} 
            className="md:hidden flex items-center gap-1 text-[#3498db] text-lg font-medium active:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            <span>Back</span>
          </button>
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-center shrink-0">Settings</h1>
        <div className="flex-1"></div> 
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8 max-w-3xl mx-auto w-full">
        
        <Section title="Preferences">
          <Row 
            title="Customize Dashboard" 
            hasArrow 
            onClick={() => {
              const defaultLayout = {
                desktop: { progress: true, now_next: true, next_exam: true, tasks: true, shopping: true, next_payment: true, focus: true, gpa: true },
                mobile: { progress: true, now_next: true, next_exam: true, tasks: true, shopping: true, next_payment: true, focus: true, gpa: true }
              };
              setLocalDashboardLayout(settings?.dashboard_layout || defaultLayout);
              setLayoutTab('desktop');
              setActiveModal('dashboardLayout');
            }} 
          />
          <Row title="Tasks Shortcuts" hasArrow onClick={() => setActiveModal('shortcuts')} />
          <Row 
            title="Main Shopping List" 
            value={currentShoppingListName} 
            hasArrow 
            onClick={() => setActiveModal('shoppingList')} 
          />
          <Row 
            title="Sidebar Badges Mode" 
            value={currentBadgeModeName} 
            hasArrow 
            onClick={() => setActiveModal('badgeMode')} 
          />
          <Row 
            title="Next Exam Switch Time" 
            value={currentNextExamSwitchName} 
            hasArrow 
            onClick={() => setActiveModal('nextExamSwitch')} 
          />
        </Section>

        {isWindows && appConfig?.windows_support?.enabled && (
          <Section title="App & Integration">
            <Row 
              title="Download for Windows" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>}
              hasArrow 
              asLink
              href={appConfig.windows_support.installer_url || "https://github.com/oskarkonitz/SPlanner/releases/latest/download/SPlanner_Installer.exe"}
            />
          </Section>
        )}

        <Section title="Account">
          <div className="flex items-center gap-4 p-4 border-b border-gray-800">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0">
              {/* NOWE: Obsługa currentUser */}
              {currentUser?.user_metadata?.username 
                ? currentUser.user_metadata.username.charAt(0).toUpperCase() 
                : currentUser?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-lg truncate">
                {currentUser?.user_metadata?.username || "Set a username"}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {currentUser?.email || "Unknown Email"}
              </div>
            </div>
          </div>

          <Row 
            title="Change Username" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>}
            hasArrow
            onClick={() => {
              setUsernameMessage({ type: '', text: '' });
              setNewUsername(currentUser?.user_metadata?.username || '');
              setActiveModal('changeUsername');
            }} 
          />
          <Row 
            title="Change Email" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>}
            hasArrow
            onClick={() => {
              setEmailMessage({ type: '', text: '' });
              setNewEmail('');
              setActiveModal('changeEmail');
            }} 
          />
          <Row 
            title="Change Password" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.252l1.465-1.465A6 6 0 0115 9z"></path></svg>}
            hasArrow
            onClick={() => {
              setPasswordMessage({ type: '', text: '' });
              setNewPassword('');
              setActiveModal('changePassword');
            }} 
          />
          <Row 
            title="Log Out" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>}
            isDestructive 
            onClick={() => setActiveModal('logout')} 
          />
        </Section>

        <div className="text-center text-gray-600 text-xs mt-8">
          Splanner Web App • v2.2.0
        </div>
      </main>

      {/* --- MODALE --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>

          <div className="relative bg-[#1c1c1e] p-6 rounded-3xl shadow-2xl border border-white/10 w-full max-w-sm flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {activeModal === 'dashboardLayout' && localDashboardLayout && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Customize Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-1">Choose which widgets are visible.</p>
                </div>

                <div className="flex bg-[#2b2b2b] rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => setLayoutTab('desktop')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${layoutTab === 'desktop' ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setLayoutTab('mobile')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${layoutTab === 'mobile' ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Mobile
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {dashboardWidgetsList.map(widget => {
                    const isActive = localDashboardLayout[layoutTab][widget.id] ?? true;
                    return (
                      <div key={widget.id} className="flex items-center justify-between p-3 bg-[#2b2b2b] rounded-xl">
                        <span className="text-sm font-medium text-gray-200">{widget.label}</span>
                        <button 
                          onClick={() => {
                            setLocalDashboardLayout(prev => ({
                              ...prev,
                              [layoutTab]: {
                                ...prev[layoutTab],
                                [widget.id]: !isActive
                              }
                            }));
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${isActive ? 'bg-[#3498db]' : 'bg-gray-600'}`}
                        >
                          <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <button 
                    onClick={handleSaveDashboardLayout}
                    className="w-full py-3 bg-[#3498db] hover:bg-[#2980b9] text-white rounded-xl font-bold transition-colors"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {activeModal === 'logout' && (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Log Out</h3>
                  <p className="text-gray-400 text-sm">Are you sure you want to log out of your account?</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => supabase.auth.signOut()} 
                    className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-bold transition-colors"
                  >
                    Yes, Log Out
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {activeModal === 'changePassword' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Change Password</h3>
                  <p className="text-gray-400 text-sm mt-1">Enter your new password below.</p>
                </div>
                
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="New Password"
                    className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db] transition-colors"
                  />
                  
                  {passwordMessage.text && (
                    <div className={`p-3 rounded-xl text-sm font-medium text-center ${passwordMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-[#3498db]'}`}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button 
                      type="submit"
                      disabled={isUpdatingPassword || newPassword.length < 6}
                      className="w-full py-3 bg-[#3498db] hover:bg-[#2980b9] disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-xl font-bold transition-colors flex justify-center items-center h-12"
                    >
                      {isUpdatingPassword ? (
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveModal(null)} 
                      className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeModal === 'changeEmail' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Change Email</h3>
                  <p className="text-gray-400 text-sm mt-1">Enter your new email address.</p>
                </div>
                
                <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="new.email@example.com"
                    className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db] transition-colors"
                  />
                  
                  {emailMessage.text && (
                    <div className={`p-3 rounded-xl text-sm font-medium text-center ${emailMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : emailMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-[#3498db]'}`}>
                      {emailMessage.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button 
                      type="submit"
                      disabled={isUpdatingEmail || !newEmail}
                      className="w-full py-3 bg-[#3498db] hover:bg-[#2980b9] disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-xl font-bold transition-colors flex justify-center items-center h-12"
                    >
                      {isUpdatingEmail ? (
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      ) : (
                        "Update Email"
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveModal(null)} 
                      className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                    >
                      {emailMessage.type === 'success' ? 'Close' : 'Cancel'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeModal === 'changeUsername' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Change Username</h3>
                  <p className="text-gray-400 text-sm mt-1">Set how you want to be called.</p>
                </div>
                
                <form onSubmit={handleChangeUsername} className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    maxLength={30}
                    placeholder="Your Username"
                    className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db] transition-colors"
                  />
                  
                  {usernameMessage.text && (
                    <div className={`p-3 rounded-xl text-sm font-medium text-center ${usernameMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : usernameMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-[#3498db]'}`}>
                      {usernameMessage.text}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button 
                      type="submit"
                      disabled={isUpdatingUsername || !newUsername.trim()}
                      className="w-full py-3 bg-[#3498db] hover:bg-[#2980b9] disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-xl font-bold transition-colors flex justify-center items-center h-12"
                    >
                      {isUpdatingUsername ? (
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      ) : (
                        "Save Username"
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveModal(null)} 
                      className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeModal === 'shoppingList' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Select Shopping List</h3>
                  <p className="text-gray-400 text-sm mt-1">Choose which list to display on the dashboard widget.</p>
                </div>
                
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {shoppingLists.length === 0 ? (
                    <div className="text-center text-gray-500 py-4 text-sm">No shopping lists created yet.</div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectShoppingList(null)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${!settings?.main_shopping_list_id ? 'bg-[#3498db] text-white' : 'bg-[#2b2b2b] text-gray-300 hover:bg-gray-800'}`}
                      >
                        None
                      </button>
                      {shoppingLists.map(list => (
                        <button
                          key={list.id}
                          onClick={() => handleSelectShoppingList(list.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${settings?.main_shopping_list_id === list.id ? 'bg-[#3498db] text-white' : 'bg-[#2b2b2b] text-gray-300 hover:bg-gray-800'}`}
                        >
                          <span className="text-lg">{list.icon || '🛒'}</span>
                          <span className="truncate">{list.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <button 
                  onClick={() => setActiveModal(null)} 
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors mt-2"
                >
                  Close
                </button>
              </>
            )}

            {activeModal === 'badgeMode' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Sidebar Badges</h3>
                  <p className="text-gray-400 text-sm mt-1">Choose how task indicators look in the desktop menu.</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'default', name: 'Default (Numbers & Colors)' },
                    { id: 'dot', name: 'Dots Only (Minimal)' },
                    { id: 'off', name: 'Off' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => handleSelectBadgeMode(mode.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        (settings?.badge_mode || 'default') === mode.id 
                        ? 'bg-[#3498db] text-white' 
                        : 'bg-[#2b2b2b] text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setActiveModal(null)} 
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors mt-2"
                >
                  Close
                </button>
              </>
            )}
            
            {activeModal === 'nextExamSwitch' && (
              <>
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold">Next Exam Switch</h3>
                  <p className="text-gray-400 text-sm mt-1">When should the dashboard widget switch to the next exam?</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'after_end', name: 'After exam ends (+1.5h)' },
                    { id: '14', name: 'At 14:00' },
                    { id: '18', name: 'At 18:00' },
                    { id: '24', name: 'At midnight' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={async () => {
                        await updateSetting('next_exam_switch', mode.id);
                        setActiveModal(null);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        (settings?.next_exam_switch || settings?.next_exam_switch_hour || 'after_end') === mode.id 
                        ? 'bg-[#3498db] text-white' 
                        : 'bg-[#2b2b2b] text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setActiveModal(null)} 
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors mt-2"
                >
                  Close
                </button>
              </>
            )}

            {activeModal === 'shortcuts' && (
              <>
                <h3 className="text-xl font-bold text-center">Work in progress</h3>
                <p className="text-gray-400 text-sm text-center">This feature is being ported from the iOS app.</p>
                <button onClick={() => setActiveModal(null)} className="w-full py-3 bg-[#3498db] text-white rounded-xl font-bold mt-4">Close</button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}