// Who in the school receives a teacher's support request.
// Each school's Counselling and Learner Support Department handles requests
// first; the department asks CHOLIS for extra support only when needed.

export const DEPARTMENT_ROLES = ['School Counsellor', 'Learner Support Coordinator'] as const;
export type DepartmentRole = typeof DEPARTMENT_ROLES[number];

// Default routing used when a school has not set its own.
export const DEFAULT_ROUTING: Record<string, DepartmentRole | null> = {
  'Classroom behaviour': 'School Counsellor',
  'Emotional wellbeing': 'School Counsellor',
  'Peer relationships': 'School Counsellor',
  'Learning difficulties': 'Learner Support Coordinator',
  'Attendance': 'Learner Support Coordinator',
  'Inclusive education support': 'Learner Support Coordinator',
  'Other': null, // the teacher chooses
};

export function isDepartmentRole(v: unknown): v is DepartmentRole {
  return typeof v === 'string' && (DEPARTMENT_ROLES as readonly string[]).includes(v);
}

/** A school's routing: its own settings (stored as JSON) over the defaults. */
export function schoolRouting(stored: string | null | undefined): Record<string, DepartmentRole | null> {
  const routing = { ...DEFAULT_ROUTING };
  if (!stored) return routing;
  try {
    const custom = JSON.parse(stored);
    for (const [cat, role] of Object.entries(custom)) {
      if (cat in routing && (role === null || isDepartmentRole(role))) routing[cat] = role as DepartmentRole | null;
    }
  } catch { /* ignore bad settings, use defaults */ }
  return routing;
}
