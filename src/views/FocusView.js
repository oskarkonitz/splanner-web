import { supabase } from '../api/supabase.js';

let focusInterval = null;

export async function renderFocusView(container, onBack) {
  // Stany Timera
  let isPomodoroMode = true;
  let isWorking = true;
  let isRunning = false;
  let timeRemaining = 25 * 60;
  let totalDuration = 25 * 60;
  let stopwatchSeconds = 0;
  
  let pendingSecondsToSync = 0;
  let lastTickTime = Date.now();
  let dailyStudyTime = 0; // W przyszłości pobierane z bazy
  let dailyStudyRecord = 0;

  const formatTime = (totalSeconds, forceHours = false) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (forceHours || h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSmallTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const renderUI = () => {
    const progress = isPomodoroMode 
      ? (totalDuration > 0 ? timeRemaining / totalDuration : 0)
      : (stopwatchSeconds % 60) / 60.0;

    const ringColor = isPomodoroMode ? (isWorking ? '#5856d6' : '#2ecc71') : '#e67e22';
    const radius = 110;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress * circumference);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="focus-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> More
          </button>
          <h2 style="font-size: 16px; font-weight: bold;">Focus</h2>
          <div style="width: 60px;"></div> </div>

        <div style="padding: 20px; display: flex; flex-direction: column; align-items: center; flex: 1;">
          
          <div style="display: flex; background: var(--bg-secondary-grouped); padding: 4px; border-radius: 8px; width: 100%; max-width: 300px; margin-bottom: 40px;">
            <button id="mode-pomo" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${isPomodoroMode ? 'var(--bg-system-grouped)' : 'transparent'}; font-weight: ${isPomodoroMode ? 'bold' : 'normal'}; cursor: pointer;">Pomodoro</button>
            <button id="mode-stop" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${!isPomodoroMode ? 'var(--bg-system-grouped)' : 'transparent'}; font-weight: ${!isPomodoroMode ? 'bold' : 'normal'}; cursor: pointer;">Stopwatch</button>
          </div>

          <div style="position: relative; width: 250px; height: 250px; display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
            <svg width="250" height="250" style="transform: rotate(-90deg); position: absolute;">
              <circle cx="125" cy="125" r="${radius}" fill="none" stroke="gray" stroke-width="20" stroke-linecap="round" opacity="0.2" />
              <circle cx="125" cy="125" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 0.5s linear;" />
            </svg>
            <div style="text-align: center; z-index: 10;">
              <div style="font-size: 50px; font-weight: bold; font-family: ui-rounded, sans-serif; color: ${isPomodoroMode && !isWorking ? 'var(--accent-green)' : 'var(--text-primary)'}">
                ${formatTime(isPomodoroMode ? timeRemaining : stopwatchSeconds)}
              </div>
              ${!isPomodoroMode ? `
                <div style="margin-top: 5px;">
                  <div style="font-size: 14px; color: var(--text-secondary); font-weight: bold;">Today: ${formatSmallTime(dailyStudyTime + pendingSecondsToSync)}</div>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="height: 50px; display: flex; gap: 15px; margin-bottom: 40px; visibility: ${isPomodoroMode ? 'visible' : 'hidden'};">
            <button id="btn-work" style="padding: 10px 20px; border-radius: 20px; font-weight: bold; border: none; cursor: pointer; background: ${isWorking ? '#5856d6' : 'rgba(88,86,214,0.15)'}; color: ${isWorking ? '#fff' : '#5856d6'};">Focus (25m)</button>
            <button id="btn-break" style="padding: 10px 20px; border-radius: 20px; font-weight: bold; border: none; cursor: pointer; background: ${!isWorking ? '#2ecc71' : 'rgba(46,204,113,0.15)'}; color: ${!isWorking ? '#fff' : '#2ecc71'};">Break (5m)</button>
          </div>

          <div style="display: flex; gap: 30px; align-items: center; margin-top: auto; padding-bottom: 20px;">
            <button id="btn-reset" style="background: none; border: none; font-size: 50px; color: var(--text-secondary); cursor: pointer;"><i class="ph-fill ph-arrow-counter-clockwise"></i></button>
            <button id="btn-play" style="background: none; border: none; font-size: 70px; color: ${isRunning ? 'var(--accent-red)' : ringColor}; cursor: pointer;"><i class="ph-fill ${isRunning ? 'ph-pause-circle' : 'ph-play-circle'}"></i></button>
          </div>

        </div>
      </div>
    `;
    attachListeners();
  };

  const attachListeners = () => {
    document.getElementById('focus-back-btn').addEventListener('click', () => {
      clearInterval(focusInterval); // Zatrzymaj timer gdy wychodzimy
      onBack();
    });

    document.getElementById('mode-pomo').addEventListener('click', () => { isPomodoroMode = true; resetTimer(); });
    document.getElementById('mode-stop').addEventListener('click', () => { isPomodoroMode = false; resetTimer(); });

    document.getElementById('btn-work')?.addEventListener('click', () => setPomodoro(25, true));
    document.getElementById('btn-break')?.addEventListener('click', () => setPomodoro(5, false));

    document.getElementById('btn-reset').addEventListener('click', resetTimer);
    document.getElementById('btn-play').addEventListener('click', toggleTimer);
  };

  const syncTime = () => {
    if (pendingSecondsToSync > 0) {
      console.log(`Syncing ${pendingSecondsToSync} seconds to DB...`);
      // Tutaj Supabase logic: await storage.addStudyTime(seconds: timeToSync)
      dailyStudyTime += pendingSecondsToSync;
      pendingSecondsToSync = 0;
    }
  };

  const resetTimer = () => {
    isRunning = false;
    syncTime();
    if (isPomodoroMode) timeRemaining = totalDuration;
    else stopwatchSeconds = 0;
    renderUI();
  };

  const setPomodoro = (minutes, workMode) => {
    isRunning = false;
    syncTime();
    isWorking = workMode;
    totalDuration = minutes * 60;
    timeRemaining = totalDuration;
    renderUI();
  };

  const toggleTimer = () => {
    if (isRunning) {
      isRunning = false;
      syncTime();
    } else {
      if (isPomodoroMode && timeRemaining <= 0) return;
      isRunning = true;
      lastTickTime = Date.now();
    }
    renderUI();
  };

  const tick = () => {
    if (!isRunning) return;
    
    // Obliczanie realnego czasu jaki minął (odporne na usypianie karty w przeglądarce)
    const now = Date.now();
    const delta = Math.floor((now - lastTickTime) / 1000);
    
    if (delta > 0) {
      lastTickTime = now;
      pendingSecondsToSync += delta;

      if (isPomodoroMode) {
        timeRemaining -= delta;
        if (timeRemaining <= 0) {
          timeRemaining = 0;
          isRunning = false;
          syncTime();
          alert(isWorking ? "Focus session complete!" : "Break is over!");
          // Tutaj logic zapisu sesji pomodoro do DB
        }
      } else {
        stopwatchSeconds += delta;
      }

      if (pendingSecondsToSync >= 300) syncTime();
      renderUI();
    }
  };

  if (focusInterval) clearInterval(focusInterval);
  focusInterval = setInterval(tick, 1000);
  renderUI();
}