export const ACHIEVEMENT_GROUPS = [
  {
    baseId: "first_step", icon: "👶", title: "First Step", isGroup: false,
    items: [{ id: "first_step", title: "First Step", desc: "Complete your first topic.", threshold: 1 }]
  },
  {
    baseId: "gradebook_first", icon: "📒", title: "Gradebook First", isGroup: false,
    items: [{ id: "gradebook_first", title: "Gradebook First", desc: "Add your very first grade.", threshold: 1 }]
  },
  {
    baseId: "clean_sheet", icon: "🧹", title: "Clean Sheet", isGroup: false,
    items: [{ id: "clean_sheet", title: "Clean Sheet", desc: "Complete all scheduled tasks for the day.", threshold: 1 }]
  },
  {
    baseId: "topics", icon: "✅", title: "Task Finisher", isGroup: true,
    items: [
      { id: "topics_10", title: "Task Finisher I", desc: "Complete 10 topics.", threshold: 10 },
      { id: "topics_50", title: "Task Finisher II", desc: "Complete 50 topics.", threshold: 50 },
      { id: "topics_100", title: "Task Finisher III", desc: "Complete 100 topics.", threshold: 100 },
      { id: "topics_500", title: "Task Finisher IV", desc: "Complete 500 topics.", threshold: 500 }
    ]
  },
  {
    baseId: "exams", icon: "🎓", title: "Exam Slayer", isGroup: true,
    items: [
      { id: "exams_5", title: "Exam Slayer I", desc: "Add 5 exams.", threshold: 5 },
      { id: "exams_20", title: "Exam Slayer II", desc: "Add 20 exams.", threshold: 20 },
      { id: "exams_50", title: "Exam Slayer III", desc: "Add 50 exams.", threshold: 50 }
    ]
  },
  {
    baseId: "notes", icon: "📝", title: "Notetaker", isGroup: true,
    items: [
      { id: "notes_10", title: "Notetaker I", desc: "Add 10 notes to topics/exams.", threshold: 10 },
      { id: "notes_50", title: "Notetaker II", desc: "Add 50 notes.", threshold: 50 }
    ]
  },
  {
    baseId: "days_off", icon: "🏖️", title: "Chill Guy", isGroup: true,
    items: [
      { id: "days_off_5", title: "Chill Guy I", desc: "Block 5 days off.", threshold: 5 },
      { id: "days_off_20", title: "Chill Guy II", desc: "Block 20 days off.", threshold: 20 }
    ]
  },
  {
    baseId: "planner_master", icon: "📅", title: "Planner Master", isGroup: true,
    items: [
      { id: "planner_master_10", title: "Planner Master I", desc: "Schedule 10 topics manually.", threshold: 10 },
      { id: "planner_master_50", title: "Planner Master II", desc: "Schedule 50 topics manually.", threshold: 50 }
    ]
  }
];

// Zwraca listę ID osiągnięć, które właśnie zostały odblokowane
export const evaluateAchievements = (data, unlockedIds) => {
  const newlyUnlocked = [];
  const check = (id, condition) => {
    if (condition && !unlockedIds.includes(id)) newlyUnlocked.push(id);
  };

  const { topics, exams, grades, blockedDates } = data;

  // 1. First Step
  const topicsDoneCount = (topics || []).filter(t => t.status === 'done').length;
  check('first_step', topicsDoneCount >= 1);

  // 2. Gradebook First
  check('gradebook_first', (grades || []).length > 0);

  // 3. Topics
  check('topics_10', topicsDoneCount >= 10);
  check('topics_50', topicsDoneCount >= 50);
  check('topics_100', topicsDoneCount >= 100);
  check('topics_500', topicsDoneCount >= 500);

  // 4. Exams
  const examsCount = (exams || []).length;
  check('exams_5', examsCount >= 5);
  check('exams_20', examsCount >= 20);
  check('exams_50', examsCount >= 50);

  // 5. Notes
  const notesCount = (topics || []).filter(t => t.note?.length > 0).length + (exams || []).filter(e => e.note?.length > 0).length;
  check('notes_10', notesCount >= 10);
  check('notes_50', notesCount >= 50);

  // 6. Days Off
  const daysOffCount = (blockedDates || []).length;
  check('days_off_5', daysOffCount >= 5);
  check('days_off_20', daysOffCount >= 20);

  // 7. Planner Master
  const scheduledCount = (topics || []).filter(t => t.scheduled_date !== null).length;
  check('planner_master_10', scheduledCount >= 10);
  check('planner_master_50', scheduledCount >= 50);

  return newlyUnlocked;
};

// Pomocnicza funkcja do znalezienia danych osiągnięcia po ID
export const getAchievementData = (id) => {
  for (const group of ACHIEVEMENT_GROUPS) {
    const item = group.items.find(i => i.id === id);
    if (item) return { ...item, icon: group.icon };
  }
  return null;
};