import { Filters } from '@/hooks/useSchedule';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Clock, Eye, EyeOff, AlertTriangle, ChevronDown, ChevronUp, GraduationCap, Users2, Lock } from 'lucide-react';



interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  allProfessors: string[];
  allDegrees: string[];
  allPeriods: number[];
}

export function FilterPanel({ filters, onChange, allProfessors, allDegrees, allPeriods }: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

  return (
    <div className="bg-card border-b transition-all duration-300">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!isCollapsed && (
        <div className="space-y-4 p-4 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar disciplina, código ou docente..."
              value={filters.searchText}
              onChange={e => update({ searchText: e.target.value })}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Degree (Curso) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              {/* <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />*/}
              <Label className="text-xs text-muted-foreground font-semibold">Curso</Label>
            </div>
            <Select
              value={filters.degrees[0] || 'all'}
              onValueChange={v => update({ degrees: v === 'all' ? [] : [v] })}
            >
              <SelectTrigger className="w-full h-9 text-xs bg-popover">
                <SelectValue placeholder="Todos os cursos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">

                <SelectItem value="all" className="text-xs">Todos os cursos</SelectItem>
                {allDegrees.map(d => (
                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Professor */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-semibold">Docente</Label>
            <Select
              value={filters.professors[0] || 'all'}
              onValueChange={v => update({ professors: v === 'all' ? [] : [v] })}
            >
              <SelectTrigger className="w-full h-9 text-xs bg-popover">
                <SelectValue placeholder="Todos os docentes" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">

                <SelectItem value="all" className="text-xs">Todos os docentes</SelectItem>
                {allProfessors.map(p => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-semibold">Período</Label>
            <div className="flex flex-wrap gap-2">
              {allPeriods.map(p => (
                <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={filters.periods.includes(p)}
                    onCheckedChange={checked => {
                      const next = checked
                        ? [...filters.periods, p]
                        : filters.periods.filter(x => x !== p);
                      update({ periods: next });
                    }}
                    className="h-3.5 w-3.5"
                  />
                  {p}º
                </label>
              ))}
            </div>
          </div>

          {/* Hour Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground font-semibold">
                Horário: {String(filters.hourRange[0]).padStart(2, '0')}h – {String(filters.hourRange[1]).padStart(2, '0')}h
              </Label>
            </div>
            <Slider
              min={7}
              max={22}
              step={1}
              value={filters.hourRange}
              onValueChange={(v) => update({ hourRange: v as [number, number] })}
              className="mt-1"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t">
            <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium">
              <Checkbox
                checked={filters.hideMissingPrerequisites}
                onCheckedChange={checked => update({ hideMissingPrerequisites: !!checked })}
                className="h-3.5 w-3.5"
              />
              <Lock className="w-3.5 h-3.5" />
              Ocultar bloqueadas
            </label>



            <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium">
              <Checkbox
                checked={filters.hideConflicts}
                onCheckedChange={checked => update({ hideConflicts: !!checked })}
                className="h-3.5 w-3.5"
              />
              <Clock className="w-3.5 h-3.5" />
              Ocultar conflitos de horário
            </label>


            <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium">
              <Checkbox
                checked={filters.hideFull}
                onCheckedChange={checked => update({ hideFull: !!checked })}
                className="h-3.5 w-3.5"
              />
              <Users2 className="w-3.5 h-3.5" />
              Ocultar lotadas
            </label>
          </div>

        </div>
      )}
    </div>
  );
}
