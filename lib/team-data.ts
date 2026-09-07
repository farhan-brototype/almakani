export type TeamProgram = {
  code: string;
  name: string;
  type: string;
  category: string;
  event_date: string | null;
  event_time: string | null;
  stage: string | null;
  completed: boolean;
};

export type TeamStudent = {
  id: string;
  adno: string;
  name: string;
  class: string | null;
  category: string | null;
  photo_url: string | null;
  programs: TeamProgram[];
};

export type TeamAssignment = {
  id: string;
  program_id: string;
  program_code: string;
  student_id: string;
  adno: string;
  name: string;
  slot_index?: number | null;
};

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Count programmes of a type, matched loosely so spelling never breaks a count. */
export const countByType = (programs: TeamProgram[], type: string) =>
  programs.filter((p) => norm(p.type ?? "") === norm(type)).length;
