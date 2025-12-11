// File: src/components/Seat.tsx (update to show ADMIN badge)
import type { Player } from "../types";

interface SeatProps {
  index: number;
  total: number;
  player: Player | null;
  formatMoney?: (n: number) => string;
}
export default function Seat({ index, total, player, formatMoney }: SeatProps) {
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
      <div className={`seat-card ${player ? "occupied" : "open"}`}>
        {player ? (
          <>
            <div className="seat-name">
              {player.name}
              {player.isAdmin && <span className="admin-badge">ADMIN</span>}
            </div>
            <div className="seat-stack">
              {formatMoney
                ? formatMoney(player.money)
                : `$${player.money.toLocaleString()}`}
            </div>
          </>
        ) : (
          <div className="seat-open">Open Seat</div>
        )}
      </div>
    </div>
  );
}
