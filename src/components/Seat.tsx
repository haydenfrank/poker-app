// File: src/components/Seat.tsx (call onOpenSeat for open seats)
import type { Player } from "../types";

interface SeatProps {
  index: number;
  total: number;
  player: Player | null;
  formatMoney?: (n: number) => string;
  onOpenSeat?: (index: number) => void;
}

export default function Seat({
  index,
  total,
  player,
  formatMoney,
  onOpenSeat,
}: SeatProps) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 40;
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);

  return (
    <div
      className="seat"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {player ? (
        <div className="seat-card occupied">
          <div className="seat-name">
            {player.name}
            {player.isAdmin && <span className="admin-badge">ADMIN</span>}
          </div>
          <div className="seat-stack">
            {formatMoney
              ? formatMoney(player.money)
              : `$${player.money.toLocaleString()}`}
          </div>
        </div>
      ) : (
        <button
          className="seat-card open seat-clickable"
          onClick={() => onOpenSeat?.(index)}
          type="button"
          title={`Join seat ${index + 1}`}
          aria-label={`Join seat ${index + 1}`}
        >
          <div className="seat-open">Open Seat</div>
        </button>
      )}
    </div>
  );
}
