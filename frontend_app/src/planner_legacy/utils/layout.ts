import { type Course, type TimeSlot, type DayOfWeek } from '@/types/schedule';

export interface LayoutEvent {
    course: Course;
    slot: TimeSlot;
    start: number; // minutes from start of day (0-1440)
    end: number;   // minutes from start of day
    width: number; // 0-100%
    left: number;  // 0-100%
    zIndex: number;
}

export function computeEventLayout(courses: Course[], day: DayOfWeek): LayoutEvent[] {
    // 1. Flatten into single events with start/end times
    const events: LayoutEvent[] = [];

    courses.forEach(course => {
        course.slots.forEach(slot => {
            if (slot.day === day) {
                events.push({
                    course,
                    slot,
                    start: slot.startHour * 60 + slot.startMinute,
                    end: slot.endHour * 60 + slot.endMinute,
                    width: 100,
                    left: 0,
                    zIndex: 10
                });
            }
        });
    });

    if (events.length === 0) return [];

    // 2. Sort by start time, then duration (longer first)
    events.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start);
    });

    // 3. Cluster into connected overlapping groups
    const groups: LayoutEvent[][] = [];
    if (events.length > 0) {
        let currentGroup: LayoutEvent[] = [events[0]];
        let groupEnd = events[0].end;

        for (let i = 1; i < events.length; i++) {
            const event = events[i];
            if (event.start < groupEnd) {
                currentGroup.push(event);
                groupEnd = Math.max(groupEnd, event.end);
            } else {
                groups.push(currentGroup);
                currentGroup = [event];
                groupEnd = event.end;
            }
        }
        groups.push(currentGroup);
    }

    // 4. Layout each group independently
    // Algorithm: Column packing. Pack events into columns if no conflict.
    // Then expand width to 1/TotalColumns.

    groups.forEach(group => {
        const columns: LayoutEvent[][] = [];

        group.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                // Check if event can fit in this column (starts after the last event in column ends)
                if (ev.start >= col[col.length - 1].end) {
                    col.push(ev);
                    ev.left = i; // Temporarily store column index
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                columns.push([ev]);
                ev.left = columns.length - 1; // New column index
            }
        });

        const totalCols = columns.length;
        const widthPerCol = 100 / totalCols;

        group.forEach(ev => {
            ev.width = widthPerCol;
            ev.left = ev.left * widthPerCol;
            ev.zIndex = 1;
        });
    });

    return events;
}
