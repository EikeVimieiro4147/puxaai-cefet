import { describe, it, expect } from 'vitest';
import { matchesDragSelection } from '../hooks/useSchedule';
import { Course, DragSelection } from '../types/schedule';

const mockCourse: Course = {
    id: 'test',
    code: 'TEST101',
    name: 'Test Course',
    professor: 'Test Prof',
    period: 1,
    slots: [{ day: 'SEG', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 }],
    occupancy: { total: 10, occupied: 0, requested: 0 },
    prerequisites: [],
    prerequisitesMet: true,
    unlocks: [],
    credits: 4,
};


describe('matchesDragSelection', () => {
    it('should return true when selection fully contains the course slot', () => {
        // Selection: 07:00 - 11:00 (Course: 08:00 - 10:00)
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 7,
            endHour: 11,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(true);
    });

    it('should return true when selection equals the course slot', () => {
        // Selection: 08:00 - 10:00 (Course: 08:00 - 10:00)
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 8,
            endHour: 10,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(true);
    });

    it('should return false when selection overlaps but does not contain (partial overlap at start)', () => {
        // Selection: 09:00 - 11:00 (Course: 08:00 - 10:00) -> Overlaps 9-10
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 9,
            endHour: 11,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(false);
    });

    it('should return false when selection overlaps but does not contain (partial overlap at end)', () => {
        // Selection: 07:00 - 09:00 (Course: 08:00 - 10:00) -> Overlaps 8-9
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 7,
            endHour: 9,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(false);
    });

    it('should return false when selection is completely outside (before)', () => {
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 6,
            endHour: 8,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(false);
    });

    it('should return false when selection is completely outside (after)', () => {
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 10,
            endHour: 12,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(false);
    });

    it('should return false when selection is on a different day', () => {
        const selection: DragSelection = {
            days: ['TER'],
            startHour: 7,
            endHour: 11,
        };
        expect(matchesDragSelection(mockCourse, selection)).toBe(false);
    });

    it('should return false when the course has multiple slots and some are outside the selection', () => {
        const multiSlotCourse: Course = {
            ...mockCourse,
            slots: [
                { day: 'SEG', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 },
                { day: 'QUA', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 },
            ],

        };

        // Selection only includes Monday
        const selection: DragSelection = {
            days: ['SEG'],
            startHour: 7,
            endHour: 11,
        };

        expect(matchesDragSelection(multiSlotCourse, selection)).toBe(false);
    });
});
