import { type Course, type CourseStatus } from '@/types/schedule';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CourseTooltipContent } from './CourseTooltip';
import { OccupancyBar } from './OccupancyBar';
import { Plus, Check, AlertTriangle, Lock, Unlock, Clock, Users2 } from 'lucide-react';
import { slotsOverlap } from '@/hooks/useSchedule';


import { ScrollArea } from '@/components/ui/scroll-area';

interface CourseSidebarProps {
  courses: Course[];
  selectedCourses: Course[];
  getCourseStatus: (course: Course) => CourseStatus;
  onToggle: (courseId: string) => void;
  onHover: (courseId: string | null) => void;
  plannedIds: Set<string>;
  completedCodes: string[];
}


export function CourseSidebar({ courses, selectedCourses, getCourseStatus, onToggle, onHover, plannedIds, completedCodes }: CourseSidebarProps) {



  const grouped = courses.reduce<Record<number, Course[]>>((acc, c) => {
    (acc[c.period] = acc[c.period] || []).push(c);
    return acc;
  }, {});

  const sortedPeriods = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">Disciplinas Disponíveis</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{courses.length} disciplinas encontradas</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {sortedPeriods.map(period => (
            <div key={period} className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {period}º Período
              </p>
              {grouped[period].map(course => {
                const status = getCourseStatus(course);
                const isSelected = plannedIds.has(course.id);
                const isBlocked = !course.prerequisitesMet;
                const isFull = course.occupancy.occupied >= course.occupancy.total;
                const hasConflict = selectedCourses.some(sc => sc.id !== course.id && slotsOverlap(sc, course));

                return (
                  <Tooltip key={course.id}>
                    <TooltipTrigger asChild>
                      <button
                        onMouseEnter={() => onHover(course.id)}
                        onMouseLeave={() => onHover(null)}
                        onClick={() => onToggle(course.id)}
                        className={`w-full text-left rounded-lg p-2.5 relative overflow-hidden transition-all animate-fade-in group ${isBlocked && !isSelected
                          ? 'opacity-60 bg-muted hover:bg-muted/80'
                          : isSelected
                            ? 'bg-schedule-planned/10 border border-schedule-planned/30 hover:bg-schedule-planned/15'
                            : (hasConflict || isFull)
                              ? 'bg-destructive/5 border border-destructive/20 hover:bg-destructive/10'
                              : 'bg-card border hover:border-primary/30 hover:shadow-sm'
                          } ${isBlocked && isSelected ? 'ring-1 ring-inset ring-destructive/30' : ''}`}

                      >


                        <div className="relative z-10 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium leading-tight mt-0.5 truncate">{course.code}</span>
                              {hasConflict && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Conflito de horário</TooltipContent>
                                </Tooltip>
                              )}
                              {isFull && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Users2 className="w-3.5 h-3.5 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Turma lotada</TooltipContent>
                                </Tooltip>
                              )}
                              {isBlocked && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Pré-requisitos não cumpridos</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <p className="text-[11px] font-mono font-medium text-muted-foreground">{course.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{course.professor}</p>

                            {course.blockingWeight > 0 && (
                              <div 
                                title={`Destrava o caminho de ${course.blockingWeight} matérias pendentes e obrigatórias!\nMatérias na árvore:\n${course.blockedCourses.join('\n')}`}
                                className="absolute right-1 top-7 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 transition-colors border border-orange-500/30 z-20 shadow-sm animate-in slide-in-from-right-1 cursor-help"
                              >
                                <span className="text-[9px] font-black uppercase tracking-wider">🔥 Tranca {course.blockingWeight} {course.blockingWeight === 1 ? 'Matéria' : 'Matérias'}</span>
                              </div>
                            )}

                          </div>


                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected
                            ? 'bg-schedule-planned text-schedule-planned-fg'
                            : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                            }`}>
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </div>
                        </div>


                        <div className="relative z-10 mt-1.5">
                          <OccupancyBar occupancy={course.occupancy} height={4} />
                        </div>

                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-popover text-popover-foreground border shadow-lg z-50">
                      <CourseTooltipContent course={course} status={status} completedCodes={completedCodes} hasConflict={hasConflict} />

                    </TooltipContent>

                  </Tooltip>
                );

              })}
            </div>
          ))}

          {courses.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhuma disciplina encontrada com os filtros selecionados.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
