// File: src/components/PokerTable.tsx (allow parent to handle seat clicks)
import Seat from "./Seat";
import type { Player } from "../types";

interface Props {
  seats: (Player | null)[];
  formatMoney?: (n: number) => string;
  onOpenSeat?: (index: number) => void;
}

const MAX_SEATS = 10;

export default function PokerTable({ seats, formatMoney, onOpenSeat }: Props) {
  const ring = Array.from({ length: MAX_SEATS }, (_, i) => seats[i] ?? null);
  return (
    <div className="table-wrap">
      <div className="table-surface">
        <div className="felt"></div>
        <div className="table-rail"></div>
      </div>
      <div className="seat-ring">
        {ring.map((p, i) => (
          <Seat
            key={i}
            index={i}
            total={MAX_SEATS}
            player={p}
            formatMoney={formatMoney}
            onOpenSeat={onOpenSeat}
          />
        ))}
      </div>
      <div className="table-center">
        <div className="dealer-chip">POT</div>
      </div>
    </div>
  );
}
