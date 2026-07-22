export interface Course {
  id: string;
  name: string;
  semester: number;
  prereqs: string[]; // List of Course IDs required
  credits?: number;
}

export enum CourseStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
}

export interface CourseNode extends Course {
  status: CourseStatus;
  blockingWeight: number;
  blockedCourses: string[];
}

export interface ClassSession {
  day: string; // SEG, TER, QUA, QUI, SEX, SAB
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  room: string;
  type: 'Teórica' | 'Prática';
}

export interface ClassGroup {
  courseName: string; // Matches NOME_DISCIPLINA
  classCode: string; // COD_TURMA (Visual identifier like "1", "5")
  code: string; // Unique Identifier from Dept (e.g., "GAMB 157007")
  courseOrigin: string; // E.g. "ELÉTRICA", "CIVIL"
  teacher?: string;
  sessions: ClassSession[];
}