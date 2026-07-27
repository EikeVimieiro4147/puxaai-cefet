import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { CURRICULA, COURSES_LIST } from '../constants';
import { CourseStatus, type Course, type CourseNode } from '../types';
import {
  CheckCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Search,
  LogOut,
  RefreshCcw,
  User,
  Eye,
  EyeOff,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { LoadingTips } from './LoadingTips';
import { useToast } from '@/components/ui/use-toast';
import { API_BASE_URL } from '../lib/apiConfig';

interface DashboardProps {
  matricula: string;
  onLogout: () => void;
  onOpenTutorial: () => void;
}

export default function DashboardView({ matricula, onLogout, onOpenTutorial }: DashboardProps) {
  const { toast } = useToast();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);

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

  const [expandedSemester, setExpandedSemester] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNextOnly, setShowNextOnly] = useState(false);

  // Discover Major from Matricula (e.g. 1511111gel -> GEL, 1912345bcc -> BCC)
  const userMajor = useMemo(() => {
    const matriculaRegex = /^(\d{7})([a-zA-Z]+)$/;
    const match = matricula.match(matriculaRegex);
    if (!match) {
      const foundMajor = Object.keys(CURRICULA).find(m => matricula.toUpperCase().includes(m));
      return foundMajor || 'GEL';
    }
    const courseCode = match[2].toUpperCase();
    return CURRICULA[courseCode] ? courseCode : 'GEL';
  }, [matricula]);

  const currentCurriculum = useMemo(() => {
    if (!userMajor || !CURRICULA[userMajor]) return CURRICULA.GEL || [];
    return CURRICULA[userMajor];
  }, [userMajor]);

  useEffect(() => {
    fetchCurriculo();
  }, [matricula]);

  const [debugStr, setDebugStr] = useState('');
  const [creditsInfo, setCreditsInfo] = useState({ earned: 0, total: 240 });

  const fetchCurriculo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/curriculo/${matricula}`);
      if (res.data.status === 'success') {
        const curriculoData = res.data.curriculo || [];
        setUserInfo(res.data.user_info || null);
        setIsPublic(res.data.user_info?.isPublic || false);

        const earnedCredits = curriculoData
          .filter((c: any) => c.situacao === 'Vencido')
          .reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);

        const requiredCredits = curriculoData
          .reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);

        setCreditsInfo({ earned: earnedCredits, total: requiredCredits });

        const newCompleted = new Set<string>();
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');

        const vencidos = curriculoData.filter((c: any) => c.situacao === 'Vencido');
        const vencidosNomes = vencidos.map((c: any) => normalize(c.disciplina || ''));

        currentCurriculum.forEach(course => {
          const courseNorm = normalize(course.name);
          if (vencidosNomes.some((vn: string) => vn === courseNorm)) {
            newCompleted.add(course.id);
          }
        });

        const debugData = {
          userMajor,
          curriculumSize: currentCurriculum.length,
          vencidosSize: vencidosNomes.length,
          completedIdsAdded: Array.from(newCompleted)
        };
        setDebugStr(JSON.stringify(debugData, null, 2));

        setCompletedIds(Array.from(newCompleted));
        setError('');
      } else {
        throw new Error(res.data.message || 'Erro ao carregar currículo.');
      }
    } catch (err: any) {
      console.warn("API de currículo offline ou 404. Carregando fluxograma padrão:", err);
      // Graceful fallback to static fluxogram matrix for user major
      setUserInfo({
        nome: 'Aluno CEFET',
        curso: `${userMajor} - Curso Graduação`,
        periodo_atual: 1,
        isPublic: false
      });
      const totalCurriculumCredits = currentCurriculum.length * 4;
      setCreditsInfo({ earned: 0, total: totalCurriculumCredits });
      setCompletedIds([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = (id: string) => completedIds.includes(id);

  const getCourseStatus = (course: Course): CourseStatus => {
    if (isCompleted(course.id)) return CourseStatus.COMPLETED;
    const allPrereqsMet = course.prereqs.every(id => {
      const normalized = id.toLowerCase();
      if (normalized.includes('credito') || normalized.includes('crédito')) {
        const match = id.match(/\d+/);
        if (match) {
          const requiredCredits = parseInt(match[0], 10);
          const completedCredits = completedIds.length * 4;
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

  const enrichedCurriculum = useMemo(() => {
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

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.COMPLETED: return 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-500/10 text-emerald-800';
      case CourseStatus.AVAILABLE: return 'bg-white border-primary shadow-md shadow-primary/10 text-slate-800';
      case CourseStatus.LOCKED: return 'bg-slate-50 border-slate-200 text-slate-400 opacity-80';
    }
  };

  const getIcon = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.COMPLETED: return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case CourseStatus.AVAILABLE: return <Unlock className="w-5 h-5 text-primary" />;
      case CourseStatus.LOCKED: return <Lock className="w-5 h-5 text-slate-400" />;
    }
  };

  const courseDisplayName = COURSES_LIST.find(c => c.code === userMajor)?.name || userMajor;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-screen p-6">
        <RefreshCcw className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-700 font-bold tracking-tight">Sincronizando Currículo do Firestore...</p>
        <LoadingTips />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

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
                    {Math.round((completedIds.length / currentCurriculum.length || 0) * 100)}% Concluído
                  </span>
                </div>

                {isMobileStatsOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Item 1: Disciplinas */}
                    <div className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 uppercase tracking-wider text-[9px]">Disciplinas</span>
                        <span className="text-primary text-[10px]">{completedIds.length} de {currentCurriculum.length} ({Math.round((completedIds.length / currentCurriculum.length || 0) * 100)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.round((completedIds.length / currentCurriculum.length || 0) * 100)}%` }} />
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
                  <span className="text-[9px] font-bold text-primary">{Math.round((completedIds.length / currentCurriculum.length || 0) * 100)}%</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.round((completedIds.length / currentCurriculum.length || 0) * 100)}%` }} />
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

        {/* SEARCH & CONTROLS ROW */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar matéria..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-700"
            />
          </div>
          <button
            onClick={() => setShowNextOnly(!showNextOnly)}
            className={`px-3 py-2 text-xs md:text-sm font-bold transition-colors rounded-xl border shrink-0 ${showNextOnly ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Apenas Livres
          </button>
          
          {/* DESKTOP TUTORIAL & LOGOUT (Hidden on mobile to avoid duplicate/cut-off icons!) */}
          <button onClick={onOpenTutorial} className="hidden md:flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg" title="Dúvidas e Tutorial">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={onLogout} className="hidden md:flex p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg" title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {error ? (
        <div className="p-12 text-center max-w-lg mx-auto mt-20">
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold">
            {error}
          </div>
          <button onClick={fetchCurriculo} className="mt-8 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md">Tentar Novamente</button>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto px-6 max-w-7xl mx-auto w-full space-y-6 pb-20 pt-8">

          {semesters.map((semester: any) => {
            const semesterCourses = getFilteredBySemester(Number(semester));
            if (semesterCourses.length === 0 && (searchQuery || showNextOnly)) return null;

            const isExpanded = expandedSemester === semester || searchQuery !== '' || showNextOnly;
            const semTotal = coursesBySemester[semester].length;
            const semCompleted = coursesBySemester[semester].filter(c => c.status === CourseStatus.COMPLETED).length;
            const isFullyComplete = semTotal > 0 && semTotal === semCompleted;

            return (
              <div key={semester} className={`border rounded-2xl transition-all duration-300 overflow-hidden shadow-sm ${isFullyComplete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <button
                  onClick={() => setExpandedSemester(expandedSemester === semester ? null : semester)}
                  className="flex items-center justify-between w-full px-5 py-4 transition-colors hover:bg-slate-50 outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 text-sm font-black rounded-xl font-display
                    ${isFullyComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}
                  `}>
                      {semester === 0 ? 'OP' : `${semester}º`}
                    </div>
                    <div className="text-left">
                      <h2 className={`font-display font-bold text-lg ${isFullyComplete ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {semester === 0 ? 'ELETIVAS' : `SEMESTRE ${semester}`}
                      </h2>
                      <div className="h-1.5 mt-1 w-24 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${isFullyComplete ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${semTotal === 0 ? 0 : (semCompleted / semTotal) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-100/50 bg-slate-50/50">
                    {semesterCourses.map(course => (
                      <div
                        key={course.id}
                        onClick={() => {
                          // User can simulate checking boxes, although real source of truth is Firebase
                          if (course.status !== CourseStatus.LOCKED || isCompleted(course.id)) {
                            toggleCourse(course.id);
                          }
                        }}
                        className={`
                        relative group p-5 rounded-xl border bg-white transition-all duration-200 cursor-pointer select-none
                        hover:scale-[1.02] active:scale-[0.98]
                        ${getStatusColor(course.status)}
                      `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold leading-tight font-display text-[15px]">{course.name}</h3>

                            {course.prereqs.length > 0 ? (
                              <div className="mt-4 border-t border-slate-100 pt-3">
                                <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-1.5">Pré-requisitos:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {course.prereqs.map(pid => {
                                    const isPreDone = isCompleted(pid);
                                    const pName = currentCurriculum.find(c => c.id === pid)?.name.split(' ').slice(0, 2).join(' ') || pid;
                                    return (
                                      <span key={pid} className={`px-2 py-0.5 font-bold rounded shadow-sm text-[9px] border ${isPreDone
                                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                                          : 'border-red-500/20 bg-red-500/5 text-red-500'
                                        }`}>
                                        {pName}
                                      </span>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 border-t border-slate-100 pt-3">
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Sem pré-requisitos</p>
                              </div>
                            )}
                            {course.blockingWeight > 0 && course.status !== CourseStatus.COMPLETED && (
                              <div className="mt-3">
                                <span
                                  title={`Disciplinas trancadas por ${course.name}:\n${course.blockedCourses.join('\n')}`}
                                  className="inline-flex items-center gap-1 font-bold px-2 py-1 text-[9px] uppercase tracking-wider rounded border border-orange-500/20 bg-orange-500/10 text-orange-600 cursor-help"
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
      )}
    </div>
  );
}
