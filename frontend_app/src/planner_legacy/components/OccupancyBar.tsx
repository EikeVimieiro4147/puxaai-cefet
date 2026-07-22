import { type Course } from '@/types/schedule';

interface OccupancyBarProps {
  occupancy: Course['occupancy'];
  height?: number;
  direction?: 'horizontal' | 'vertical';
}

export function OccupancyBar({ occupancy, height = 8, direction = 'horizontal' }: OccupancyBarProps) {
  const { total, occupied, requested } = occupancy;

  const available = total - occupied;

  let pAvailable: number;
  let pRequested: number;
  const pOccupied = (occupied / total) * 100;

  if (requested >= available) {
    pAvailable = 0;
    pRequested = 100 - pOccupied;
  } else {
    pRequested = (requested / total) * 100;
    pAvailable = 100 - pOccupied - pRequested;
  }

  if (direction === 'vertical') {
    return (
      <div className="absolute inset-0 flex flex-col-reverse opacity-20 pointer-events-none">
        <div className="bg-occupancy-occupied" style={{ height: `${pOccupied}%` }} />
        <div className="bg-occupancy-requested" style={{ height: `${pRequested}%` }} />
        <div className="bg-occupancy-available" style={{ height: `${pAvailable}%` }} />
      </div>
    );
  }

  return (
    <div className="occupancy-bar flex" style={{ height }}>
      <div className="bg-occupancy-occupied transition-all" style={{ width: `${pOccupied}%` }} />
      <div className="bg-occupancy-requested transition-all" style={{ width: `${pRequested}%` }} />
      <div className="bg-occupancy-available transition-all" style={{ width: `${pAvailable}%` }} />
    </div>
  );
}
