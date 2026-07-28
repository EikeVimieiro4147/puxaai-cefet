import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCcw, LogOut, ChevronRight, ChevronLeft, User, Eye, EyeOff, Search, HelpCircle, SlidersHorizontal, BookOpen, X, BarChart2, ChevronUp, Users2, Download, FileSpreadsheet, FileText, Image } from 'lucide-react';
import { useSchedule } from '@/hooks/useSchedule';
import { transformFullData } from '@/lib/dataAdapter';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { CourseSidebar } from '@/components/CourseSidebar';
import { FilterPanel } from '@/components/FilterPanel';
import { GradeLeftSidebar } from './GradeLeftSidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { COURSES_LIST, CURRICULA, SCHEDULE_RAW_DATA } from '../constants';
import { fullMockData } from '@/data/fullMockData';
import { useToast } from '@/components/ui/use-toast';
import { DAY_LABELS, type DayOfWeek } from '@/types/schedule';
import { LoadingTips } from './LoadingTips';
import { API_BASE_URL } from '../lib/apiConfig';

const normalize = (str: string) => {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
};

interface GradeProps {
  matricula: string;
  onLogout: () => void;
  onOpenTutorial: () => void;
  onStartSync?: () => void;
}

export default function GradeView({ matricula, onLogout, onOpenTutorial, onStartSync }: GradeProps) {
  const { toast } = useToast();
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState('');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'disciplinas' | 'filtros' | 'colaborar'>('disciplinas');
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [userInfo, setUserInfo] = useState<any>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ earned: 0, total: 240 });
  const [completedCount, setCompletedCount] = useState(0);
  const [curriculumLength, setCurriculumLength] = useState(0);
  
  const [socialSearchQuery, setSocialSearchQuery] = useState('');
  const [noResultsForColleague, setNoResultsForColleague] = useState(false);

  // Discover Major from Matricula
  const userMajor = useMemo(() => {
    const matriculaRegex = /^(\d{7})([a-zA-Z]+)$/;
    const match = matricula.match(matriculaRegex);
    if (!match) return null;
    return match[2].toUpperCase();
  }, [matricula]);

  // Export handlers
  const handleExportCSV = () => {
    if (!selectedCourses || selectedCourses.length === 0) {
      toast({ title: "Grade vazia", description: "Selecione ao menos uma disciplina antes de exportar.", variant: "destructive" });
      return;
    }

    const hourRange = filters.hourRange || [7, 23];
    const hours = Array.from({ length: hourRange[1] - hourRange[0] }, (_, i) => hourRange[0] + i);
    const days: DayOfWeek[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const dayHeaders = ['Horário', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

    let csvContent = "\uFEFF";
    csvContent += `"PuxaAi - CEFET Planner";"Grade Horária"\n`;
    csvContent += `"Aluno:";"${userInfo?.nome || 'Aluno'}"\n`;
    csvContent += `"Curso:";"${courseDisplayName}"\n`;
    csvContent += `"Período:";"${userInfo?.periodo_atual ? `${userInfo.periodo_atual}º Período` : '-'}"\n`;
    csvContent += `\n`;
    csvContent += dayHeaders.join(';') + '\n';

    hours.forEach(hour => {
      const timeLabel = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
      const rowCells: string[] = [timeLabel];

      days.forEach(day => {
        const activeCourses: string[] = [];
        selectedCourses.forEach(course => {
          const hasSlot = course.slots.some(slot => slot.day === day && hour >= slot.startHour && hour < slot.endHour);
          if (hasSlot) {
            activeCourses.push(`${course.code} - ${course.name} (${course.professor})`);
          }
        });

        rowCells.push(activeCourses.length > 0 ? `"${activeCourses.join(' / ')}"` : '""');
      });

      csvContent += rowCells.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Grade_Matriz_Excel.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Sucesso!", description: "Tabela Excel com a grade horária baixada com sucesso." });
  };

  const handleExportPNG = () => {
    if (!selectedCourses || selectedCourses.length === 0) {
      toast({ title: "Grade vazia", description: "Selecione ao menos uma disciplina antes de exportar.", variant: "destructive" });
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const headerHeight = 115;
    const rowHeight = 44;
    const hourRange = filters.hourRange || [7, 23];
    const hours = Array.from({ length: hourRange[1] - hourRange[0] }, (_, i) => hourRange[0] + i);
    const height = headerHeight + 50 + hours.length * rowHeight + 40;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#00629b';
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PuxaAi - CEFET Planner', 30, 38);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    const nameStr = userInfo?.nome || 'Aluno';
    ctx.fillText(`ALUNO: ${nameStr}`, 30, 66);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#d1e4ff';
    const periodStr = userInfo?.periodo_atual ? `${userInfo.periodo_atual}º Período` : '-';
    ctx.fillText(`CURSO: ${courseDisplayName}   |   PERÍODO: ${periodStr}`, 30, 92);

    const gridTop = headerHeight + 20;
    const timeColWidth = 90;
    const dayColWidth = (width - 60 - timeColWidth) / 6;
    const startX = 30;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, gridTop, width - 60, 36);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(startX, gridTop, width - 60, 36);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hora', startX + timeColWidth / 2, gridTop + 23);

    const days: DayOfWeek[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    days.forEach((day, idx) => {
      const x = startX + timeColWidth + idx * dayColWidth;
      ctx.fillText(DAY_LABELS[day], x + dayColWidth / 2, gridTop + 23);
    });

    hours.forEach((hour, hIdx) => {
      const y = gridTop + 36 + hIdx * rowHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(startX, y, width - 60, rowHeight);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(startX, y, width - 60, rowHeight);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${String(hour).padStart(2, '0')}:00`, startX + timeColWidth / 2, y + 26);
    });

    const slotColors = ['#e0e7ff', '#dcfce7', '#fef3c7', '#ffe4e6', '#ccfbf1', '#f3e8ff'];
    const strokeColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#14b8a6', '#a855f7'];
    const textColors = ['#3730a3', '#065f46', '#92400e', '#9f1239', '#115e59', '#6b21a8'];

    selectedCourses.forEach((course, cIdx) => {
      const bgCol = slotColors[cIdx % slotColors.length];
      const borderCol = strokeColors[cIdx % strokeColors.length];
      const txtCol = textColors[cIdx % textColors.length];

      course.slots.forEach(slot => {
        const dayIdx = days.indexOf(slot.day);
        if (dayIdx === -1) return;

        const slotStart = slot.startHour;
        const slotEnd = slot.endHour;

        if (slotEnd <= hourRange[0] || slotStart >= hourRange[1]) return;

        const topY = gridTop + 36 + (slotStart - hourRange[0]) * rowHeight;
        const blockHeight = (slotEnd - slotStart) * rowHeight;
        const leftX = startX + timeColWidth + dayIdx * dayColWidth;

        ctx.fillStyle = bgCol;
        ctx.fillRect(leftX + 2, topY + 2, dayColWidth - 4, blockHeight - 4);
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftX + 2, topY + 2, dayColWidth - 4, blockHeight - 4);

        ctx.fillStyle = txtCol;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        const name = course.name.length > 20 ? course.name.substring(0, 18) + '...' : course.name;
        ctx.fillText(name, leftX + 8, topY + 18);

        ctx.font = '10px sans-serif';
        ctx.fillText(course.code, leftX + 8, topY + 32);

        if (blockHeight > 45) {
          ctx.font = '9px sans-serif';
          const prof = course.professor.length > 20 ? course.professor.substring(0, 18) + '...' : course.professor;
          ctx.fillText(prof, leftX + 8, topY + 46);
        }
      });
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Gerado por PuxaAi - CEFET Planner', width / 2, height - 15);

    const link = document.createElement('a');
    link.download = `Grade_Horarios_PuxaAi_${matricula || 'CEFET'}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Sucesso!", description: "Imagem da grade (.png) salva com sucesso." });
  };

  const handleExportPDF = () => {
    toast({ title: "Gerando PDF", description: "Abra a janela de impressão para salvar como PDF." });
    window.print();
  };

  const computedPeriods = useMemo(() => {
    const isEngineering = userMajor && userMajor.startsWith('G') && !['GADM', 'GFIS', 'GLEA'].includes(userMajor);
    const maxPeriod = isEngineering ? 10 : 8;
    const list = [0];
    for (let i = 1; i <= maxPeriod; i++) {
      list.push(i);
    }
    return list;
  }, [userMajor]);

  const courseDisplayName = useMemo(() => {
    return COURSES_LIST.find(c => c.code === userMajor)?.name || userMajor;
  }, [userMajor]);

  const togglePrivacy = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    toast({
      title: newValue ? "Grade Pública" : "Grade Privada",
      description: newValue ? "Seus colegas agora podem encontrar sua grade." : "Sua grade está visível apenas para você.",
    });
    try {
      await axios.post(`${API_BASE_URL}/api/social/privacy`, {
        matricula,
        isPublic: newValue
      });
    } catch (err) {
      setIsPublic(!newValue);
      toast({ title: "Erro", description: "Não foi possível atualizar a privacidade.", variant: "destructive" });
    }
  };

  const {
    courses,
    filteredCourses,
    selectedCourses,
    plannedIds,
    confirmedSet,
    completedCodes,
    getCourseStatus,
    togglePlanned,
    dragSelection,
    setDragSelection,
    clearDragSelection,
    hoveredId,
    setHoveredId,
    setData,
    filters,
    setFilters,
    allProfessors,
    allDegrees,
    allPeriods,
    guestMatricula,
    setGuestMatricula,
    guestPlannedIds,
    setGuestPlannedIds,
    showConfirmed,
    toggleShowConfirmed,
    showGuestSchedule,
    toggleShowGuestSchedule,
  } = useSchedule(matricula, { courses: [], confirmedIds: [], plannedIds: [] });

  const [socialSearchResults, setSocialSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsFetchingData(true);
        setError('');

        // 1. Fetch Student Curriculum from Firebase (via local backend)
        const curRes = await axios.get(`${API_BASE_URL}/api/curriculo/${matricula}`);
        if (curRes.data.status === 'error') {
          throw new Error('Falha ao carregar currículo do banco');
        }
        
        const curriculoData = curRes.data.curriculo || [];
        const fetchedUserInfo = curRes.data.user_info;

        setUserInfo(fetchedUserInfo || null);
        setIsPublic(fetchedUserInfo?.isPublic || false);

        // Match user's major
        let userMajorVal = "GEL";
        if (fetchedUserInfo && fetchedUserInfo.curso) {
           const matches = fetchedUserInfo.curso.match(/^([A-Z]+)\s*-/);
           if (matches && CURRICULA[matches[1]]) {
              userMajorVal = matches[1];
           }
        }
        
        const majorCurriculum = CURRICULA[userMajorVal] || CURRICULA.GEL;

        // Get electives (semester === 0) from ALL majors to allow taking any elective
        const allElectives: any[] = [];
        Object.keys(CURRICULA).forEach(major => {
           CURRICULA[major].forEach(course => {
              if (course.semester === 0 && !allElectives.some(e => normalize(e.id) === normalize(course.id))) {
                 allElectives.push(course);
              }
           });
        });

        const currentCurriculum = [...majorCurriculum];
        allElectives.forEach(elective => {
           if (!currentCurriculum.some(c => normalize(c.id) === normalize(elective.id))) {
              currentCurriculum.push(elective);
           }
        });

        const vencidos = curriculoData.filter((c: any) => c.situacao === 'Vencido');
        const vencidosNomes = vencidos.map((c: any) => normalize(c.disciplina || ''));
        
        // Progress metrics based on the main major curriculum only
        const completedMajorIds: string[] = [];
        majorCurriculum.forEach(node => {
          if (vencidosNomes.includes(normalize(node.name))) {
            completedMajorIds.push(node.id);
          }
        });
        setCompletedCount(completedMajorIds.length);
        setCurriculumLength(majorCurriculum.length);

        // Availability calculation based on full combined curriculum (major + all electives)
        const completedIds: string[] = [];
        currentCurriculum.forEach(node => {
          if (vencidosNomes.includes(normalize(node.name))) {
            completedIds.push(node.id);
          }
        });

        const earnedCredits = curriculoData
          .filter((c: any) => c.situacao === 'Vencido')
          .reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);

        const requiredCredits = curriculoData
          .reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);

        setCreditsInfo({ earned: earnedCredits, total: requiredCredits });

        // Compute exactly which courses are AVAILABLE
        const completedNormalizedNames = new Set(vencidosNomes);
        const isPrereqMet = (prereqId: string) => {
           const normP = normalize(prereqId);
           if (completedNormalizedNames.has(normP)) return true;
           return completedIds.some(cid => normalize(cid) === normP);
        };

        const availableCourseIds = new Set<string>();
        currentCurriculum.forEach(course => {
           if (vencidosNomes.includes(normalize(course.name)) || completedIds.includes(course.id)) return; // Already passed
           
           // Check prerequisites
           const allPrereqsMet = course.prereqs.length === 0 || course.prereqs.every(id => {
              if (id.startsWith('credits:')) {
                const required = parseInt(id.split(':')[1], 10);
                return earnedCredits >= required;
              }
              const isOr = id.includes('|');
              if (isOr) {
                const options = id.split('|');
                return options.some(opt => isPrereqMet(opt));
              }
              return isPrereqMet(id);
           });
           
           if (allPrereqsMet) {
              availableCourseIds.add(course.id);
           }
        });
        
        // Translate IDs (code) back to normalized names to match with horarios.CSV
        const availableCourseNames = Array.from(availableCourseIds).map(id => {
           const c = currentCurriculum.find(cc => cc.id === id);
           return c ? normalize(c.name) : '';
        }).filter(n => n !== '');

        // 2. Fetch Raw Schedules JSON with fallback to SCHEDULE_RAW_DATA or fullMockData
        let transformed;
        try {
          const rawRes = await axios.get(`${API_BASE_URL}/api/data/${matricula}`);
          if (rawRes.data?.status === "success" && rawRes.data.data?.courses?.length > 0) {
             transformed = transformFullData(rawRes.data.data);
          } else {
             transformed = transformFullData((SCHEDULE_RAW_DATA || fullMockData) as any);
          }
        } catch (e) {
          console.warn("Using fallback SCHEDULE_RAW_DATA / fullMockData:", e);
          transformed = transformFullData((SCHEDULE_RAW_DATA || fullMockData) as any);
        }

        // Build Graph to evaluate Blocking Weights (Tranca X Matérias)
        const unlocksGraph: Record<string, string[]> = {};
        currentCurriculum.forEach(c => {
          c.prereqs.forEach(req => {
            if (!unlocksGraph[req]) unlocksGraph[req] = [];
            unlocksGraph[req].push(c.id);
          });
        });
        
        const getBlockingCount = (id: string, visited = new Set<string>()): number => {
          if (visited.has(id)) return 0;
          visited.add(id);
          const directs = unlocksGraph[id] || [];
          let count = directs.length;
          directs.forEach(d => { count += getBlockingCount(d, visited); });
          return count;
        };

        const blockingCache = new Map<string, number>();

        // 3. Filter JSON courses to strictly the student's available courses + ENRICH with blockingWeight
        let STRICTLY_AVAILABLE_COURSES = transformed.courses.filter(course => {
           const norm = normalize(course.name);
           if (vencidosNomes.includes(norm)) return false;
           return availableCourseNames.includes(norm);
        });

        // Fallback: If strict matching resulted in 0 courses, display all non-vencido courses
        if (STRICTLY_AVAILABLE_COURSES.length === 0) {
           STRICTLY_AVAILABLE_COURSES = transformed.courses.filter(course => {
              const norm = normalize(course.name);
              return !vencidosNomes.includes(norm);
           });
        }

        STRICTLY_AVAILABLE_COURSES = STRICTLY_AVAILABLE_COURSES.map(course => {
           const norm = normalize(course.name);
           const node = currentCurriculum.find(c => normalize(c.name) === norm);
           let weight = 0;
           if (node) {
             if (!blockingCache.has(node.id)) {
                blockingCache.set(node.id, getBlockingCount(node.id));
             }
             weight = blockingCache.get(node.id) || 0;
           }
           return {
             ...course,
             blockingWeight: weight
           };
        });

        setData({ ...transformed, courses: STRICTLY_AVAILABLE_COURSES });

      } catch (err: any) {
        console.error(err);
        const errMsg = err.response?.data?.message || err.message;
        if (errMsg?.includes('404')) {
          setError('Dados de currículo não encontrados para esta matrícula. Por favor, realize a sincronização dos seus dados no menu inicial.');
        } else {
          setError(errMsg || 'Ocorreu um erro no carregamento da Grade.');
        }
      } finally {
        setIsFetchingData(false);
      }
    };

    loadData();
  }, [matricula, setData]);

  if (isFetchingData) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen pb-20 p-6">
           <RefreshCcw className="w-12 h-12 text-primary animate-spin mb-4" />
           <p className="text-slate-700 font-bold tracking-tight">Analisando disciplinas disponíveis...</p>
           <LoadingTips />
        </div>
     );
  }

  if (error) {
     return (
        <div className="p-12 text-center max-w-lg mx-auto mt-20 pb-20">
           <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold">
              {error}
           </div>
        </div>
     );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 md:py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 shadow-sm gap-3 md:gap-4">
        
        {/* MOBILE TOP BAR (Brand + Actions) - ONLY ON MOBILE */}
        <div className="flex md:hidden items-center justify-between w-full">
          <h1 className="font-display font-black text-xl text-primary tracking-tight">PuxaAi</h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={onOpenTutorial} 
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Dúvidas e Tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={onLogout} 
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WEB TOP BAR BRAND - ONLY ON DESKTOP */}
        <div className="hidden md:flex items-center gap-4">
          <h1 className="font-display font-black text-2xl text-primary tracking-tight">PuxaAi</h1>
        </div>

        {userInfo ? (
          <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-3 md:gap-6 w-full md:w-auto">
            
            {/* DESKTOP USER INFO - ONLY ON DESKTOP */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex flex-col items-start text-left">
                <div className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5 font-sans">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {userInfo.nome} <span className="font-normal text-slate-300">&bull;</span> {userInfo.periodo_atual}º Período
                </div>
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-0.5 font-sans">
                  {courseDisplayName} ({matricula.toUpperCase()})
                </div>
              </div>

              {/* Privacy Toggle */}
              <button
                onClick={togglePrivacy}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors font-sans ${isPublic ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                title={isPublic ? "Sua grade está pública" : "Sua grade está privada"}
              >
                {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isPublic ? 'PÚBLICO' : 'PRIVADO'}
              </button>
            </div>

            {/* MOBILE USER PROFILE & STATS INTERACTIVE CARD - ONLY ON MOBILE */}
            <div className="w-full block md:hidden">
              <div 
                onClick={() => setIsMobileStatsOpen(!isMobileStatsOpen)}
                className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{userInfo.nome}</span>
                      <span className="text-slate-300 font-normal">&bull;</span>
                      <span className="shrink-0">{userInfo.periodo_atual}º Per.</span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate mt-0.5">
                      {courseDisplayName} ({matricula.toUpperCase()})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrivacy();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 transition-colors ${
                        isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {isPublic ? 'PÚBLICO' : 'PRIVADO'}
                    </button>
                    
                    <div className="p-1 text-slate-400 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      {isMobileStatsOpen ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <BarChart2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1 text-indigo-600">
                    <BarChart2 className="w-3 h-3" />
                    Estatísticas do Aluno
                  </span>
                  <span className="text-primary font-black bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {Math.round((completedCount / curriculumLength || 0) * 100)}% Concluído
                  </span>
                </div>

                {isMobileStatsOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Item 1: Disciplinas */}
                    <div className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 uppercase tracking-wider text-[9px]">Disciplinas</span>
                        <span className="text-primary text-[10px]">{completedCount} de {curriculumLength} ({Math.round((completedCount / curriculumLength || 0) * 100)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.round((completedCount / curriculumLength || 0) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Item 2: Carga Horária */}
                    {userInfo.carga_horaria?.total && (
                      <div className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 uppercase tracking-wider text-[9px]">Carga Horária</span>
                          <span className="text-emerald-600 border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            {userInfo.carga_horaria.total.realizada}h / {userInfo.carga_horaria.total.exigida}h
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(userInfo.carga_horaria.total.realizada / userInfo.carga_horaria.total.exigida) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Item 3: Créditos */}
                    {creditsInfo && (
                      <div className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 uppercase tracking-wider text-[9px]">Créditos Acumulados</span>
                          <span className="text-indigo-600 border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {creditsInfo.earned} / {creditsInfo.total} cr
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((creditsInfo.earned / creditsInfo.total || 0) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* DESKTOP STATS GRAPH BARS - ONLY ON DESKTOP */}
            <div className="hidden lg:flex items-center gap-5 border-l border-slate-200 pl-5">
              {/* Stats Item: Disciplinas */}
              <div className="flex flex-col gap-1 w-24">
                <div className="flex items-end justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Disciplinas</span>
                  <span className="text-[9px] font-bold text-primary">{Math.round((completedCount / curriculumLength || 0) * 100)}%</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.round((completedCount / curriculumLength || 0) * 100)}%` }} />
                </div>
              </div>

              {/* Stats Item: Carga Horária */}
              {userInfo.carga_horaria?.total && (
                <div className="flex flex-col gap-1 w-28">
                  <div className="flex items-end justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Horas</span>
                    <span className="text-[9px] font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-1 rounded-sm">
                      {userInfo.carga_horaria.total.realizada}/{userInfo.carga_horaria.total.exigida}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(userInfo.carga_horaria.total.realizada / userInfo.carga_horaria.total.exigida) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Stats Item: Créditos */}
              {creditsInfo && (
                <div className="flex flex-col gap-1 w-24">
                  <div className="flex items-end justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Créditos</span>
                    <span className="text-[9px] font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 px-1 rounded-sm">
                      {creditsInfo.earned}/{creditsInfo.total}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${Math.round((creditsInfo.earned / creditsInfo.total || 0) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 text-center">
            <p className="text-xs text-slate-500 font-medium">Turma: {courseDisplayName} (Matrícula: {matricula})</p>
          </div>
        )}

        {/* SYNC & LOGOUT CONTROLS ROW */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          {onStartSync && (
            <button
              onClick={onStartSync}
              className="px-3 py-2 text-xs md:text-sm font-bold transition-all rounded-xl border shrink-0 flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white shadow-2xs"
              title="Atualizar dados do CEFET e sincronizar histórico com o banco"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sincronizar CEFET</span>
            </button>
          )}

          {/* DESKTOP TUTORIAL & LOGOUT */}
          <button onClick={onOpenTutorial} className="hidden md:flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg" title="Dúvidas e Tutorial">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={onLogout} className="hidden md:flex p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg" title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* LEGACY PLANNER BODY */}
      <TooltipProvider>
        <main className="flex-1 flex overflow-hidden relative">
        
        {/* RETRACTABLE LEFT SIDEBAR FOR DISCIPLINES, FILTERS & COLABORATIVO */}
        <div 
          className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex flex-col relative z-20 shrink-0 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)] ${isLeftSidebarOpen ? 'w-[340px] max-w-[85vw]' : 'w-14'}`}
        >
          {!isLeftSidebarOpen ? (
            /* COLLAPSED NARROW SIDEBAR (w-14) */
            <div className="flex flex-col items-center py-4 gap-3 w-full h-full">
              {/* Disciplinas Button */}
              <button 
                onClick={() => {
                  setLeftSidebarTab('disciplinas');
                  setIsLeftSidebarOpen(true);
                }}
                className={`p-2.5 rounded-xl transition-all ${
                  leftSidebarTab === 'disciplinas' 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="Ver Disciplinas"
              >
                 <BookOpen className="w-5 h-5" />
              </button>

              {/* Filtros Button */}
              <button 
                onClick={() => {
                  setLeftSidebarTab('filtros');
                  setIsLeftSidebarOpen(true);
                }}
                className={`p-2.5 rounded-xl transition-all relative ${
                  leftSidebarTab === 'filtros' 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="Filtrar Disciplinas"
              >
                 <SlidersHorizontal className="w-5 h-5" />
                 {(filters.searchText || (filters.professors?.length || 0) > 0 || (filters.degrees?.length || 0) > 0 || (filters.periods?.length || 0) > 0 || filters.hideMissingPrerequisites || filters.hideConflicts || filters.hideFull) && (
                   <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white" />
                 )}
              </button>

              {/* Colaborativo Button */}
              <button 
                onClick={() => {
                  setLeftSidebarTab('colaborar');
                  setIsLeftSidebarOpen(true);
                }}
                className={`p-2.5 rounded-xl transition-all relative ${
                  leftSidebarTab === 'colaborar' 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="Grade Colaborativa"
              >
                 <Users2 className="w-5 h-5" />
                 {guestMatricula && (
                   <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                 )}
              </button>

            </div>
          ) : (
            /* EXPANDED SIDEBAR (w-[340px]) */
            <div className="flex flex-col h-full overflow-hidden">
              {/* TAB SWITCHER HEADER */}
              <div className="flex items-center justify-between p-2.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl flex-1 mr-2 min-w-0">
                  <button
                    onClick={() => setLeftSidebarTab('disciplinas')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all truncate ${
                      leftSidebarTab === 'disciplinas'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Matérias</span>
                  </button>

                  <button
                    onClick={() => setLeftSidebarTab('filtros')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all relative truncate ${
                      leftSidebarTab === 'filtros'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Filtros</span>
                    {(filters.searchText || (filters.professors?.length || 0) > 0 || (filters.degrees?.length || 0) > 0 || (filters.periods?.length || 0) > 0 || filters.hideMissingPrerequisites || filters.hideConflicts || filters.hideFull) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ml-0.5 shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => setLeftSidebarTab('colaborar')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all relative truncate ${
                      leftSidebarTab === 'colaborar'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Users2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Colegas</span>
                    {guestMatricula && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 shrink-0 animate-pulse" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setIsLeftSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
                  title="Recolher painel"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* TAB CONTENT */}
              <div className="flex-1 overflow-hidden">
                {leftSidebarTab === 'disciplinas' ? (
                  <ErrorBoundary name="GradeLeftSidebar">
                    <GradeLeftSidebar 
                      courses={filteredCourses}
                      selectedCourses={selectedCourses}
                      getCourseStatus={getCourseStatus}
                      onToggle={togglePlanned}
                      hoveredId={hoveredId}
                      onHover={setHoveredId}
                      plannedIds={plannedIds}
                      completedCodes={completedCodes}
                      searchText={filters.searchText}
                      onSearchChange={(val) => setFilters(f => ({ ...f, searchText: val }))}
                    />
                  </ErrorBoundary>
                ) : leftSidebarTab === 'filtros' ? (
                  <div className="flex flex-col h-full bg-white overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <FilterPanel 
                        filters={filters}
                        onChange={setFilters}
                        allProfessors={allProfessors}
                        allDegrees={allDegrees}
                        allPeriods={computedPeriods}
                        showConfirmed={showConfirmed}
                        onToggleShowConfirmed={toggleShowConfirmed}
                      />
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
                      <button
                         onClick={() => {
                            setFilters({
                               searchText: '',
                               professors: [],
                               degrees: [],
                               periods: [],
                               hourRange: [7, 22],
                               hideMissingPrerequisites: false,
                               hideConflicts: false,
                               hideFull: false
                            });
                         }}
                         className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-all active:scale-95"
                      >
                         Limpar Todos os Filtros
                      </button>
                    </div>
                  </div>
                ) : (
                  /* TAB: GRADE COLABORATIVA */
                  <div className="flex flex-col h-full bg-white overflow-y-auto p-5">
                    <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold">
                       <Users2 className="w-5 h-5" />
                       <h3 className="font-display font-bold text-slate-800 text-base">Grade Colaborativa</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-5">
                       Veja o que seus colegas planejam cursar e sincronize suas grades clicando na matéria projetada!
                    </p>

                    <div className="space-y-4">
                       <div className="relative">
                          <input 
                             type="text" 
                             placeholder="Buscar colega por Nome ou Matrícula..."
                             value={socialSearchQuery}
                             className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 font-medium"
                             onChange={async (e) => {
                                 const q = e.target.value;
                                 setSocialSearchQuery(q);
                                 if (q.length < 2) {
                                    setSocialSearchResults([]);
                                    setNoResultsForColleague(false);
                                    return;
                                 }
                                 try {
                                    const res = await axios.get(`${API_BASE_URL}/api/social/search?q=${q}`);
                                    if (res.data.status === 'success' && res.data.results.length > 0) {
                                       setSocialSearchResults(res.data.results);
                                       setNoResultsForColleague(false);
                                    } else {
                                       setSocialSearchResults([]);
                                       setNoResultsForColleague(true);
                                    }
                                 } catch(err) {
                                    setSocialSearchResults([]);
                                    setNoResultsForColleague(true);
                                 }
                              }}
                          />
                       </div>

                       {socialSearchResults.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colegas Encontrados:</p>
                             {socialSearchResults.map((colleague: any) => (
                                <div key={colleague.matricula} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all">
                                   <div className="min-w-0 flex-1 pr-2">
                                      <p className="text-xs font-bold text-slate-800 truncate">{colleague.nome || colleague.matricula}</p>
                                      <p className="text-[10px] text-slate-500">{colleague.matricula} &bull; {colleague.plannedIds?.length || 0} turmas</p>
                                   </div>
                                   <button
                                      onClick={() => {
                                         const displayName = colleague.nome ? `${colleague.nome} (${colleague.matricula})` : colleague.matricula;
                                         setGuestMatricula(displayName);
                                         setGuestPlannedIds(new Set(colleague.plannedIds || []));
                                         toast({ title: "Grade Espelhada!", description: `Sincronizado com a grade de ${colleague.nome || colleague.matricula}` });
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-all shrink-0"
                                   >
                                      Espelhar
                                   </button>
                                </div>
                             ))}
                          </div>
                       )}

                       {noResultsForColleague && socialSearchQuery.length >= 2 && socialSearchResults.length === 0 && (
                          <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl flex flex-col gap-3">
                             <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                                Nenhum colega com "{socialSearchQuery}" foi encontrado ou a grade dele está privada.
                             </p>
                             <button
                                onClick={() => {
                                   const shareText = `E aí! Estou montando minha grade de horários do CEFET no PuxaAi. Deixa sua grade pública e me passa seu nome ou matrícula para sincronizarmos as aulas! Acesse aí: ${window.location.origin}`;
                                   const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                                   window.open(whatsappUrl, '_blank');
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                             >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                   <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.057 5.284 5.349 0 11.83 0c3.14.001 6.094 1.22 8.318 3.439 2.224 2.22 3.447 5.172 3.445 8.312-.002 6.553-5.297 11.837-11.782 11.837-2.008-.001-3.982-.513-5.731-1.488L0 24zm6.59-4.859c1.62.962 3.226 1.48 4.988 1.48 5.418 0 9.826-4.382 9.828-9.766C21.465 5.455 17.062 1.3 11.832 1.3 6.6 1.3 2.197 5.684 2.195 11.068c-.001 1.865.49 3.687 1.42 5.297l-1.012 3.693 3.791-.989-.356-.22zM17.486 14.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.77.98-.95 1.18-.18.2-.35.22-.65.07-1.13-.57-1.95-1.01-2.73-1.69-.6-.52-1.03-1.15-1.15-1.35-.12-.2-.01-.3.13-.44.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.68-1.63-.93-2.24-.25-.6-.5-.52-.68-.53-.17-.01-.38-.01-.58-.01-.2 0-.53.08-.8.38-.28.3-1.08 1.05-1.08 2.57 0 1.52 1.1 3 1.25 3.2.15.2 2.18 3.32 5.27 4.65.74.31 1.31.5 1.76.64.74.24 1.4.2 1.93.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.12-.28-.2-.58-.35z"/>
                                </svg>
                                Convidar no WhatsApp
                             </button>
                          </div>
                       )}

                       {guestMatricula && (
                          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col gap-2.5">
                             <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-indigo-700">Espelhando grade de:</p>
                                <button
                                   onClick={() => {
                                      setGuestMatricula(null);
                                      setGuestPlannedIds(new Set());
                                   }}
                                   className="text-[10px] text-red-500 hover:underline font-bold"
                                >
                                   Desconectar
                                </button>
                             </div>
                             <p className="text-sm font-bold text-slate-800 truncate">{guestMatricula}</p>
                             <p className="text-xs text-indigo-500">{guestPlannedIds.size} turmas projetadas juntas.</p>
                             
                             <button
                                onClick={toggleShowGuestSchedule}
                                className={`w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                                   showGuestSchedule
                                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                             >
                                {showGuestSchedule ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {showGuestSchedule ? "Ocultar Grade do Amigo" : "Exibir Grade do Amigo"}
                             </button>
                          </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SCHEDULE GRID WITH PRINT HEADER */}
        <div id="printable-schedule-grid" className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* PRINT-ONLY USER DATA HEADER */}
          <div className="hidden print:flex flex-col bg-slate-900 text-white p-3.5 rounded-xl mb-2.5 w-full border border-slate-800 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-1.5">
              <h2 className="text-lg font-black tracking-tight text-indigo-400">PuxaAi — Grade Horária CEFET</h2>
              <span className="text-[11px] font-mono text-slate-400">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <div><span className="text-slate-400 font-normal">Aluno:</span> {userInfo?.nome || 'Aluno'}</div>
              <div><span className="text-slate-400 font-normal">Curso:</span> {courseDisplayName}</div>
              <div><span className="text-slate-400 font-normal">Período:</span> {userInfo?.periodo_atual ? `${userInfo.periodo_atual}º Período` : '-'}</div>
            </div>
          </div>
          <ErrorBoundary name="ScheduleGrid">
            <ScheduleGrid
              courses={courses}
              selectedCourses={selectedCourses}
              getCourseStatus={getCourseStatus}
              onRemovePlanned={togglePlanned} 
              confirmedSet={confirmedSet}
              completedCodes={completedCodes}
              dragSelection={dragSelection}
              onDragSelect={setDragSelection}
              hoveredId={hoveredId}
              hourRange={filters.hourRange}
              guestPlannedIds={guestPlannedIds}
              showGuestSchedule={showGuestSchedule}
              onGuestCourseClick={(id) => togglePlanned(id)}
            />
          </ErrorBoundary>
        </div>
        </main>
      </TooltipProvider>

      {/* EXPORT MODAL */}
      {isExportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-[420px] max-w-[92vw] relative flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                   <Download className="w-5 h-5 text-indigo-600" />
                   <h3 className="font-display font-black text-slate-800 text-base">Exportar Grade Horária</h3>
                </div>
                <button 
                  onClick={() => setIsExportOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <p className="text-xs text-slate-500 leading-relaxed">
                Escolha o formato em que deseja salvar ou compartilhar a sua grade de horários:
             </p>

             <div className="space-y-3">
                {/* Format 1: Excel CSV */}
                <button
                  onClick={() => {
                    handleExportCSV();
                    setIsExportOpen(false);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-2xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800">Tabela Excel (.xlsx / .csv)</p>
                        <p className="text-[10px] text-slate-500">Planilha com matérias, horários, salas e professores</p>
                     </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>

                {/* Format 2: Image PNG */}
                <button
                  onClick={() => {
                    handleExportPNG();
                    setIsExportOpen(false);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-2xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl group-hover:scale-105 transition-transform">
                        <Image className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800">Imagem da Grade (.png)</p>
                        <p className="text-[10px] text-slate-500">Imagem de alta resolução pronta para compartilhar</p>
                     </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>

                {/* Format 3: PDF Document */}
                <button
                  onClick={() => {
                    handleExportPDF();
                    setIsExportOpen(false);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-2xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800">Documento PDF / Impressão</p>
                        <p className="text-[10px] text-slate-500">Documento formatado para salvar em PDF ou imprimir</p>
                     </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
