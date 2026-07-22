export type DayOfWeek = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';

export interface TimeSlot {
  day: DayOfWeek;
  startHour: number;   // 7 = 07:00
  startMinute: number; // 0-59
  endHour: number;     // 9 = 09:00
  endMinute: number;   // 0-59
}

export interface Course {
  id: string;
  code: string;
  name: string;
  degree?: string;      // Added for new JSON format
  professor: string;    // Will join professors array from JSON
  period: number;       // semestre
  slots: TimeSlot[];
  occupancy: {
    total: number;
    occupied: number;
    requested: number;
  };
  prerequisites: string[];
  prerequisitesMet: boolean;
  unlocks: string[];    // Courses that depend on this one directly
  blockedCourses: string[]; // Deep graph recursive blocks
  blockingWeight: number;   // Number of courses unlocked deeply
  credits: number;
}

/**
 * Raw JSON format as provided by the user upload
 */
export interface RawScheduleJSON {
  version: string;
  metadata: {
    semester: string;
    last_update: string;
  };
  courses: RawCourseJSON[];
  user: {
    confirmed_course_ids: string[];
    planned_course_ids: string[];
    completed_courses_codes: string[];
  };
}

export interface RawCourseJSON {
  id: string;
  code: string; // Course name in user's format?
  name: string; // Course code in user's format?
  degree: string;
  professors: string[];
  period: string; // String in JSON
  credits: number;
  occupancy: {
    total: string;
    occupied: string;
    requested: string;
  };
  slots: {
    day: DayOfWeek;
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  }[];
  pre_requisits: string[];
}


export type CourseStatus = 'available' | 'confirmed' | 'planned' | 'conflict' | 'blocked';

export interface ScheduleEntry {
  course: Course;
  status: CourseStatus;
}

export interface DragSelection {
  days: DayOfWeek[];
  startHour: number;
  endHour: number;
}

export const DAYS: DayOfWeek[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
export const DAY_LABELS: Record<DayOfWeek, string> = {
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sábado',
};

export const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00
