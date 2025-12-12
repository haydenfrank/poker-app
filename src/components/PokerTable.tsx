// File: src/components/PokerTable.tsx (set dealer exactly halfway between pot and seat ring)
import Seat from "./Seat";
import type { Player } from "../types";

interface Props {
  seats: (Player | null)[];
  formatMoney?: (n: number) => string;
  onOpenSeat?: (index: number) => void;
  dealerSeat?: number | null;
}

const MAX_SEATS = 10;

export default function PokerTable({
  seats,
  formatMoney,
  onOpenSeat,
  dealerSeat,
}: Props) {
  const ring = Array.from({ length: MAX_SEATS }, (_, i) => seats[i] ?? null);

  function posFor(index: number, radiusPct = 40) {
    const angle = (index / MAX_SEATS) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + radiusPct * Math.cos(angle);
    const y = 50 + radiusPct * Math.sin(angle);
    return { left: `${x}%`, top: `${y}%` };
  }

  const seatRadiusPct = 40;
  const dealerRadiusPct = seatRadiusPct / 2; // halfway between pot (center) and seat ring

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

        {typeof dealerSeat === "number" &&
          dealerSeat >= 0 &&
          dealerSeat < MAX_SEATS && (
            <div
              className="dealer-button"
              style={{
                ...posFor(dealerSeat, dealerRadiusPct),
                transform: "translate(-50%, -50%)",
              }}
              title={`Dealer: Seat ${dealerSeat + 1}`}
              aria-label="Dealer button"
            >
              D
            </div>
          )}
      </div>

      <div className="table-center">
        <div className="dealer-chip">POT</div>
      </div>
    </div>
  );
}
