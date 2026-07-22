import { Course, CourseStatus, DAY_LABELS } from '@/types/schedule';
import { OccupancyBar } from './OccupancyBar';
import { Clock } from 'lucide-react';


interface CourseTooltipProps {
  course: Course;
  status: CourseStatus;
  completedCodes?: string[];
  hasConflict?: boolean;
}



// Status labels for main state
const statusLabels: Record<Extract<CourseStatus, 'available' | 'confirmed' | 'planned'>, string> = {
  available: 'Disponível',
  confirmed: 'Confirmada',
  planned: 'Planejada',
};


export function CourseTooltipContent({ course, status, completedCodes = [], hasConflict }: CourseTooltipProps) {

  return (
    <div className="space-y-3 p-1 max-w-[280px]">
      <div>
        <p className="font-bold text-sm leading-tight text-primary">{course.code} — {course.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{course.professor}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold">
          {course.period}º Período
        </span>
        <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
          {course.credits} créditos
        </span>

        {/* Warning/Alert Tags */}
        {!course.prerequisitesMet && (
          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold uppercase tracking-wider">
            Requisitos Pendentes
          </span>
        )}

        {course.occupancy.occupied >= course.occupancy.total && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
            Turma Lotada
          </span>
        )}

        {hasConflict && (
          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold uppercase tracking-wider">
            Conflito de Horário
          </span>
        )}
      </div>



      <div className="text-xs space-y-1 bg-accent/5 p-2 rounded-md border border-accent/10">
        {course.slots.map((slot, i) => (
          <p key={i} className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground/80">
              {DAY_LABELS[slot.day]} {String(slot.startHour).padStart(2, '0')}:{String(slot.startMinute).padStart(2, '0')} – {String(slot.endHour).padStart(2, '0')}:{String(slot.endMinute).padStart(2, '0')}
            </span>
          </p>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>Lotação</span>
          <span>{course.occupancy.occupied + course.occupancy.requested}/{course.occupancy.total}</span>
        </div>
        <OccupancyBar occupancy={course.occupancy} height={6} />
        <div className="flex gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-occupancy-occupied" /> {course.occupancy.occupied} ocupadas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-occupancy-requested" /> {course.occupancy.requested} pedidas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-occupancy-available" /> {course.occupancy.total - course.occupancy.occupied} livres
          </span>
        </div>
      </div>

      {course.degree && (
        <p className="text-[10px] italic text-muted-foreground border-t pt-2">
          {course.degree}
        </p>
      )}

      {course.prerequisites.length > 0 && (
        <div className="space-y-1 border-t pt-2">
          <p className="text-[10px] font-bold text-foreground/70 uppercase">Pré-requisitos:</p>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {course.prerequisites.map(req => {
              const isMet = completedCodes.includes(req);
              return (
                <span key={req} className={`text-[10px] flex items-center gap-0.5 ${isMet ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {isMet ? '✓' : '✗'} {req}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {course.unlocks.length > 0 && (
        <div className="space-y-1 border-t pt-2">
          <p className="text-[10px] font-bold text-foreground/70 uppercase">Desbloqueia:</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {course.unlocks.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

