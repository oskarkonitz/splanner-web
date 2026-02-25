// Importujemy bazę i widoki
import { supabase } from './api/supabase.js';
import { renderHomeView } from './views/HomeView.js';
import { renderPlanView } from './views/PlanView.js';
import { renderTasksView } from './views/TasksView.js';
import { renderScheduleView } from './views/ScheduleView.js';
import { renderMoreView } from './views/MoreView.js';

const state = {
  sessionUser: null,
  currentTab: 'home'
};

document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash-screen');
  const loginScreen = document.getElementById('login-screen');
  const appContent = document.getElementById('app-content');
  const tabBar = document.getElementById('tab-bar');
  const statusText = document.getElementById('splash-text'); // Tekst na splashu

  try {
    statusText.innerText = 'Łączenie z Supabase...';
    
    // Sprawdzanie sesji
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;

    // Ukrywamy splash po udanym pobraniu danych
    splash.classList.add('hidden');

    if (session) {
      state.sessionUser = session.user;
      appContent.classList.remove('hidden');
      tabBar.classList.remove('hidden');
      loadView('home');
    } else {
      loginScreen.classList.remove('hidden');
      loginScreen.style.display = 'flex';
    }
  } catch (error) {
    // JEŚLI COŚ PÓJDZIE NIE TAK, ZOBACZYSZ BŁĄD NA EKRANIE
    console.error("Błąd inicjalizacji:", error);
    statusText.innerText = "Błąd: " + error.message;
    statusText.style.color = "red";
    
    // Zatrzymujemy pasek ładowania
    document.getElementById('splash-progress').style.backgroundColor = "red";
  }
});

// LOGIKA LOGOWANIA (Została bez zmian, ale korzysta z nowego importu supabase)
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');

loginBtn?.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  authError.innerText = "Logowanie...";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authError.innerText = error.message;
  else window.location.reload();
});

// ROUTING I NAWIGACJA
const tabBtns = document.querySelectorAll('.tab-btn');
const appContent = document.getElementById('app-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    tabBtns.forEach(b => b.classList.remove('active'));
    const clickedBtn = e.target.closest('.tab-btn');
    clickedBtn.classList.add('active');

    const targetView = clickedBtn.getAttribute('data-target');
    state.currentTab = targetView;
    loadView(targetView);
  });
});

// Kontroler widoków (Deleguje renderowanie do osobnych plików!)
async function loadView(viewName) {
  switch(viewName) {
    case 'home':
      await renderHomeView(appContent);
      break;
    case 'tasks':
      await renderTasksView(appContent);
      break;
    case 'plan':
      await renderPlanView(appContent);
      break;
    case 'schedule':
      await renderScheduleView(appContent);
      break;
    case 'more':
      await renderMoreView(appContent);
      break;
  }
}

// Globalny CSS dla loadera
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);