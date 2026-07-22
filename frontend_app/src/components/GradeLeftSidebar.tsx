import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Clock, Users2, Lock, Plus, Check, Sparkles } from 'lucide-react';
import { type Course, type CourseStatus } from '@/types/schedule';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { slotsOverlap } from '@/hooks/useSchedule';
import { CourseTooltipContent } from '@/components/CourseTooltip';
import { OccupancyBar } from '@/components/OccupancyBar';

interface GradeLeftSidebarProps {
  courses: Course[];
  selectedCourses: Course[];
  getCourseStatus: (course: Course) => CourseStatus;
  onToggle: (courseId: string) => void;
  onHover: (courseId: string | null) => void;
  hoveredId?: string | null;
  plannedIds: Set<string>;
  completedCodes: string[];
}

export function GradeLeftSidebar({
  courses,
  selectedCourses,
  getCourseStatus,
  onToggle,
  onHover,
  hoveredId,
  plannedIds,
  completedCodes
}: GradeLeftSidebarProps) {
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  const [isOptativasExpanded, setIsOptativasExpanded] = useState(false);

  // Separate core and elective courses
  const coreCourses = courses.filter(c => c.period !== 0);
  const electiveCourses = courses.filter(c => c.period === 0);

  // Group core courses by discipline name
  const groupedCore = coreCourses.reduce<Record<string, Course[]>>((acc, course) => {
    if (!acc[course.name]) {
      acc[course.name] = [];
    }
    acc[course.name].push(course);
    return acc;
  }, {});

  // Group elective courses by discipline name
  const groupedElective = electiveCourses.reduce<Record<string, Course[]>>((acc, course) => {
    if (!acc[course.name]) {
      acc[course.name] = [];
    }
    acc[course.name].push(course);
    return acc;
  }, {});

  const toggleDiscipline = (name: string) => {
    setExpandedDisciplines(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const coreDisciplineNames = Object.keys(groupedCore).sort((a, b) => {
    const weightA = groupedCore[a][0]?.blockingWeight || 0;
    const weightB = groupedCore[b][0]?.blockingWeight || 0;
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    return a.localeCompare(b);
  });

  const electiveDisciplineNames = Object.keys(groupedElective).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col h-full bg-white w-[339px] max-w-full overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-black text-primary uppercase tracking-wider">Disciplinas</h2>
        <p className="text-xs text-slate-500 mt-1">{coreDisciplineNames.length + electiveDisciplineNames.length} disponíveis</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
          {coreDisciplineNames.map(name => {
            const isExpanded = expandedDisciplines.has(name);
            const turmas = groupedCore[name];
            const hasSelected = turmas.some(t => plannedIds.has(t.id));

            return (
              <div key={name} className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-sm">
                <button
                  onClick={() => toggleDiscipline(name)}
                  className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                    hasSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p 
                      className={`text-xs font-bold leading-tight whitespace-nowrap overflow-hidden ${hasSelected ? 'text-indigo-700' : 'text-slate-700'}`}
                      style={{
                        maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 98%)',
                        WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 98%)'
                      }}
                    >
                      {name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-500">
                        {turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'}
                      </p>
                      {turmas[0]?.blockingWeight > 0 && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                          🔥 Tranca {turmas[0].blockingWeight} {turmas[0].blockingWeight === 1 ? 'Matéria' : 'Matérias'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-2 bg-white space-y-2 border-t border-slate-100">
                    {turmas.map(course => {
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
                              className={`w-full text-left rounded-md p-2 relative overflow-hidden transition-all group ${
                                isBlocked && !isSelected
                                  ? 'opacity-60 bg-slate-100 hover:bg-slate-200'
                                  : isSelected
                                    ? 'bg-indigo-100 border border-indigo-200 hover:bg-indigo-200'
                                    : (hasConflict || isFull)
                                      ? 'bg-red-50 border border-red-100 hover:bg-red-100'
                                      : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="relative z-10 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-slate-700 leading-tight truncate">{course.code}</span>
                                    {hasConflict && <Clock className="w-3 h-3 text-orange-500" />}
                                    {isFull && <Users2 className="w-3 h-3 text-red-500" />}
                                    {isBlocked && <Lock className="w-3 h-3 text-slate-400" />}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1 truncate" title={course.professor}>
                                    {course.professor || 'Prof. não informado'}
                                  </p>
                                  {course.slots && course.slots.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {course.slots.map((s, idx) => (
                                        <span key={idx} className="text-[8.5px] bg-white/60 shadow-sm border border-slate-200 text-slate-600 px-1 py-0.5 rounded font-mono font-medium">
                                          {s.day} {String(s.startHour).padStart(2, '0')}:{String(s.startMinute).padStart(2, '0')}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white'
                                }`}>
                                  {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                </div>
                              </div>
                              <div className="relative z-10 mt-2">
                                <OccupancyBar occupancy={course.occupancy} height={3} />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-white text-slate-900 border shadow-xl z-50">
                            <CourseTooltipContent 
                               course={course} 
                               status={status} 
                               completedCodes={completedCodes} 
                               hasConflict={hasConflict} 
                            />
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* OPTATIVAS BLOCK */}
          {electiveDisciplineNames.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm mt-4">
              <button
                onClick={() => setIsOptativasExpanded(!isOptativasExpanded)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors bg-gradient-to-r from-indigo-50/30 to-violet-50/10 hover:from-indigo-50/50 hover:to-violet-50/20`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <p className="text-xs font-black text-indigo-700 uppercase tracking-wider">
                      Optativas
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {electiveDisciplineNames.length} disciplinas disponíveis
                  </p>
                </div>
                <div className="shrink-0 text-indigo-500">
                  {isOptativasExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {isOptativasExpanded && (
                <div className="p-2 bg-slate-100/50 border-t border-slate-200 space-y-2 max-h-[350px] overflow-y-auto">
                  {electiveDisciplineNames.map(name => {
                    const isExpanded = expandedDisciplines.has(name);
                    const turmas = groupedElective[name];
                    const hasSelected = turmas.some(t => plannedIds.has(t.id));

                    return (
                      <div key={name} className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                        <button
                          onClick={() => toggleDiscipline(name)}
                          className={`w-full flex items-center justify-between p-2.5 text-left transition-colors ${
                            hasSelected ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p 
                              className={`text-[11px] font-bold leading-snug whitespace-nowrap overflow-hidden ${hasSelected ? 'text-indigo-700' : 'text-slate-700'}`}
                              style={{
                                maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 98%)',
                                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 98%)'
                              }}
                            >
                              {name}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'}
                            </p>
                          </div>
                          <div className="shrink-0 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-2 bg-slate-50/50 border-t border-slate-100 space-y-1.5">
                            {turmas.map(course => {
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
                                      className={`w-full text-left rounded-md p-2 relative overflow-hidden transition-all group ${
                                        isBlocked && !isSelected
                                          ? 'opacity-60 bg-slate-100 hover:bg-slate-200'
                                          : isSelected
                                            ? 'bg-indigo-100 border border-indigo-200 hover:bg-indigo-200'
                                            : (hasConflict || isFull)
                                              ? 'bg-red-50 border border-red-100 hover:bg-red-100'
                                              : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                      }`}
                                    >
                                      <div className="relative z-10 flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold text-slate-700 leading-tight truncate">{course.code}</span>
                                            {hasConflict && <Clock className="w-3 h-3 text-orange-500" />}
                                            {isFull && <Users2 className="w-3 h-3 text-red-500" />}
                                            {isBlocked && <Lock className="w-3 h-3 text-slate-400" />}
                                          </div>
                                          <p className="text-[9px] text-slate-500 mt-1 truncate" title={course.professor}>
                                            {course.professor || 'Prof. não informado'}
                                          </p>
                                          {course.slots && course.slots.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {course.slots.map((s, idx) => (
                                                <span key={idx} className="text-[8px] bg-white/60 shadow-sm border border-slate-200 text-slate-600 px-1 py-0.5 rounded font-mono font-medium">
                                                  {s.day} {String(s.startHour).padStart(2, '0')}:{String(s.startMinute).padStart(2, '0')}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white'
                                        }`}>
                                          {isSelected ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                                        </div>
                                      </div>
                                      <div className="relative z-10 mt-1.5">
                                        <OccupancyBar occupancy={course.occupancy} height={2} />
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="bg-white text-slate-900 border shadow-xl z-50">
                                    <CourseTooltipContent 
                                       course={course} 
                                       status={status} 
                                       completedCodes={completedCodes} 
                                       hasConflict={hasConflict} 
                                    />
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {coreDisciplineNames.length === 0 && electiveDisciplineNames.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">
              Nenhuma disciplina encontrada.
            </p>
          )}
      </div>
    </div>
  );
}
