import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useSchedule } from '@/hooks/useSchedule';
import { transformFullData } from '@/lib/dataAdapter';
import { useToast } from '@/components/ui/use-toast';

import { ScheduleGrid } from '@/components/ScheduleGrid';
import { CourseSidebar } from '@/components/CourseSidebar';
import { FilterPanel } from '@/components/FilterPanel';
import { CalendarDays, RotateCcw, GraduationCap, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JsonUpload } from '@/components/JsonUpload';
import { WelcomeDialog } from '@/components/WelcomeDialog';


const Index = () => {

  const {
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
  } = useSchedule('');

  const { toast } = useToast();
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  useEffect(() => {
    const matricula = localStorage.getItem("user_matricula");
    if (!matricula) {
      setIsFetchingData(false);
      return;
    }
    
    setHasLoggedIn(true);

    const fetchDatabase = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/data/${matricula}`);
        if (response.data.status === "success") {
          const transformed = transformFullData(response.data.data);
          setData(transformed);
          toast({
            title: "Dados Carregados",
            description: "Sua matriz curricular foi importada da base de dados local com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro de Conexão",
          description: error.response?.data?.message || "Não foi possível resgatar os dados do backend.",
          variant: "destructive",
        });
      } finally {
        setIsFetchingData(false);
      }
    };
    
    fetchDatabase();
  }, [setData, toast]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);



  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-background ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      {!hasLoggedIn && <WelcomeDialog onDataLoaded={setData} />}



      {/* Top bar */}
      <header className="h-14 border-b flex items-center justify-between px-5 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Planejador de Matrícula</h1>
            <p className="text-[11px] text-muted-foreground">Simulação inteligente de grade horária</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFetchingData && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium mr-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sincronizando com Banco...</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs mr-2">
            {plannedIds.size > 0 && (
              <span className="px-2 py-1 rounded-md bg-schedule-planned/10 text-schedule-planned font-medium">
                {plannedIds.size} planejada{plannedIds.size > 1 ? 's' : ''}
              </span>
            )}
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
              {confirmedSet.size} confirmada{confirmedSet.size > 1 ? 's' : ''}
            </span>
            <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
              {totalCredits} créditos
            </span>
          </div>

          {dragSelection && (
            <Button variant="outline" size="sm" onClick={clearDragSelection} className="text-xs h-8 gap-1">
              <X className="w-3 h-3" />
              Limpar seleção
            </Button>
          )}

          {plannedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={resetPlan} className="text-xs h-8 gap-1">
              <RotateCcw className="w-3 h-3" />
              Reiniciar planejamento
            </Button>
          )}
          
          {hasLoggedIn ? (
            <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem("user_matricula"); window.location.reload(); }} className="text-xs h-8 border-destructive/20 text-destructive hover:bg-destructive/10">
              Sair
            </Button>
          ) : (
            <JsonUpload onDataLoaded={setData} />
          )}
          
        </div>
      </header>


      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Filters + Sidebar */}
        <aside
          className="border-r flex flex-col shrink-0 bg-card/50"
          style={{ width: `${sidebarWidth}px` }}
        >

          <FilterPanel
            filters={filters}
            onChange={setFilters}
            allProfessors={allProfessors}
            allDegrees={allDegrees}
            allPeriods={allPeriods}
          />


          <div className="flex-1 overflow-hidden border-t">
            <CourseSidebar
              courses={filteredCourses}
              selectedCourses={selectedCourses}
              getCourseStatus={getCourseStatus}
              onToggle={togglePlanned}
              onHover={setHoveredId}
              plannedIds={plannedIds}
              completedCodes={completedCodes}
            />



          </div>
        </aside>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={`w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-40 ${isResizing ? 'bg-primary' : 'bg-transparent'}`}
        />


        {/* Right: Schedule grid */}
        <main className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Grade Horária</h2>
            {dragSelection && (
              <span className="text-xs text-primary ml-2">
                Filtro ativo: {dragSelection.days.join(', ')} {dragSelection.startHour}h–{dragSelection.endHour}h
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto rounded-lg border bg-card">
            <ScheduleGrid
              selectedCourses={selectedCourses}
              getCourseStatus={getCourseStatus}
              onRemovePlanned={(id) => togglePlanned(id)}
              confirmedSet={confirmedSet}
              completedCodes={completedCodes}
              dragSelection={dragSelection}
              onDragSelect={setDragSelection}
              hoveredId={hoveredId}
              courses={courses}
              hourRange={filters.hourRange}

            />


          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded schedule-block-confirmed" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded schedule-block-planned" /> Planejada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-occupancy-available" /> Vagas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-occupancy-requested" /> Solicitadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-occupancy-occupied" /> Ocupadas
            </span>
            <span className="ml-auto text-[10px]">Arraste na grade para filtrar por horário</span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
