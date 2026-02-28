export const ACHIEVEMENT_GROUPS = [
  // --- POJEDYNCZE OSIĄGNIĘCIA ---
  {
    baseId: "first_step", icon: "👶", title: "First Step", isGroup: false,
    items: [{ id: "first_step", title: "First Step", desc: "Start your journey.", threshold: 1 }]
  },
  {
    baseId: "clean_sheet", icon: "🧹", title: "Clean Sheet", isGroup: false,
    items: [{ id: "clean_sheet", title: "Clean Sheet", desc: "Complete all scheduled tasks for the day.", threshold: 1 }]
  },
  {
    baseId: "record_breaker", icon: "🚀", title: "Record Breaker", isGroup: false,
    items: [{ id: "record_breaker", title: "Record Breaker", desc: "Set a new personal record.", threshold: 1 }]
  },
  {
    baseId: "gradebook_first", icon: "📒", title: "Gradebook First", isGroup: false,
    items: [{ id: "gradebook_first", title: "Gradebook First", desc: "Add your very first grade.", threshold: 1 }]
  },
  {
    baseId: "limit_breaker", icon: "🚀", title: "Limit Breaker", isGroup: false,
    items: [{ id: "limit_breaker", title: "Limit Breaker", desc: "Get a grade over 100%.", threshold: 100 }]
  },
  {
    baseId: "comeback_king", icon: "👑", title: "Comeback King", isGroup: false,
    items: [{ id: "comeback_king", title: "Comeback King", desc: "Bounce back from a 2.0 to a 4.0+ in the same module.", threshold: 1 }]
  },

  // --- UNIKALNE OCENY ---
  { baseId: "grade_bad_day", icon: "🌧️", title: "Bad Day", isGroup: false, items: [{ id: "grade_bad_day", title: "Bad Day", desc: "Receive a 2.0 grade.", threshold: 2.0 }] },
  { baseId: "grade_close_call", icon: "😅", title: "Close Call", isGroup: false, items: [{ id: "grade_close_call", title: "Close Call", desc: "Pass a subject with a final grade of 3.0.", threshold: 3.0 }] },
  { baseId: "grade_steady", icon: "🧱", title: "Steady", isGroup: false, items: [{ id: "grade_steady", title: "Steady", desc: "Receive a 3.5 grade.", threshold: 3.5 }] },
  { baseId: "grade_good_job", icon: "👍", title: "Good Job", isGroup: false, items: [{ id: "grade_good_job", title: "Good Job", desc: "Receive a 4.0 grade.", threshold: 4.0 }] },
  { baseId: "grade_high_flyer", icon: "✈️", title: "High Flyer", isGroup: false, items: [{ id: "grade_high_flyer", title: "High Flyer", desc: "Receive a 4.5 grade.", threshold: 4.5 }] },
  { baseId: "grade_ace", icon: "🌟", title: "Ace", isGroup: false, items: [{ id: "grade_ace", title: "Ace", desc: "Receive a perfect 5.0 grade.", threshold: 5.0 }] },

  // --- GRUPY WIELOPOZIOMOWE ---
  {
    baseId: "hours_daily", icon: "⏳", title: "Marathon Runner", isGroup: true,
    items: [
      { id: "hours_daily_1", title: "Marathon Runner I", desc: "Study 1 hour in a single day.", threshold: 1 },
      { id: "hours_daily_2", title: "Marathon Runner II", desc: "Study 2 hours in a single day.", threshold: 2 },
      { id: "hours_daily_3", title: "Marathon Runner III", desc: "Study 4 hours in a single day.", threshold: 4 },
      { id: "hours_daily_4", title: "Marathon Runner IV", desc: "Study 6 hours in a single day.", threshold: 6 }
    ]
  },
  {
    baseId: "hours_total", icon: "⌛", title: "Dedicated Student", isGroup: true,
    items: [
      { id: "hours_total_1", title: "Dedicated I", desc: "Reach 10 total hours of study.", threshold: 10 },
      { id: "hours_total_2", title: "Dedicated II", desc: "Reach 50 total hours of study.", threshold: 50 },
      { id: "hours_total_3", title: "Dedicated III", desc: "Reach 100 total hours of study.", threshold: 100 },
      { id: "hours_total_4", title: "Dedicated IV", desc: "Reach 200 total hours of study.", threshold: 200 }
    ]
  },
  {
    baseId: "balance", icon: "🏖️", title: "Balance", isGroup: true,
    items: [
      { id: "balance_1", title: "Balance I", desc: "Block 1 day off.", threshold: 1 },
      { id: "balance_2", title: "Balance II", desc: "Block 3 days off.", threshold: 3 },
      { id: "balance_3", title: "Balance III", desc: "Block 7 days off.", threshold: 7 },
      { id: "balance_4", title: "Balance IV", desc: "Block 14 days off.", threshold: 14 },
      { id: "balance_5", title: "Balance V", desc: "Block 20 days off.", threshold: 20 },
      { id: "balance_6", title: "Balance VI", desc: "Block 60 days off.", threshold: 60 },
      { id: "balance_7", title: "Balance VII", desc: "Block 360 days off.", threshold: 360 }
    ]
  },
  {
    baseId: "scribe", icon: "✍", title: "Scribe", isGroup: true,
    items: [
      { id: "scribe_1", title: "Scribe I", desc: "Write 5 notes.", threshold: 5 },
      { id: "scribe_2", title: "Scribe II", desc: "Write 10 notes.", threshold: 10 },
      { id: "scribe_3", title: "Scribe III", desc: "Write 25 notes.", threshold: 25 },
      { id: "scribe_4", title: "Scribe IV", desc: "Write 50 notes.", threshold: 50 },
      { id: "scribe_5", title: "Scribe V", desc: "Write 100 notes.", threshold: 100 },
      { id: "scribe_6", title: "Scribe VI", desc: "Write 250 notes.", threshold: 250 },
      { id: "scribe_7", title: "Scribe VII", desc: "Write 500 notes.", threshold: 500 },
      { id: "scribe_8", title: "Scribe VIII", desc: "Write 1000 notes.", threshold: 1000 },
      { id: "scribe_9", title: "Scribe IX", desc: "Write 2000 notes.", threshold: 2000 }
    ]
  },
  {
    baseId: "encyclopedia", icon: "📚", title: "Encyclopedia", isGroup: true,
    items: [
      { id: "encyclopedia_1", title: "Encyclopedia I", desc: "Master 10 topics.", threshold: 10 },
      { id: "encyclopedia_2", title: "Encyclopedia II", desc: "Master 25 topics.", threshold: 25 },
      { id: "encyclopedia_3", title: "Encyclopedia III", desc: "Master 50 topics.", threshold: 50 },
      { id: "encyclopedia_4", title: "Encyclopedia IV", desc: "Master 100 topics.", threshold: 100 },
      { id: "encyclopedia_5", title: "Encyclopedia V", desc: "Master 200 topics.", threshold: 200 },
      { id: "encyclopedia_6", title: "Encyclopedia VI", desc: "Master 250 topics.", threshold: 250 },
      { id: "encyclopedia_7", title: "Encyclopedia VII", desc: "Master 500 topics.", threshold: 500 },
      { id: "encyclopedia_8", title: "Encyclopedia VIII", desc: "Master 1000 topics.", threshold: 1000 },
      { id: "encyclopedia_9", title: "Encyclopedia IX", desc: "Master 2000 topics.", threshold: 2000 }
    ]
  },
  {
    baseId: "time_lord", icon: "🍅", title: "Time Lord", isGroup: true,
    items: [
      { id: "time_lord_1", title: "Time Lord I", desc: "Finish 5 sessions.", threshold: 5 },
      { id: "time_lord_2", title: "Time Lord II", desc: "Finish 10 sessions.", threshold: 10 },
      { id: "time_lord_3", title: "Time Lord III", desc: "Finish 25 sessions.", threshold: 25 },
      { id: "time_lord_4", title: "Time Lord IV", desc: "Finish 50 sessions.", threshold: 50 },
      { id: "time_lord_5", title: "Time Lord V", desc: "Finish 100 sessions.", threshold: 100 },
      { id: "time_lord_6", title: "Time Lord VI", desc: "Finish 500 sessions.", threshold: 500 },
      { id: "time_lord_7", title: "Time Lord VII", desc: "Finish 1000 sessions.", threshold: 1000 }
    ]
  },
  {
    baseId: "session_master", icon: "🎓", title: "Session Master", isGroup: true,
    items: [
      { id: "session_master_1", title: "Session Master I", desc: "Clear 1 exam fully.", threshold: 1 },
      { id: "session_master_2", title: "Session Master II", desc: "Clear 3 exams fully.", threshold: 3 },
      { id: "session_master_3", title: "Session Master III", desc: "Clear 5 exams fully.", threshold: 5 },
      { id: "session_master_4", title: "Session Master IV", desc: "Clear 10 exams fully.", threshold: 10 },
      { id: "session_master_5", title: "Session Master V", desc: "Clear 20 exams fully.", threshold: 20 },
      { id: "session_master_6", title: "Session Master VI", desc: "Clear 100 exams fully.", threshold: 100 },
      { id: "session_master_7", title: "Session Master VII", desc: "Clear 250 exams fully.", threshold: 250 }
    ]
  },
  {
    baseId: "polyglot", icon: "🌍", title: "Polyglot", isGroup: true,
    items: [
      { id: "polyglot_1", title: "Polyglot I", desc: "Add 2 subjects.", threshold: 2 },
      { id: "polyglot_2", title: "Polyglot II", desc: "Add 3 subjects.", threshold: 3 },
      { id: "polyglot_3", title: "Polyglot III", desc: "Add 5 subjects.", threshold: 5 },
      { id: "polyglot_4", title: "Polyglot IV", desc: "Add 10 subjects.", threshold: 10 },
      { id: "polyglot_5", title: "Polyglot V", desc: "Add 20 subjects.", threshold: 20 },
      { id: "polyglot_6", title: "Polyglot VI", desc: "Add 50 subjects.", threshold: 50 },
      { id: "polyglot_7", title: "Polyglot VII", desc: "Add 100 subjects.", threshold: 100 },
      { id: "polyglot_8", title: "Polyglot VIII", desc: "Add 500 subjects.", threshold: 500 }
    ]
  },
  {
    baseId: "strategist", icon: "📅", title: "Strategist", isGroup: true,
    items: [
      { id: "strategist_1", title: "Strategist I", desc: "Schedule 7 days ahead.", threshold: 7 },
      { id: "strategist_2", title: "Strategist II", desc: "Schedule 14 days ahead.", threshold: 14 },
      { id: "strategist_3", title: "Strategist III", desc: "Schedule 30 days ahead.", threshold: 30 },
      { id: "strategist_4", title: "Strategist IV", desc: "Schedule 60 days ahead.", threshold: 60 }
    ]
  },
  {
    baseId: "gpa", icon: "🎓", title: "Academic Weapon", isGroup: true,
    items: [
      { id: "gpa_scholar", title: "Scholar", desc: "Achieve a GPA of 4.0", threshold: 4.0 },
      { id: "gpa_mastermind", title: "Mastermind", desc: "Achieve a GPA of 4.75", threshold: 4.75 }
    ]
  },
  {
    baseId: "busy_day", icon: "🔥", title: "Busy Day", isGroup: true,
    items: [
      { id: "busy_day_1", title: "Busy Day I", desc: "Complete 10 tasks in a day.", threshold: 10 },
      { id: "busy_day_2", title: "Busy Day II", desc: "Complete 15 tasks in a day.", threshold: 15 },
      { id: "busy_day_3", title: "Busy Day III", desc: "Complete 20 tasks in a day.", threshold: 20 },
      { id: "busy_day_4", title: "Busy Day IV", desc: "Complete 30 tasks in a day.", threshold: 30 }
    ]
  }
];

// Helper do wyliczania GPA
const calculateMockGPA = (subjects, gradeModules, grades) => {
  let totalWeightedScore = 0.0;
  let totalECTS = 0.0;
  
  const thresholds = [
    { grade: 5.0, minPercent: 90.0 },
    { grade: 4.5, minPercent: 80.0 },
    { grade: 4.0, minPercent: 70.0 },
    { grade: 3.5, minPercent: 60.0 },
    { grade: 3.0, minPercent: 50.0 }
  ];

  (subjects || []).forEach(sub => {
    const modules = (gradeModules || []).filter(m => m.subject_id === sub.id);
    const subGrades = (grades || []).filter(g => g.subject_id === sub.id);
    let subTotalWeighted = 0.0;
    let subTotalGradedWeight = 0.0;

    modules.forEach(mod => {
      const modGrades = subGrades.filter(g => g.module_id === mod.id);
      const modWeightFactor = (mod.weight || 0.0) / 100.0;
      subTotalGradedWeight += modWeightFactor;
      
      let sumW = 0.0, weightedSum = 0.0;
      modGrades.forEach(g => {
        const w = g.weight || 0.0;
        sumW += w;
        weightedSum += g.value * w;
      });
      
      if (sumW > 0) subTotalWeighted += (weightedSum / sumW) * modWeightFactor;
    });

    if (subTotalGradedWeight > 0) {
      const percent = subTotalWeighted / subTotalGradedWeight;
      let finalGrade = 2.0;
      for (let t of thresholds) {
        if (percent >= t.minPercent) { finalGrade = t.grade; break; }
      }
      const ects = sub.weight || 0.0;
      if (ects > 0) {
        totalWeightedScore += finalGrade * ects;
        totalECTS += ects;
      }
    }
  });

  return totalECTS === 0 ? 0 : (totalWeightedScore / totalECTS);
};

// Pomocnicza translacja wartości ocen na skale 2.0-5.0
const percentToGrade = (percent) => {
  if (percent >= 90) return 5.0;
  if (percent >= 80) return 4.5;
  if (percent >= 70) return 4.0;
  if (percent >= 60) return 3.5;
  if (percent >= 50) return 3.0;
  return 2.0;
};

export const evaluateAchievements = (data, unlockedIds) => {
  const newlyUnlocked = [];
  const check = (id, condition) => {
    if (condition && !unlockedIds.includes(id)) newlyUnlocked.push(id);
  };

  const { topics, exams, subjects, grades, gradeModules, blockedDates, globalStats, dailyTasks } = data;

  // 1. First Step & Gradebook
  check('first_step', (topics || []).some(t => t.status === 'done'));
  check('gradebook_first', (grades || []).length > 0);

  // 2. Scribe (NOTATKI: Tematy, Egzaminy, Zadania Codzinne)
  const scribeCount = 
    (topics || []).filter(t => t.note && t.note.trim().length > 0).length + 
    (exams || []).filter(e => e.note && e.note.trim().length > 0).length +
    (dailyTasks || []).filter(t => t.note && t.note.trim().length > 0).length;

  check('scribe_1', scribeCount >= 5);
  check('scribe_2', scribeCount >= 10);
  check('scribe_3', scribeCount >= 25);
  check('scribe_4', scribeCount >= 50);
  check('scribe_5', scribeCount >= 100);
  check('scribe_6', scribeCount >= 250);
  check('scribe_7', scribeCount >= 500);
  check('scribe_8', scribeCount >= 1000);
  check('scribe_9', scribeCount >= 2000);

  // 3. Encyclopedia (Topics mastered / done)
  const encyCount = (topics || []).filter(t => t.status === 'done').length;
  check('encyclopedia_1', encyCount >= 10);
  check('encyclopedia_2', encyCount >= 25);
  check('encyclopedia_3', encyCount >= 50);
  check('encyclopedia_4', encyCount >= 100);
  check('encyclopedia_5', encyCount >= 200);
  check('encyclopedia_6', encyCount >= 250);
  check('encyclopedia_7', encyCount >= 500);
  check('encyclopedia_8', encyCount >= 1000);
  check('encyclopedia_9', encyCount >= 2000);

  // 4. Polyglot (Subjects added)
  const polyCount = (subjects || []).length;
  check('polyglot_1', polyCount >= 2);
  check('polyglot_2', polyCount >= 3);
  check('polyglot_3', polyCount >= 5);
  check('polyglot_4', polyCount >= 10);
  check('polyglot_5', polyCount >= 20);
  check('polyglot_6', polyCount >= 50);
  check('polyglot_7', polyCount >= 100);
  check('polyglot_8', polyCount >= 500);

  // 5. Balance (Blocked dates)
  const balanceCount = (blockedDates || []).length;
  check('balance_1', balanceCount >= 1);
  check('balance_2', balanceCount >= 3);
  check('balance_3', balanceCount >= 7);
  check('balance_4', balanceCount >= 14);
  check('balance_5', balanceCount >= 20);
  check('balance_6', balanceCount >= 60);
  check('balance_7', balanceCount >= 360);

  // 6. Global Stats (Hours & Pomodoro)
  const getStat = (key) => {
    const s = (globalStats || []).find(x => x.key === key);
    return s ? parseFloat(s.value) : 0;
  };
  
  const dailyHours = getStat('daily_study_time') / 3600;
  check('hours_daily_1', dailyHours >= 1);
  check('hours_daily_2', dailyHours >= 2);
  check('hours_daily_3', dailyHours >= 4);
  check('hours_daily_4', dailyHours >= 6);
  check('record_breaker', dailyHours >= 8);

  const totalHours = getStat('total_study_time') / 3600;
  check('hours_total_1', totalHours >= 10);
  check('hours_total_2', totalHours >= 50);
  check('hours_total_3', totalHours >= 100);
  check('hours_total_4', totalHours >= 200);

  const sessions = getStat('total_sessions');
  check('time_lord_1', sessions >= 5);
  check('time_lord_2', sessions >= 10);
  check('time_lord_3', sessions >= 25);
  check('time_lord_4', sessions >= 50);
  check('time_lord_5', sessions >= 100);
  check('time_lord_6', sessions >= 500);
  check('time_lord_7', sessions >= 1000);

  // 7. Busy Day (Max tasks in single day)
  const dailyCounts = {};
  (dailyTasks || []).filter(t => t.status === 'done').forEach(t => {
     if (t.date) dailyCounts[t.date] = (dailyCounts[t.date] || 0) + 1;
  });
  const maxBusy = Math.max(0, ...Object.values(dailyCounts));
  check('busy_day_1', maxBusy >= 10);
  check('busy_day_2', maxBusy >= 15);
  check('busy_day_3', maxBusy >= 20);
  check('busy_day_4', maxBusy >= 30);

  // 8. Session Master (Exams fully completed)
  const examCompletion = {};
  (topics || []).forEach(t => {
    if (!examCompletion[t.exam_id]) examCompletion[t.exam_id] = { total: 0, done: 0 };
    examCompletion[t.exam_id].total++;
    if (t.status === 'done') examCompletion[t.exam_id].done++;
  });
  const examsFullyDone = (exams || []).filter(e => {
    const comp = examCompletion[e.id];
    return comp && comp.total > 0 && comp.total === comp.done;
  }).length;
  check('session_master_1', examsFullyDone >= 1);
  check('session_master_2', examsFullyDone >= 3);
  check('session_master_3', examsFullyDone >= 5);
  check('session_master_4', examsFullyDone >= 10);
  check('session_master_5', examsFullyDone >= 20);
  check('session_master_6', examsFullyDone >= 100);
  check('session_master_7', examsFullyDone >= 250);

  // 9. Strategist (Advance scheduling)
  let maxAdvanceDays = 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  (exams || []).forEach(e => {
    if (e.date) {
      const eDate = new Date(e.date);
      const diff = Math.ceil((eDate - today) / (1000 * 60 * 60 * 24));
      if (diff > maxAdvanceDays) maxAdvanceDays = diff;
    }
  });
  check('strategist_1', maxAdvanceDays >= 7);
  check('strategist_2', maxAdvanceDays >= 14);
  check('strategist_3', maxAdvanceDays >= 30);
  check('strategist_4', maxAdvanceDays >= 60);

  // 10. Grade specific checks
  const receivedGrades = (grades || []).map(g => percentToGrade(g.value));
  
  // Obliczanie ocen końcowych dla wszystkich przedmiotów dla "Close Call"
  const finalSubjectGrades = [];
  (subjects || []).forEach(sub => {
    const modules = (gradeModules || []).filter(m => m.subject_id === sub.id);
    const subGrades = (grades || []).filter(g => g.subject_id === sub.id);
    let subTotalWeighted = 0.0;
    let subTotalGradedWeight = 0.0;

    modules.forEach(mod => {
      const modGrades = subGrades.filter(g => g.module_id === mod.id);
      const modWeightFactor = (mod.weight || 0.0) / 100.0;
      subTotalGradedWeight += modWeightFactor;
      
      let sumW = 0.0, weightedSum = 0.0;
      modGrades.forEach(g => {
        const w = g.weight || 0.0;
        sumW += w;
        weightedSum += g.value * w;
      });
      
      if (sumW > 0) subTotalWeighted += (weightedSum / sumW) * modWeightFactor;
    });

    if (subTotalGradedWeight > 0) {
      const percent = subTotalWeighted / subTotalGradedWeight;
      finalSubjectGrades.push(percentToGrade(percent));
    }
  });

  check('grade_bad_day', receivedGrades.includes(2.0));
  check('grade_close_call', finalSubjectGrades.includes(3.0));
  check('grade_steady', receivedGrades.includes(3.5));
  check('grade_good_job', receivedGrades.includes(4.0));
  check('grade_high_flyer', receivedGrades.includes(4.5));
  check('grade_ace', receivedGrades.includes(5.0));
  check('limit_breaker', (grades || []).some(g => g.value > 100));

  // Comeback King
  const gradesByModule = {};
  (grades || []).forEach(g => {
    if (!gradesByModule[g.module_id]) gradesByModule[g.module_id] = [];
    gradesByModule[g.module_id].push(percentToGrade(g.value));
  });
  for (const modId in gradesByModule) {
    const vals = gradesByModule[modId];
    if (vals.includes(2.0) && vals.some(v => v >= 4.0)) {
       check('comeback_king', true);
       break;
    }
  }

  // 11. GPA
  const currentGPA = calculateMockGPA(subjects, gradeModules, grades);
  check('gpa_scholar', currentGPA >= 4.0);
  check('gpa_mastermind', currentGPA >= 4.75);

  return newlyUnlocked;
};

export const getAchievementData = (id) => {
  for (const group of ACHIEVEMENT_GROUPS) {
    const item = group.items.find(i => i.id === id);
    if (item) return { ...item, icon: group.icon, groupTitle: group.title };
  }
  return null;
};