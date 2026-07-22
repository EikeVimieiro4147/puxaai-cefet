import { useCallback, useRef, useState } from 'react';
import { Course, CourseStatus, DAYS, DAY_LABELS, HOURS, DayOfWeek, DragSelection } from '@/types/schedule';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CourseTooltipContent } from './CourseTooltip';
import { X, AlertTriangle, Lock, Clock, Users2 } from 'lucide-react';
import { slotsOverlap } from '@/hooks/useSchedule';



import { computeEventLayout } from '@/utils/layout';

interface ScheduleGridProps {
  selectedCourses: Course[];
  getCourseStatus: (course: Course) => CourseStatus;
  onRemovePlanned: (id: string) => void;
  confirmedSet: Set<string>;
  completedCodes: string[];
  dragSelection: DragSelection | null;
  onDragSelect: (sel: DragSelection | null) => void;
  hoveredId: string | null;
  courses: Course[];
  hourRange: [number, number];
}




export function ScheduleGrid({
  selectedCourses,
  getCourseStatus,
  onRemovePlanned,
  confirmedSet,
  completedCodes,
  dragSelection,
  onDragSelect,
  hoveredId,
  courses,
  hourRange,
}: ScheduleGridProps) {


  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ day: DayOfWeek; hour: number } | null>(null);
  const [tempDrag, setTempDrag] = useState<DragSelection | null>(null);

  const visibleHours = HOURS.filter(h => h >= hourRange[0] && h < hourRange[1]);

  const getBlocksForCell = useCallback((day: DayOfWeek, hour: number) => {
    return selectedCourses.filter(c =>
      c.slots.some(s => s.day === day && s.startHour <= hour && s.endHour > hour)
    );
  }, [selectedCourses]);

  const getBlockSpan = useCallback((course: Course, day: DayOfWeek) => {
    const slot = course.slots.find(s => s.day === day);
    if (!slot) return 1;
    // Occupies all hours from startHour to endHour
    const startHour = slot.startHour;
    const endHour = slot.endMinute > 0 ? slot.endHour : slot.endHour - 1;
    return Math.max(1, endHour - startHour + 1);
  }, []);

  const isBlockStart = useCallback((course: Course, day: DayOfWeek, hour: number) => {
    return course.slots.some(s => s.day === day && s.startHour === hour);
  }, []);

  const handleMouseDown = useCallback((day: DayOfWeek, hour: number) => {
    if (getBlocksForCell(day, hour).length > 0) return;
    setDragging(true);
    dragStart.current = { day, hour };
    setTempDrag({ days: [day], startHour: hour, endHour: hour + 1 });
  }, [getBlocksForCell]);

  const handleMouseEnter = useCallback((day: DayOfWeek, hour: number) => {
    if (!dragging || !dragStart.current) return;
    const startDayIdx = DAYS.indexOf(dragStart.current.day);
    const curDayIdx = DAYS.indexOf(day);
    const minDay = Math.min(startDayIdx, curDayIdx);
    const maxDay = Math.max(startDayIdx, curDayIdx);
    const days = DAYS.slice(minDay, maxDay + 1);
    const start = Math.min(dragStart.current.hour, hour);
    const end = Math.max(dragStart.current.hour, hour) + 1;
    setTempDrag({ days, startHour: start, endHour: end });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (tempDrag) {
      const isSingleSegment = tempDrag.days.length === 1 && (tempDrag.endHour - tempDrag.startHour === 1);

      const isAlreadySelected = dragSelection &&
        dragSelection.days.length === 1 &&
        dragSelection.days[0] === tempDrag.days[0] &&
        dragSelection.startHour === tempDrag.startHour &&
        dragSelection.endHour === tempDrag.endHour;

      if (isSingleSegment && isAlreadySelected) {
        onDragSelect(null);
      } else {
        onDragSelect(tempDrag);
      }
    }
    setDragging(false);
    dragStart.current = null;
    setTempDrag(null);
  }, [tempDrag, onDragSelect, dragSelection]);

  const isInDragSelection = (day: DayOfWeek, hour: number) => {
    const sel = tempDrag || dragSelection;
    if (!sel) return false;
    return sel.days.includes(day) && hour >= sel.startHour && hour < sel.endHour;
  };

  // Render blocks - track which cells are occupied by multi-hour blocks
  const rendered = new Set<string>();

  return (
    <div className="flex-1 overflow-auto" onMouseUp={handleMouseUp} onMouseLeave={() => { setDragging(false); setTempDrag(null); }}>
      <div className="min-w-[700px] relative">
        {/* Header */}
        <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
          <div className="bg-schedule-header text-schedule-header-fg text-xs font-medium p-2 text-center rounded-tl-lg">
            Hora
          </div>
          {DAYS.map((day, i) => (
            <div key={day} className={`bg-schedule-header text-schedule-header-fg text-xs font-medium p-2 text-center ${i === 5 ? 'rounded-tr-lg' : ''}`}>
              {DAY_LABELS[day]}
            </div>
          ))}
        </div>

        {/* Body */}
        {visibleHours.map(hour => (
          <div key={hour} className="grid" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
            {/* Time label */}
            <div className="bg-schedule-time-col text-xs text-muted-foreground p-2 text-center border-b border-r font-mono" style={{ borderColor: 'hsl(var(--schedule-grid-line))' }}>
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* Day cells */}
            {DAYS.map(day => {
              const cellKey = `${day}-${hour}`;
              const inDrag = isInDragSelection(day, hour);

              return (
                <div
                  key={cellKey}
                  className={`schedule-cell h-12 select-none border-r border-b ${inDrag ? 'drag-selection' : ''}`}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(day, hour)}
                  style={{ borderColor: 'hsl(var(--schedule-grid-line))' }}
                />
              );
            })}
          </div>
        ))}

        {/* Event Layer - Rendered on top of grid */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: '33px' /* Header height approx */ }}>
          <div className="grid h-full" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
            {/* Spacer for time column */}
            <div />

            {/* Day columns for events */}
            {DAYS.map(day => {
              // If hovering a course NOT in the agenda, add it for preview
              const previewCourse = hoveredId && !selectedCourses.some(c => c.id === hoveredId)
                ? courses.find(c => c.id === hoveredId)
                : null;

              const coursesToRender = previewCourse ? [...selectedCourses, previewCourse] : selectedCourses;
              const dayEvents = computeEventLayout(coursesToRender, day);


              const totalMinutes = (hourRange[1] - hourRange[0]) * 60;

              return (
                <div key={day} className="relative h-full pointer-events-none">
                  {dayEvents.map(event => {
                    const startMinutesFromTop = event.start - (hourRange[0] * 60);
                    const durationMinutes = event.end - event.start;

                    const topPct = (startMinutesFromTop / totalMinutes) * 100;
                    const heightPct = (durationMinutes / totalMinutes) * 100;

                    // Skip if out of view
                    if (event.end <= hourRange[0] * 60 || event.start >= hourRange[1] * 60) return null;

                    const status = getCourseStatus(event.course);
                    const isPlanned = status === 'planned';
                    const isHoverPreview = event.course.id === hoveredId && !selectedCourses.some(c => c.id === event.course.id);
                    const isFull = event.course.occupancy.occupied >= event.course.occupancy.total;
                    const hasConflictReal = !isHoverPreview && selectedCourses.some(sc => sc.id !== event.course.id && slotsOverlap(sc, event.course));



                    return (
                      <Tooltip key={`${event.course.id}-${event.slot.day}-${event.slot.startHour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute pointer-events-auto rounded-md p-2 flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:shadow-md ${isHoverPreview
                              ? 'bg-muted border-2 border-dashed border-muted-foreground/30 text-muted-foreground shadow-none'
                              : status === 'confirmed'
                                ? 'schedule-block-confirmed'
                                : (isFull || hasConflictReal)
                                  ? 'schedule-block-conflict'
                                  : 'schedule-block-planned'
                              }`}



                            style={{
                              top: `calc(${topPct}% + 1px)`,
                              height: `calc(${heightPct}% - 2px)`,
                              width: `calc(${event.width}% - 4px)`,
                              left: `calc(${event.left}% + 2px)`,
                              zIndex: event.zIndex
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative z-10 flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-[11px] font-semibold leading-tight flex items-center gap-1">
                                    {event.course.code}
                                  </p>
                                  {!event.course.prerequisitesMet && (
                                    <Lock className="grid-icon" />
                                  )}
                                  {isHoverPreview && (
                                    <Clock className="grid-icon" />
                                  )}
                                  {isFull && (
                                    <Users2 className="grid-icon" />
                                  )}
                                  {hasConflictReal && (
                                    <Clock className="grid-icon" />
                                  )}


                                </div>
                                <p className="text-[10px] opacity-80 leading-tight truncate">{event.course.name}</p>
                              </div>
                            </div>


                            <div className="relative z-10 flex items-center justify-between">
                              <p className="text-[9px] opacity-70 truncate">{event.course.professor}</p>
                              {isPlanned && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRemovePlanned(event.course.id); }}
                                  className="w-4 h-4 rounded-full bg-background/30 flex items-center justify-center hover:bg-background/50 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg z-50">
                          <CourseTooltipContent
                            course={event.course}
                            status={status}
                            completedCodes={completedCodes}
                            hasConflict={!isHoverPreview && selectedCourses.some(sc => sc.id !== event.course.id && slotsOverlap(sc, event.course))}
                          />
                        </TooltipContent>


                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
