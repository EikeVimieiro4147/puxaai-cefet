import React, { useState, useEffect, useMemo } from 'react';
import { Auth } from './Auth';
import { CURRICULA, COURSES_LIST, SCHEDULE_RAW_DATA } from './constants';
import { Course, CourseStatus, ClassGroup, ClassSession } from './types';
import { GeminiAssistant } from './GeminiAssistant';
import { 
  CheckCircle, 
  Lock, 
  Unlock, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Search,
  Calendar,
  List,
  X,
  Clock,
  User,
  GraduationCap,
  ZoomIn,
  ZoomOut,
  Home,
  UserCircle,
  LayoutDashboard
} from 'lucide-react';
import { ImportHistoryPDF } from './ImportHistoryPDF';

export default function App() {
  // --- State ---
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'home' | 'tracker' | 'scheduler' | 'profile'>('home');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNextOnly, setShowNextOnly] = useState(false);
  const [userMajor, setUserMajor] = useState<string | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  
  // Scheduler State
  // Stores CourseName -> UniqueCode (e.g. 'FENÔMENOS DE TRANSPORTE' -> 'GAMB 157007')
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [schedulerSearchQuery, setSchedulerSearchQuery] = useState('');
  const [showAllPendingInScheduler, setShowAllPendingInScheduler] = useState(false);
  const [expandedSchedulerCourses, setExpandedSchedulerCourses] = useState<Record<string, boolean>>({});

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('electroflow_progress');
    const savedSchedule = localStorage.getItem('electroflow_schedule');
    const savedMajor = localStorage.getItem('electroflow_major');
    
    if (savedMajor) {
      setUserMajor(savedMajor);
      
    }

    if (saved) {
      try {
        setCompletedIds(JSON.parse(saved) as string[]);
      } catch (e) {
        console.error("Failed to parse saved progress", e);
      }
    } else {
      setExpandedSemester(1);
    }

    if (savedSchedule) {
      try {
        setSelectedClasses(JSON.parse(savedSchedule) as Record<string, string>);
      } catch (e) {
        console.error("Failed to parse saved schedule", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('electroflow_progress', JSON.stringify(completedIds));
  }, [completedIds]);
  useEffect(() => {
    localStorage.setItem('electroflow_schedule', JSON.stringify(selectedClasses));
  }, [selectedClasses]);

  useEffect(() => {
    if (userMajor) {
      localStorage.setItem('electroflow_major', userMajor);
    } else {
      localStorage.removeItem('electroflow_major');
    }
  }, [userMajor]);

  // --- Logic ---
  const currentCurriculum = useMemo(() => {
    if (!userMajor || !CURRICULA[userMajor]) return [];
    return CURRICULA[userMajor];
  }, [userMajor]);

  const isCompleted = (id: string) => completedIds.includes(id);

  const getCourseStatus = (course: Course): CourseStatus => {
    if (isCompleted(course.id)) return CourseStatus.COMPLETED;
    const allPrereqsMet = course.prereqs.every(id => {
      const normalized = id.toLowerCase();
      if (normalized.includes('credito') || normalized.includes('crédito')) {
        const match = id.match(/\d+/);
        if (match) {
          const requiredCredits = parseInt(match[0], 10);
          const completedCredits = completedIds.length * 4; // Standard 4 credits per completed course
          return completedCredits >= requiredCredits;
        }
        return true;
      }
      return isCompleted(id);
    });
    return allPrereqsMet ? CourseStatus.AVAILABLE : CourseStatus.LOCKED;
  };

  const toggleCourse = (id: string) => {
    setCompletedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // --- Derived State (Tracker) ---
  const enrichedCurriculum = useMemo(() => {
    // Build dependents graph to calculate blocking weights
    const dependentsGraph: Record<string, string[]> = {};
    currentCurriculum.forEach(c => {
      dependentsGraph[c.id] = [];
    });
    currentCurriculum.forEach(c => {
      c.prereqs.forEach(prereq => {
        if (dependentsGraph[prereq]) {
          dependentsGraph[prereq].push(c.id);
        }
      });
    });

    const getBlockedCourses = (courseId: string) => {
      const visited = new Set<string>();
      const queue = [...(dependentsGraph[courseId] || [])];
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

    const blockedMap: Record<string, string[]> = {};
    currentCurriculum.forEach(c => {
      blockedMap[c.id] = getBlockedCourses(c.id);
    });

    return currentCurriculum.map(course => ({
      ...course,
      status: getCourseStatus(course),
      blockingWeight: blockedMap[course.id]?.length || 0,
      blockedCourses: blockedMap[course.id] || []
    }));
  }, [completedIds, currentCurriculum]);

  const totalCourses = currentCurriculum.length;
  const completedCount = completedIds.length;
  const progressPercentage = totalCourses === 0 ? 0 : Math.round((completedCount / totalCourses) * 100);
  const semesters = Array.from(new Set(currentCurriculum.map(c => c.semester))).sort((a, b) => Number(a) - Number(b));
  const coursesBySemester = useMemo(() => {
    const grouped: Record<number, typeof enrichedCurriculum> = {};
    semesters.forEach(sem => {
      grouped[Number(sem)] = enrichedCurriculum.filter(c => c.semester === Number(sem));
    });
    return grouped;
  }, [enrichedCurriculum, semesters]);

  const displayCourses = enrichedCurriculum.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = showNextOnly ? c.status === CourseStatus.AVAILABLE : true;
    return matchesSearch && matchesFilter;
  });

  const getFilteredBySemester = (sem: number) => displayCourses.filter(c => Number(c.semester) === Number(sem));

  // --- Derived State (Scheduler) ---
  const scheduleData = useMemo(() => {
    const groupedByName: Record<string, ClassGroup[]> = {};

    SCHEDULE_RAW_DATA.forEach((entry) => {
      const name = entry.name;
      if (!groupedByName[name]) groupedByName[name] = [];

      // Changed logic: Group by entry.code (the specific subject code) instead of just classCode
      // This differentiates "GAMB 157007" (Turma 5) from "GEL 242264" (Turma 5)
      let group = groupedByName[name].find(g => g.code === entry.code);
      
      if (!group) {
        // Map for origin codes to show department clearly
        const originMap: Record<string, string> = {
          'GEL': 'ELÉTRICA', 
          'GELE': 'ELÉTRICA', 
          'BCC': 'COMPUTAÇÃO', 
          'GCIV': 'CIVIL', 
          'GADM': 'ADM', 
          'GAUT': 'AUTOMAÇÃO', 
          'GAMB': 'AMBIENTAL', 
          'GTEL': 'TELECOM', 
          'GFIS': 'FÍSICA', 
          'GMEC': 'MECÂNICA', 
          'GPROD': 'PRODUÇÃO', 
          'GEXT': 'GERAL'
        };
        const prefix = entry.code.split(' ')[0];
        const origin = originMap[prefix] || prefix;

        group = {
          courseName: name,
          classCode: entry.classCode,
          code: entry.code,
          courseOrigin: origin,
          teacher: entry.teacher,
          sessions: []
        };
        groupedByName[name].push(group);
      }

      group.sessions.push({
        day: entry.day,
        startTime: entry.start,
        endTime: entry.end,
        room: entry.room,
        type: 'Teórica'
      });
    });

    return groupedByName;
  }, []);

  // Filter: ONLY available/unlocked (or all pending if toggled) AND NOT completed, filtered by schedulerSearchQuery
  const schedulableCourses = useMemo(() => {
    return enrichedCurriculum
      .filter(c => {
        // Must not be completed
        if (c.status === CourseStatus.COMPLETED) return false;
        
        // If not showing all pending, must be available
        if (!showAllPendingInScheduler && c.status !== CourseStatus.AVAILABLE) return false;
        
        // Filter by scheduler search query
        if (schedulerSearchQuery.trim() !== '') {
          return c.name.toLowerCase().includes(schedulerSearchQuery.toLowerCase());
        }
        
        return true;
      })
      .sort((a, b) => b.blockingWeight - a.blockingWeight || a.semester - b.semester || a.name.localeCompare(b.name));
  }, [enrichedCurriculum, showAllPendingInScheduler, schedulerSearchQuery]);

  const currentScheduleSessions = useMemo(() => {
    const sessions: { 
      id: string, 
      name: string, 
      classCode: string, 
      teacher?: string,
      session: ClassSession,
      color: string 
    }[] = [];

    (Object.entries(selectedClasses) as [string, string][]).forEach(([courseName, uniqueCode]) => {
      const groups = scheduleData[courseName];
      if (groups) {
        // Find group by uniqueCode instead of classCode
        const group = groups.find(g => g.code === uniqueCode);
        if (group) {
          const hash = courseName.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
          const hue = hash % 360;
          const color = `hsla(${hue}, 70%, 60%, 0.25)`;
          
          group.sessions.forEach((session, idx) => {
             sessions.push({
               id: `${courseName}-${uniqueCode}-${session.day}-${session.startTime}-${idx}`,
               name: courseName,
               classCode: group.classCode,
               teacher: group.teacher,
               session: session,
               color: color
             });
          });
        }
      }
    });
    return sessions;
  }, [selectedClasses, scheduleData]);

  const hasConflict = (s1: ClassSession, s2: ClassSession) => {
    if (s1.day !== s2.day) return false;
    return (s1.startTime < s2.endTime) && (s1.endTime > s2.startTime);
  };

  const minSemestersToGraduate = useMemo(() => {
    const uncompletedCourses = currentCurriculum.filter(c => !isCompleted(c.id));
    if (uncompletedCourses.length === 0) return 0;
    
    const semCounts = new Map<number, number>();
    currentCurriculum.forEach(c => {
      semCounts.set(c.semester, (semCounts.get(c.semester) || 0) + 1);
    });
    let maxPerSemester = 8;
    for (const count of semCounts.values()) {
      if (count > maxPerSemester) maxPerSemester = count;
    }

    const simulatedCompleted = new Set(completedIds);
    let semesters = 0;
    let remaining = [...uncompletedCourses];
    let prevRemaining = -1;
    
    while (remaining.length > 0 && remaining.length !== prevRemaining) {
      prevRemaining = remaining.length;
      
      const available = remaining.filter(c => {
        return c.prereqs.every(id => {
          const normalized = id.toLowerCase();
          if (normalized.includes('credito') || normalized.includes('crédito')) {
            const match = id.match(/\d+/);
            if (match) {
              const req = parseInt(match[0], 10);
              return (simulatedCompleted.size * 4) >= req;
            }
            return true;
          }
          return simulatedCompleted.has(id);
        });
      });
      
      if (available.length === 0) {
        semesters += Math.ceil(remaining.length / maxPerSemester);
        break;
      }
      
      available.sort((a, b) => a.semester - b.semester);
      
      const taking = available.slice(0, maxPerSemester);
      taking.forEach(c => simulatedCompleted.add(c.id));
      remaining = remaining.filter(c => !taking.some(t => t.id === c.id));
      
      semesters++;
    }
    
    return semesters;
  }, [currentCurriculum, completedIds]);

  const maxPossibleCourses = useMemo(() => {
    const availableCourses = schedulableCourses.filter(c => scheduleData[c.name] && scheduleData[c.name].length > 0);
    
    const checkConflicts = (group: import('./types').ClassGroup, selectedGroups: import('./types').ClassGroup[]) => {
      for (const selected of selectedGroups) {
        for (const s1 of group.sessions) {
          for (const s2 of selected.sessions) {
            if (hasConflict(s1, s2)) return true;
          }
        }
      }
      return false;
    };

    let maxCount = 0;
    
    // Use a greedy approach with a few iterations to find a good maximum without freezing the UI
    // Sort by blocking weight (already sorted), try greedy
    const greedySelection: import('./types').ClassGroup[] = [];
    for (const course of availableCourses) {
      const groups = scheduleData[course.name];
      for (const group of groups) {
        if (!checkConflicts(group, greedySelection)) {
          greedySelection.push(group);
          break;
        }
      }
    }
    
    return greedySelection.length;
  }, [schedulableCourses, scheduleData]);

  const conflicts = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < currentScheduleSessions.length; i++) {
      for (let j = i + 1; j < currentScheduleSessions.length; j++) {
        const a = currentScheduleSessions[i];
        const b = currentScheduleSessions[j];
        if (hasConflict(a.session, b.session)) {
           list.push(`${a.name} x ${b.name}`);
        }
      }
    }
    return [...new Set(list)];
  }, [currentScheduleSessions]);

  const toggleClassSelection = (courseName: string, uniqueCode: string) => {
    setSelectedClasses(prev => {
      const current = prev[courseName];
      if (current === uniqueCode) {
        const copy = { ...prev };
        delete copy[courseName];
        return copy;
      } else {
        return { ...prev, [courseName]: uniqueCode };
      }
    });
  };

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedSchedulerCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const isCourseExpanded = (courseId: string, courseName: string) => {
    const isSelected = !!selectedClasses[courseName];
    if (expandedSchedulerCourses[courseId] !== undefined) {
      return expandedSchedulerCourses[courseId];
    }
    return isSelected;
  };

  /**
   * Helper to determine course card background/border colors based on its status.
   */
  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.COMPLETED:
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm';
      case CourseStatus.AVAILABLE:
        return 'bg-primary/5 border-primary/40 text-primary shadow-sm hover:border-primary hover:shadow-md transition-all';
      case CourseStatus.LOCKED:
      default:
        return 'bg-slate-50 border-slate-200 text-slate-400 grayscale opacity-70 cursor-not-allowed';
    }
  };

  /**
   * Helper to return the appropriate icon for a course based on its status.
   */
  const getIcon = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case CourseStatus.AVAILABLE:
        return <Unlock className="w-5 h-5 text-primary" />;
      case CourseStatus.LOCKED:
        return <Lock className="w-5 h-5 text-slate-700" />;
    }
  };

  const renderHome = () => {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-6 animate-in fade-in duration-500">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">Visão Geral</h2>
            <p className="text-sm text-slate-500">Acompanhe seu progresso e os principais indicadores da sua graduação.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Progresso do Curso</h3>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-black text-primary font-display leading-none">{progressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-primary " style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tempo Restante</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-emerald-600 font-display leading-none">{minSemestersToGraduate}</span>
                <span className="text-sm font-bold text-slate-500 mb-1">semestres mín.</span>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Matérias Concluídas</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-slate-900 font-display leading-none">{completedIds.length}</span>
                <span className="text-sm font-bold text-slate-500 mb-1">/ {currentCurriculum.length}</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Próximo Semestre</h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-primary font-display leading-none">{maxPossibleCourses}</span>
                <span className="text-sm font-bold text-slate-500 mb-1">matérias max.</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Baseado nos horários disponíveis sem conflitos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-6 animate-in fade-in duration-500">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">Meu Perfil</h2>
            <p className="text-sm text-slate-500">Visualize e edite suas informações pessoais.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                <p className="text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matrícula</label>
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm text-slate-900 font-mono">
                  {user.matricula}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idade</label>
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm text-slate-900">
                  {user.age || 'Não informada'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Curso Vinculado</label>
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm text-primary font-bold">
                  {COURSES_LIST.find(c => c.code === userMajor)?.name || userMajor}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200">
              <ImportHistoryPDF 
                onImportComplete={(idsToMark) => {
                  setCompletedIds(prev => Array.from(new Set([...prev, ...idsToMark])));
                }}
                userMajor={userMajor || ""}
              />
            </div>
            <div className="pt-6 mt-6 border-t border-slate-200 space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Importar Histórico (Texto)</h4>
                <p className="text-xs text-slate-500">Cole aqui o texto do seu histórico do portal (ex: "Matérias Vencidas") para marcar todas de uma vez.</p>
              </div>
              <textarea 
                id="import-text"
                className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-sm text-slate-900 h-24 focus:border-primary outline-none custom-scrollbar resize-none"
                placeholder="Cole seu histórico aqui..."
              />
              <button 
                onClick={() => {
                  const el = document.getElementById('import-text') as HTMLTextAreaElement;
                  const text = el.value;
                  if (!text.trim()) return;

                  const normText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const curriculum = CURRICULA[userMajor || ''] || [];
                  const newCompleted = new Set(completedIds);
                  let addedCount = 0;

                  curriculum.forEach(course => {
                    const normC = course.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const escaped = normC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                    if (regex.test(normText)) {
                      if (!newCompleted.has(course.id)) {
                        newCompleted.add(course.id);
                        addedCount++;
                      }
                    }
                  });

                  setCompletedIds(Array.from(newCompleted));
                  el.value = '';
                  alert(`Foram identificadas e marcadas ${addedCount} matérias no seu histórico!`);
                }}
                className="w-full py-3 bg-primary text-white border border-primary/20 hover:bg-primary/90 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Analisar e Marcar Matérias
              </button>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button onClick={() => alert('Funcionalidade de edição em desenvolvimento.')} className="w-full py-3 bg-slate-100 hover:bg-slate-700 text-slate-900 border border-slate-200 rounded-xl text-sm font-bold transition-colors">
                Editar Informações
              </button>
              <button onClick={() => {
                setUser(null);
                setCompletedIds([]);
                setSelectedClasses({});
              }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-colors">
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTracker = () => (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in duration-500">
      <main className="px-4 mx-auto max-w-7xl space-y-6 pb-32 pt-6">
        {semesters.map((semester: any) => {
          const semesterCourses = getFilteredBySemester(Number(semester));
          if (semesterCourses.length === 0 && (searchQuery || showNextOnly)) return null;

          const isExpanded = expandedSemester === semester || searchQuery !== '' || showNextOnly;
          const semTotal = coursesBySemester[semester].length;
          const semCompleted = coursesBySemester[semester].filter(c => c.status === CourseStatus.COMPLETED).length;
          const isFullyComplete = semTotal > 0 && semTotal === semCompleted;

          return (
            <div key={semester} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isFullyComplete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white/50'}`}>
              <button 
                onClick={() => setExpandedSemester(expandedSemester === semester ? null : semester)}
                className="flex items-center justify-between w-full px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 text-sm font-bold rounded-lg font-display
                    ${isFullyComplete ? 'bg-emerald-500 text-black' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {semester === 0 ? 'OP' : `${semester}º`}
                  </div>
                  <div className="text-left">
                    <h2 className={`font-display font-bold text-lg ${isFullyComplete ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {semester === 0 ? 'ELETIVAS' : `SEMESTRE ${semester}`}
                    </h2>
                    <div className="h-1 mt-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(semCompleted/semTotal)*100}%`}}></div>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
              </button>

              {isExpanded && (
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                  {semesterCourses.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => {
                        if (course.status !== CourseStatus.LOCKED || isCompleted(course.id)) {
                          toggleCourse(course.id);
                        }
                      }}
                      className={`
                        relative group p-4 rounded-lg border backdrop-blur-sm transition-all duration-200 cursor-pointer
                        hover:scale-[1.01] active:scale-[0.99]
                        ${getStatusColor(course.status)}
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold leading-tight font-display break-words hyphens-auto">{course.name}</h3>
                          {course.prereqs.length > 0 ? (
                            <div className="mt-3 text-xs">
                              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Pré-requisitos:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {course.prereqs.map(pid => {
                                  const isPreDone = isCompleted(pid);
                                  const pName = currentCurriculum.find(c => c.id === pid)?.name.split(' ').slice(0, 2).join(' ') || pid;
                                  return (
                                    <span key={pid} className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                      isPreDone 
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' 
                                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                                    }`}>
                                      {pName}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-[10px] text-slate-600 uppercase tracking-widest">Sem pré-requisitos</p>
                          )}
                          {course.blockingWeight > 0 && course.status !== CourseStatus.COMPLETED && (
                            <div className="mt-3">
                              <span 
                                title={`Disciplinas trancadas por ${course.name}:\n${course.blockedCourses.join('\n')}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-orange-500/30 bg-orange-500/10 text-orange-600 cursor-help"
                              >
                                🔥 Tranca {course.blockingWeight} {course.blockingWeight === 1 ? 'Matéria' : 'Matérias'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5">
                          {getIcon(course.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );

  const renderScheduler = () => {
    const getPosition = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const startHour = 7;
      const totalMinutes = (23 - startHour) * 60;
      const minutesFromStart = (h - startHour) * 60 + m;
      return (minutesFromStart / totalMinutes) * 100;
    };

    const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];

    return (
      <div className="flex flex-col h-full overflow-hidden lg:flex-row">
        {/* Sidebar: Available Courses Selector */}
        <div className="w-full h-1/2 lg:h-full p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r lg:w-96 bg-[#F8FAFC] border-slate-200">
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-bold font-display text-primary uppercase tracking-tight">Grade Horária</h2>
            <p className="text-xs text-slate-500">Monte seu próximo semestre escolhendo as turmas disponíveis sem conflitos de horário.</p>
          </div>
          
          <div className="flex flex-col gap-3 mb-4">
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Matérias Selecionadas</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-primary font-display leading-none">{Object.keys(selectedClasses).length}</span>
                <span className="text-xs font-bold text-slate-500 mb-0.5">/ {maxPossibleCourses} (máx. sem conflitos)</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Tempo Mínimo Restante</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-emerald-600 font-display leading-none">{minSemestersToGraduate}</span>
                <span className="text-xs font-bold text-slate-500 mb-0.5">semestres</span>
              </div>
            </div>
          </div>

          {/* Search bar inside the scheduler sidebar */}
          <div className="relative mb-3">
            <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar matéria..." 
              value={schedulerSearchQuery}
              onChange={(e) => setSchedulerSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 text-xs transition-all border rounded-xl outline-none bg-white border-slate-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Toggle for pending vs unlocked requirements */}
          <div className="flex items-center justify-between mb-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Matérias Oferecidas</span>
            <button
              onClick={() => setShowAllPendingInScheduler(!showAllPendingInScheduler)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                showAllPendingInScheduler 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20' 
                  : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              }`}
            >
              {showAllPendingInScheduler ? 'Mostrar Todas' : 'Apenas Liberadas'}
            </button>
          </div>
          
          <div className="space-y-3 pb-20">
            {schedulableCourses.map(course => {
              const groups = scheduleData[course.name];
              if (!groups) return null;

              // Check if any group of this course is selected
              const selectedCode = selectedClasses[course.name];
              const isSelected = !!selectedCode;
              const isExpanded = isCourseExpanded(course.id, course.name);
              const selectedGroup = groups.find(g => selectedClasses[course.name] === g.code);

              return (
                <div key={course.id} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isSelected ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(188,19,254,0.15)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  {/* Clickable Header */}
                  <div 
                    onClick={() => toggleCourseExpanded(course.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            course.status === CourseStatus.AVAILABLE 
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {course.status === CourseStatus.AVAILABLE ? 'LIBERADA' : 'REQUISITO PENDENTE'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {course.semester === 0 ? 'ELETIVA' : `${course.semester}º SEM`}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 uppercase font-display tracking-wide leading-tight">
                          {course.name}
                        </h3>
                        {course.blockingWeight > 0 && (
                          <span 
                            title={`Disciplinas trancadas por ${course.name}:\n${course.blockedCourses.join('\n')}`}
                            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border border-orange-500/30 bg-orange-500/10 text-orange-600 cursor-help"
                            onClick={(e) => e.stopPropagation()} // Prevent collapse toggle when clicking help
                          >
                            🔥 Tranca {course.blockingWeight} {course.blockingWeight === 1 ? 'Matéria' : 'Matérias'}
                          </span>
                        )}
                        {/* Collapsed view badges */}
                        {!isExpanded && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">
                              {groups.length} {groups.length === 1 ? 'turma' : 'turmas'}
                            </span>
                            {selectedGroup && (
                              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold">
                                Turma {selectedGroup.classCode} selecionada
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-white/40 space-y-2.5 animate-in fade-in duration-200">
                      {groups.map(group => {
                        const isGroupSelected = selectedClasses[course.name] === group.code;
                        
                        return (
                          <button
                            key={group.code}
                            onClick={() => toggleClassSelection(course.name, group.code)}
                            className={`w-full text-left p-3 rounded-lg flex flex-col gap-2 transition-all
                              ${isGroupSelected 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            <div className="flex justify-between font-bold items-start w-full">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className={`text-xs font-black uppercase tracking-wide ${isGroupSelected ? 'text-white' : 'text-primary'}`}>
                                  TURMA {group.courseOrigin}
                                </span>
                                <span className="text-[11px] opacity-80 font-medium truncate">
                                  CÓD: {group.code} • TURMA {group.classCode}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block truncate" title={group.teacher}>
                                  👤 {group.teacher}
                                </span>
                              </div>
                              {isGroupSelected && <X className="w-4 h-4 mt-0.5 shrink-0" />}
                            </div>
                            <div className="opacity-90 font-mono text-[11px] leading-snug mt-1 pt-2 border-t border-white/10">
                              {group.sessions.map((s, i) => (
                                <div key={i} className="flex gap-3">
                                  <span className="w-8 font-bold">{s.day}</span>
                                  <span>{s.startTime.slice(0,5)} - {s.endTime.slice(0,5)}</span>
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {schedulableCourses.length === 0 && (
              <div className="text-center text-slate-600 py-12 px-6 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20 text-slate-400" />
                <p className="text-sm font-medium">Nenhuma matéria correspondente encontrada.</p>
                <p className="text-xs text-slate-400 mt-1">
                  {showAllPendingInScheduler ? 'Tente buscar por outro termo.' : 'Ative "Mostrar Todas" para ver matérias com requisitos pendentes.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Visual Calendar */}
        <div className="flex-1 h-1/2 lg:h-full overflow-hidden bg-white relative flex flex-col">
          {conflicts.length > 0 && (
             <div className="bg-red-500/20 border-b border-red-500/50 p-2.5 text-red-400 text-[10px] font-bold text-center animate-pulse z-30 flex items-center justify-center gap-2">
               <AlertCircle className="w-3.5 h-3.5" />
               CONFLITO DE HORÁRIO: {conflicts.join(', ')}
             </div>
          )}
          
          <div className="grid grid-cols-5 border-b border-slate-200 z-20 bg-white sticky top-0 shadow-xl relative">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#F8FAFC] border border-slate-200 p-0.5 rounded-lg">
              <button 
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                disabled={zoomLevel === 1}
                className="p-1 text-slate-500 hover:text-primary disabled:opacity-30 disabled:hover:text-slate-500 transition-colors rounded hover:bg-slate-100"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3 bg-slate-200"></div>
              <button 
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 1))}
                disabled={zoomLevel === 3}
                className="p-1 text-slate-500 hover:text-primary disabled:opacity-30 disabled:hover:text-slate-500 transition-colors rounded hover:bg-slate-100"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            {days.map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-black text-slate-500 border-r border-slate-200/30 last:border-0 uppercase tracking-widest bg-white">
                {d}
              </div>
            ))}
          </div>

          {/* This container allows horizontal scrolling on mobile */}
          <div className="relative flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <div className={`relative min-w-[600px] transition-all duration-300 ${zoomLevel === 1 ? 'h-full min-h-[500px]' : zoomLevel === 2 ? 'h-[900px]' : 'h-[1400px]'}`}>
              {/* Hour Guides */}
              {Array.from({ length: 17 }).map((_, i) => {
                const hour = i + 7;
                const top = ((hour - 7) / 16) * 100;
                return (
                  <div key={hour} className="absolute w-full border-t border-slate-800/40 text-[9px] text-slate-700 pl-1 pointer-events-none font-mono" style={{ top: `${top}%` }}>
                    {hour}:00
                  </div>
                );
              })}

              {/* Day column borders */}
              {days.map((_, i) => (
                <div key={i} className="absolute h-full border-r border-slate-800/20 pointer-events-none" style={{ left: `${((i + 1) / 5) * 100}%` }}></div>
              ))}

              {/* Current Class Sessions */}
              {currentScheduleSessions.map((item) => {
                if (!days.includes(item.session.day)) return null;
                
                const dayIndex = days.indexOf(item.session.day);
                const top = getPosition(item.session.startTime);
                const bottom = getPosition(item.session.endTime);
                const height = bottom - top;

                return (
                  <div
                    key={item.id}
                    className="absolute p-1 rounded-sm text-[9px] md:text-xs leading-snug border hover:z-50 hover:scale-[1.02] transition-all cursor-pointer shadow-lg backdrop-blur-sm flex flex-col justify-center text-center overflow-hidden"
                    style={{
                      left: `${(dayIndex / 5) * 100 + 0.5}%`,
                      width: `${19}%`,
                      top: `${top + 0.2}%`,
                      height: `${height - 0.4}%`,
                      backgroundColor: item.color,
                      borderColor: item.color.replace('0.25)', '0.8)'),
                      color: '#1e293b'
                    }}
                    title={`${item.name}\nProfessor: ${item.teacher}\nSala: ${item.session.room}\nTipo: ${item.session.type}\nHorário: ${item.session.startTime.slice(0,5)} - ${item.session.endTime.slice(0,5)}`}
                  >
                    <div className="font-black uppercase tracking-tight leading-none mb-0.5 line-clamp-3 text-[16px]">
                      {item.name}
                    </div>
                    {item.teacher && (
                      <div className="opacity-90 font-bold text-[12px] uppercase tracking-wide truncate w-full">
                        {item.teacher.split(' ').slice(0, 2).join(' ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <Auth 
        onLogin={(userData) => {
          setUser(userData);
                    let codeToSet = null;
          if (userData.detectedMajor && COURSES_LIST.some(c => c.code === userData.detectedMajor)) {
            codeToSet = userData.detectedMajor;
          } else if (userData.matricula) {
            const match = userData.matricula.match(/^(\d{7,11})([a-zA-Z]+)$/i);
            if (match) {
               codeToSet = match[2].toUpperCase();
            } else if (COURSES_LIST.some(c => c.code === userData.matricula.toUpperCase())) {
               codeToSet = userData.matricula.toUpperCase();
            }
          }
          if (codeToSet && COURSES_LIST.some(c => c.code === codeToSet)) {
             setUserMajor(codeToSet);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans bg-[#F8FAFC] text-slate-800 selection:bg-cyan-500/30 overflow-hidden">
      
            {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between shadow-sm relative z-50 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div>
            <h1 className="font-display font-bold text-xl text-primary leading-tight">CEFET Planner</h1>
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider">{userMajor || 'Carregando...'}</span>
            </div>
          </div>
          
          <div className="text-right md:hidden">
             <div className="text-sm font-bold text-slate-800 font-display leading-none">{progressPercentage}%</div>
             <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Progresso</div>
          </div>
        </div>

        {view === 'tracker' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto md:flex-1 md:max-w-xl md:ml-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar matéria..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-sm transition-all border rounded-lg outline-none bg-slate-50 border-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-slate-800 placeholder:text-slate-600"
              />
            </div>
            <button 
              onClick={() => setShowNextOnly(!showNextOnly)}
              className={`w-full sm:w-auto px-3 py-2 rounded-lg border font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2
                ${showNextOnly 
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-primary shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-600'
                }`}
            >
              <Zap className={`w-3 h-3 ${showNextOnly ? 'fill-cyan-400' : ''}`} />
              {showNextOnly ? 'DISPONÍVEIS' : 'PRÓXIMO PASSO'}
            </button>
          </div>
        )}

        <div className="hidden md:block text-right ml-auto">
           <div className="text-sm font-bold text-slate-800 font-display leading-none">{progressPercentage}%</div>
           <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Progresso</div>
        </div>
      </header>
      
{/* Main Viewport */}
      <div className="h-[calc(100vh-68px-48px)] sm:h-[calc(100vh-68px)] overflow-hidden">
        {view === 'home' && renderHome()}
        {view === 'profile' && renderProfile()}
        {view === 'tracker' && renderTracker()}
        {view === 'scheduler' && renderScheduler()}
      </div>

      
            {/* Bottom Navigation */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-lg z-[100]">
        <div className="flex justify-around items-center p-2 max-w-md mx-auto">
          <button onClick={() => setView('home')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === 'home' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-700'}`}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Início</span>
          </button>
          <button onClick={() => setView('tracker')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === 'tracker' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-700'}`}>
            <List className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Fluxograma</span>
          </button>
          <button onClick={() => setView('scheduler')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === 'scheduler' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Grade</span>
          </button>
          <button onClick={() => setView('profile')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${view === 'profile' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-700'}`}>
            <UserCircle className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Perfil</span>
          </button>
        </div>
      </footer>
      
{/* Gemini AI Assistant */}
      <GeminiAssistant 
        completedIds={completedIds}
        schedulableCourses={schedulableCourses}
        scheduleData={scheduleData}
        selectedClasses={selectedClasses}
        userMajor={userMajor}
      />
    </div>
  );
}