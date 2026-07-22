import { useState, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';
import { type Course, type CourseStatus, type DayOfWeek, type DragSelection, type RawScheduleJSON } from '@/types/schedule';

import { fullMockData } from '@/data/fullMockData';
import { transformFullData } from '@/lib/dataAdapter';

const transformedMock = transformFullData(fullMockData as RawScheduleJSON);
const mockCourses = transformedMock.courses;
const confirmedCourseIds = transformedMock.confirmedIds;


export function slotsOverlap(a: Course, b: Course): boolean {

  for (const sa of a.slots) {
    for (const sb of b.slots) {
      const startA = sa.startHour * 60 + sa.startMinute;
      const endA = sa.endHour * 60 + sa.endMinute;
      const startB = sb.startHour * 60 + sb.startMinute;
      const endB = sb.endHour * 60 + sb.endMinute;

      if (sa.day === sb.day && startA < endB && startB < endA) {
        return true;
      }
    }
  }
  return false;
}

export function matchesDragSelection(course: Course, sel: DragSelection | null): boolean {
  if (!sel) return true;
  if (course.slots.length === 0) return false;
  return course.slots.every(s => {
    const slotStart = s.startHour * 60 + s.startMinute;
    const slotEnd = s.endHour * 60 + s.endMinute;
    const selStart = sel.startHour * 60;
    const selEnd = sel.endHour * 60;

    return sel.days.includes(s.day) && slotStart >= selStart && slotEnd <= selEnd;
  });
}


export interface Filters {
  searchText: string;
  professors: string[];
  degrees: string[];
  periods: number[];

  hourRange: [number, number];
  hideMissingPrerequisites: boolean;
  hideConflicts: boolean;
  hideFull: boolean;
}



import { API_BASE_URL } from '../../lib/apiConfig';

export function useSchedule(matricula?: string, initialData?: { courses?: Course[]; confirmedIds?: string[]; plannedIds?: string[] }) {
  const [courses, setCourses] = useState<Course[]>(initialData?.courses || mockCourses);
  const [confirmedIds, setConfirmedIds] = useState<string[]>(initialData?.confirmedIds || confirmedCourseIds);
  const [completedCodes, setCompletedCodes] = useState<string[]>([]);
  const [guestMatricula, setGuestMatricula] = useState<string | null>(null);
  const [guestPlannedIds, setGuestPlannedIds] = useState<Set<string>>(new Set());

  const [plannedIds, setPlannedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`cefet_planner_${matricula}_planned_v2`);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(initialData?.plannedIds || []);
  });

  useEffect(() => {
    if (matricula) {
      const arr = Array.from(plannedIds);
      localStorage.setItem(`cefet_planner_${matricula}_planned_v2`, JSON.stringify(arr));
      
      const timeout = setTimeout(() => {
          axios.post(`${API_BASE_URL}/api/social/sync_schedule`, {
             matricula,
             plannedIds: arr
          }).catch(() => console.error("Falha ao sincronizar online"));
      }, 1500); // Debounce de 1.5s pra não flodar Firebase
      
      return () => clearTimeout(timeout);
    }
  }, [plannedIds, matricula]);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => ({

    searchText: '',
    professors: [],
    degrees: [],
    periods: [...new Set((initialData?.courses || mockCourses).map(c => c.period))].sort((a, b) => a - b),
    hourRange: [7, 22],
    hideMissingPrerequisites: false,
    hideConflicts: false,
    hideFull: false,
  }));





  const confirmedSet = useMemo(() => new Set(confirmedIds), [confirmedIds]);

  const allProfessors = useMemo(() => {
    let baseCourses = courses;
    if (filters.degrees.length > 0) {
      baseCourses = courses.filter(c => c.degree && filters.degrees.includes(c.degree));
    }
    return [...new Set(baseCourses.map(c => c.professor))].filter(Boolean).sort();
  }, [courses, filters.degrees]);


  const allDegrees = useMemo(() =>
    [...new Set(courses.map(c => c.degree))].filter((d): d is string => !!d).sort(),
    [courses]);

  const allPeriods = useMemo(() =>
    [...new Set(courses.map(c => c.period))].sort((a, b) => a - b),
    [courses]);


  const selectedCourses = useMemo(() => {
    return courses.filter(c => confirmedSet.has(c.id) || plannedIds.has(c.id));
  }, [courses, confirmedSet, plannedIds]);

  const getCourseStatus = useCallback((course: Course): CourseStatus => {
    if (confirmedSet.has(course.id)) return 'confirmed';
    if (plannedIds.has(course.id)) return 'planned';
    if (!course.prerequisitesMet) return 'blocked';

    const hasConflict = selectedCourses.some(
      sc => sc.id !== course.id && slotsOverlap(sc, course)
    );
    if (hasConflict) return 'conflict';
    return 'available';
  }, [confirmedSet, plannedIds, selectedCourses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // 1. Grid duplication check
      if (confirmedSet.size > 0 && confirmedSet.has(course.id)) return false;

      // 2. Logic-based filters (independent of displayed status)
      const hasMissingPrerequisites = !course.prerequisitesMet;
      const hasConflict = selectedCourses.some(sc => sc.id !== course.id && slotsOverlap(sc, course));
      const isFull = course.occupancy.occupied >= course.occupancy.total;

      if (hasMissingPrerequisites && filters.hideMissingPrerequisites) return false;
      if (hasConflict && filters.hideConflicts) return false;
      if (isFull && filters.hideFull) return false;

      // 3. Search and property-based filters
      if (filters.searchText) {
        const q = filters.searchText.toLowerCase();
        if (
          !course.name.toLowerCase().includes(q) &&
          !course.code.toLowerCase().includes(q) &&
          !course.professor.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if ((filters.professors?.length || 0) > 0 && !filters.professors.includes(course.professor)) return false;
      if ((filters.degrees?.length || 0) > 0 && (!course.degree || !filters.degrees.includes(course.degree))) return false;
      if ((filters.periods?.length || 0) > 0 && !filters.periods.includes(course.period)) return false;



      const inRange = course.slots.every(
        s => s.startHour >= filters.hourRange[0] && s.endHour <= filters.hourRange[1]
      );
      if (!inRange) return false;

      if (dragSelection && !matchesDragSelection(course, dragSelection)) return false;

      return true;
    }).sort((a, b) => b.blockingWeight - a.blockingWeight || a.period - b.period || a.name.localeCompare(b.name));
  }, [courses, filters, getCourseStatus, confirmedSet, dragSelection]);

  const togglePlanned = useCallback((courseId: string) => {
    setPlannedIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }, []);

  const resetPlan = useCallback(() => {
    setPlannedIds(new Set());
  }, []);

  const clearDragSelection = useCallback(() => setDragSelection(null), []);

  const setData = useCallback((newData: { courses: Course[]; confirmedIds: string[]; plannedIds: string[], completedCodes?: string[] }) => {
    setCourses(newData.courses);
    setConfirmedIds(newData.confirmedIds);
    if (newData.completedCodes) setCompletedCodes(newData.completedCodes);

    const allP = [...new Set(newData.courses.map(c => c.period))].sort((a, b) => a - b);
    setFilters(f => ({ ...f, periods: allP }));
  }, []);



  return {
    courses,
    allProfessors,
    allDegrees,
    allPeriods,
    filteredCourses,

    selectedCourses,
    plannedIds,
    confirmedSet,
    completedCodes,
    getCourseStatus,

    togglePlanned,
    resetPlan,
    filters,
    setFilters,
    dragSelection,
    setDragSelection,
    clearDragSelection,
    hoveredId,
    setHoveredId,
    setData,
    guestMatricula,
    setGuestMatricula,
    guestPlannedIds,
    setGuestPlannedIds,
  };
}


