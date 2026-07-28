import { useCallback, useRef, useState } from 'react';
import { type Course, type CourseStatus, DAYS, DAY_LABELS, HOURS, type DayOfWeek, type DragSelection } from '@/types/schedule';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CourseTooltipContent } from './CourseTooltip';
import { X, AlertTriangle, Lock, Clock, Users2, ChevronLeft, ChevronRight, Calendar, LayoutGrid } from 'lucide-react';
import { slotsOverlap } from '@/hooks/useSchedule';
import { computeEventLayout } from '@/utils/layout';

const PLANNED_COLORS = [
  'bg-amber-500 text-white font-bold border border-amber-600 shadow-sm',
  'bg-emerald-600 text-white font-bold border border-emerald-700 shadow-sm',
  'bg-indigo-600 text-white font-bold border border-indigo-700 shadow-sm',
  'bg-rose-600 text-white font-bold border border-rose-700 shadow-sm',
  'bg-cyan-600 text-white font-bold border border-cyan-700 shadow-sm',
  'bg-fuchsia-600 text-white font-bold border border-fuchsia-700 shadow-sm',
  'bg-orange-600 text-white font-bold border border-orange-700 shadow-sm',
  'bg-teal-600 text-white font-bold border border-teal-700 shadow-sm'
];

const FULL_DAY_NAMES: Record<DayOfWeek, string> = {
  SEG: 'Segunda-Feira',
  TER: 'Terça-Feira',
  QUA: 'Quarta-Feira',
  QUI: 'Quinta-Feira',
  SEX: 'Sexta-Feira',
  SAB: 'Sábado',
};

const getPlannedColor = (code: string) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLANNED_COLORS[Math.abs(hash) % PLANNED_COLORS.length];
};

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
  guestPlannedIds?: Set<string>;
  showGuestSchedule?: boolean;
  onGuestCourseClick?: (id: string) => void;
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
  guestPlannedIds,
  showGuestSchedule = true,
  onGuestCourseClick,
}: ScheduleGridProps) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ day: DayOfWeek; hour: number } | null>(null);
  const [tempDrag, setTempDrag] = useState<DragSelection | null>(null);

  // Mobile Day Selector state
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [mobileViewMode, setMobileViewMode] = useState<'single' | 'full'>('single');

  const visibleHours = HOURS.filter(h => h >= hourRange[0] && h < hourRange[1]);

  const getBlocksForCell = useCallback((day: DayOfWeek, hour: number) => {
    return selectedCourses.filter(c =>
      c.slots.some(s => s.day === day && s.startHour <= hour && s.endHour > hour)
    );
  }, [selectedCourses]);

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

  const renderGridContent = (dayList: DayOfWeek[], isSingleDayMode: boolean) => {
    const colCount = dayList.length;
    const gridColsStyle = isSingleDayMode ? '64px 1fr' : `64px repeat(${colCount}, 1fr)`;
    const containerWidthClass = isSingleDayMode ? 'w-full min-w-0' : 'min-w-[700px]';

    return (
      <div className={`${containerWidthClass} relative`}>
        {/* Header */}
        <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: gridColsStyle }}>
          <div className="bg-schedule-header text-schedule-header-fg text-xs font-medium p-2 text-center rounded-tl-lg">
            Hora
          </div>
          {dayList.map((day, i) => (
            <div key={day} className={`bg-schedule-header text-schedule-header-fg text-xs font-medium p-2 text-center ${i === colCount - 1 ? 'rounded-tr-lg' : ''}`}>
              {isSingleDayMode ? FULL_DAY_NAMES[day] : DAY_LABELS[day]}
            </div>
          ))}
        </div>

        {/* Body */}
        {visibleHours.map(hour => (
          <div key={hour} className="grid" style={{ gridTemplateColumns: gridColsStyle }}>
            {/* Time label */}
            <div className="bg-schedule-time-col text-xs text-muted-foreground p-2 text-center border-b border-r font-mono" style={{ borderColor: 'hsl(var(--schedule-grid-line))' }}>
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* Day cells */}
            {dayList.map(day => {
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
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: '33px' }}>
          <div className="grid h-full" style={{ gridTemplateColumns: gridColsStyle }}>
            {/* Spacer for time column */}
            <div />

            {/* Day columns for events */}
            {dayList.map(day => {
              const previewCourse = hoveredId && !selectedCourses.some(c => c.id === hoveredId)
                ? courses.find(c => c.id === hoveredId)
                : null;
              
              const isGuestVisible = showGuestSchedule ?? true;
              const guestCourses = (guestPlannedIds && isGuestVisible)
                ? courses.filter(c => {
                    if (selectedCourses.some(sc => sc.id === c.id)) return false;
                    const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const codeNorm = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return Array.from(guestPlannedIds).some(gId => {
                      const gNorm = gId.toLowerCase().replace(/[^a-z0-9]/g, '');
                      return gId === c.id || gNorm === codeNorm || gNorm === cNorm;
                    });
                  })
                : [];

              let coursesToRender = [...selectedCourses, ...guestCourses];
              if (previewCourse && !coursesToRender.some(c => c.id === previewCourse.id)) {
                 coursesToRender.push(previewCourse);
              }
              const dayEvents = computeEventLayout(coursesToRender, day);
              const totalMinutes = (hourRange[1] - hourRange[0]) * 60;

              return (
                <div key={day} className="relative h-full pointer-events-none">
                  {dayEvents.map(event => {
                    const startMinutesFromTop = event.start - (hourRange[0] * 60);
                    const durationMinutes = event.end - event.start;

                    const topPct = (startMinutesFromTop / totalMinutes) * 100;
                    const heightPct = (durationMinutes / totalMinutes) * 100;

                    if (event.end <= hourRange[0] * 60 || event.start >= hourRange[1] * 60) return null;

                    const status = getCourseStatus(event.course);
                    const isPlanned = status === 'planned';
                    const isHoverPreview = event.course.id === hoveredId && !selectedCourses.some(c => c.id === event.course.id);
                    const isGuestPreview = isGuestVisible && guestCourses.some(gc => gc.id === event.course.id);
                    const isFull = event.course.occupancy.occupied >= event.course.occupancy.total;
                    const hasConflictReal = !isHoverPreview && !isGuestPreview && selectedCourses.some(sc => sc.id !== event.course.id && slotsOverlap(sc, event.course));

                    return (
                      <Tooltip key={`${event.course.id}-${event.slot.day}-${event.slot.startHour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute pointer-events-auto rounded-md p-2 flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:shadow-md ${isHoverPreview
                              ? 'bg-white border-2 border-dashed border-slate-400 text-slate-700 shadow-xl opacity-95 z-[60]'
                              : isGuestPreview
                                ? 'bg-indigo-50 border-2 border-dashed border-indigo-400 text-indigo-700 opacity-90 hover:opacity-100 z-[50] shadow-[0_0_15px_rgba(99,102,241,0.3)] backdrop-blur-sm'
                              : status === 'confirmed'
                                ? 'schedule-block-confirmed'
                                : (isFull || hasConflictReal)
                                  ? 'schedule-block-conflict'
                                  : getPlannedColor(event.course.code)
                              }`}
                            style={{
                              top: `calc(${topPct}% + 1px)`,
                              height: `calc(${heightPct}% - 2px)`,
                              width: `calc(${event.width}% - 4px)`,
                              left: `calc(${event.left}% + 2px)`,
                              zIndex: event.zIndex
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isGuestPreview && onGuestCourseClick) {
                                 onGuestCourseClick(event.course.id);
                              }
                            }}
                          >
                            <div className="relative z-10 flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-[11px] font-extrabold leading-tight flex items-center gap-1 truncate">
                                    {event.course.name}
                                  </p>
                                  {!event.course.prerequisitesMet && !isGuestPreview && (
                                    <Lock className="grid-icon" />
                                  )}
                                  {isHoverPreview && (
                                    <Clock className="grid-icon" />
                                  )}
                                  {isGuestPreview && (
                                    <Users2 className="grid-icon text-indigo-500 animate-pulse" />
                                  )}
                                  {isFull && (
                                    <Users2 className="grid-icon" />
                                  )}
                                  {hasConflictReal && (
                                    <Clock className="grid-icon" />
                                  )}
                                </div>
                                <p className="text-[10px] opacity-80 leading-tight truncate font-medium mt-0.5">{event.course.code}</p>
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
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* MOBILE DAY SELECTOR TOP BAR - ONLY ON MOBILE (HIDDEN ON PRINT) */}
      <div className="block md:hidden print:hidden bg-white border-b border-slate-200 p-2.5 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          {mobileViewMode === 'single' ? (
            <div className="flex items-center justify-between flex-1 bg-slate-100/80 rounded-xl p-1">
              <button
                onClick={() => setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : DAYS.length - 1))}
                className="p-1.5 bg-white text-slate-600 hover:text-indigo-600 rounded-lg shadow-2xs transition-all active:scale-95"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  {FULL_DAY_NAMES[DAYS[selectedDayIndex]]}
                </span>
              </div>

              <button
                onClick={() => setSelectedDayIndex((prev) => (prev < DAYS.length - 1 ? prev + 1 : 0))}
                className="p-1.5 bg-white text-slate-600 hover:text-indigo-600 rounded-lg shadow-2xs transition-all active:scale-95"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 text-center py-1">
              <span className="text-xs font-bold text-slate-600">Panorama Geral (6 Dias)</span>
            </div>
          )}

          <button
            onClick={() => setMobileViewMode(mobileViewMode === 'single' ? 'full' : 'single')}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
            title={mobileViewMode === 'single' ? "Ver Panorama Geral" : "Ver por Dia"}
          >
            {mobileViewMode === 'single' ? <LayoutGrid className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
            {mobileViewMode === 'single' ? 'Panorama' : 'Por Dia'}
          </button>
        </div>
      </div>

      {/* PRINT ONLY GRID (ALWAYS RENDERS ALL 6 DAYS IN FULL PDF PRINT) */}
      <div className="hidden print:block w-full h-full">
        {renderGridContent(DAYS, false)}
      </div>

      {/* SCREEN GRID (HIDDEN ON PRINT) */}
      <div className="print:hidden flex-1 overflow-auto" onMouseUp={handleMouseUp} onMouseLeave={() => { setDragging(false); setTempDrag(null); }}>
        {/* DESKTOP GRID (ONLY ON DESKTOP md:block) */}
        <div className="hidden md:block">
          {renderGridContent(DAYS, false)}
        </div>

        {/* MOBILE GRID (ONLY ON MOBILE block md:hidden) */}
        <div className="block md:hidden">
          {mobileViewMode === 'single' 
            ? renderGridContent([DAYS[selectedDayIndex]], true)
            : renderGridContent(DAYS, false)
          }
        </div>
      </div>
    </div>
  );
}
