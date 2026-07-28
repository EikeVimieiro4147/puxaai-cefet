import { type Course, type RawCourseJSON, type RawScheduleJSON, type TimeSlot, type DayOfWeek } from '../types/schedule';

function parseTime(timeStr: string): { hour: number; minute: number } {
    const [hour, minute] = timeStr.split(':').map(Number);
    return { hour, minute };
}

export function transformRawCourse(raw: RawCourseJSON, allRaw: RawCourseJSON[], completedCodes: string[]): Course {
    const slots: TimeSlot[] = raw.slots.map(slot => {
        const { hour: startHour, minute: startMinute } = parseTime(slot.start);
        const { hour: endHour, minute: endMinute } = parseTime(slot.end);
        return {
            day: slot.day as DayOfWeek,
            startHour,
            startMinute,
            endHour,
            endMinute,
        };
    });

    // Detect if name is a class code (e.g., "101020", "101021-A", "272549") and code is the subject name (e.g., "ACIONAMENTOS ELETRICOS")
    const isNameClassCode = /^[\d\-\.\sA-Z0-9]{1,10}$/i.test(raw.name.trim()) && raw.code.trim().length >= 3 && /[^\d]/.test(raw.code);
    const subjectName = isNameClassCode ? raw.code : raw.name;
    const classCode = isNameClassCode ? raw.name : raw.code;

    // Calculate unlocks: which other courses have this course code as a prerequisite
    const unlocks = [...new Set(allRaw
        .filter(c => c.pre_requisits.includes(raw.code))
        .map(c => c.code))];

    const prerequisitesMet = raw.pre_requisits.every(req => completedCodes.includes(req));

    return {
        id: raw.id,
        code: classCode,
        name: subjectName,
        degree: raw.degree,
        professor: raw.professors.join(', '),
        period: parseInt(raw.period, 10) || 1,
        slots,
        occupancy: {
            total: parseInt(raw.occupancy.total, 10) || 0,
            occupied: parseInt(raw.occupancy.occupied, 10) || 0,
            requested: parseInt(raw.occupancy.requested, 10) || 0,
        },
        prerequisites: raw.pre_requisits,
        prerequisitesMet,
        unlocks,
        blockedCourses: [], // initialized empty
        blockingWeight: 0,  // initialized to 0
        credits: raw.credits,
    };
}

export interface TransformedData {
    courses: Course[];
    confirmedIds: string[];
    plannedIds: string[];
    completedCodes: string[];
}

export function transformFullData(data: RawScheduleJSON): TransformedData {
    if (!data) {
        return { courses: [], confirmedIds: [], plannedIds: [], completedCodes: [] };
    }
    const rawCourses = data.courses || [];
    const user = data.user || {} as any;
    const completedCodes = user.completed_courses_codes || [];

    const courses = rawCourses.map(raw => transformRawCourse(raw, rawCourses, completedCodes));

    // Build dependents graph to calculate blocking weights (BFS DFS Simulation)
    const dependentsGraph: Record<string, string[]> = {};
    courses.forEach(c => {
      dependentsGraph[c.code] = [];
    });
    
    // Fill graph edges
    courses.forEach(c => {
      c.prerequisites.forEach(prereq => {
        if (dependentsGraph[prereq]) {
          dependentsGraph[prereq].push(c.code);
        }
      });
    });

    const getBlockedDeepest = (courseCode: string) => {
      const visited = new Set<string>();
      const queue = [...(dependentsGraph[courseCode] || [])];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited.has(current)) {
          visited.add(current);
          if (dependentsGraph[current]) {
            queue.push(...dependentsGraph[current]);
          }
        }
      }
      return Array.from(visited);
    };

    // Second pass to fill data
    courses.forEach(c => {
        const deepBlocked = getBlockedDeepest(c.code);
        c.blockedCourses = deepBlocked;
        c.blockingWeight = deepBlocked.length;
    });

    return {
        courses,
        confirmedIds: user.confirmed_course_ids || [],
        plannedIds: user.planned_course_ids || [],
        completedCodes,
    };
}

