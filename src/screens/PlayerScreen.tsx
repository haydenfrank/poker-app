// File: src/screens/PlayerScreen.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { clearPlayerId } from "../storage";

interface Props {
  roomId: string;
}
type Row = {
  id: string;
  name: string;
  seat: number;
  money: number;
  room_id: string;
  is_admin: boolean;
};

export default function PlayerScreen({ roomId }: Props) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("id,name,seat,money,room_id,is_admin")
        .eq("id", playerId)
        .eq("room_id", roomId)
        .single();
      if (!cancelled) {
        if (error || !data) {
          clearPlayerId(roomId);
          navigate("/join", { replace: true });
        } else {
          setPlayer(data as Row);
        }
        setLoading(false);
      }
    }
    if (playerId) load();
    return () => {
      cancelled = true;
    };
  }, [playerId, roomId, navigate]);

  async function leaveTable() {
    if (!playerId) return;
    setLeaving(true);
    await supabase
      .from("players")
      .delete()
      .eq("id", playerId)
      .eq("room_id", roomId);
    clearPlayerId(roomId);
    setLeaving(false);
    navigate("/join", { replace: true });
  }

  if (loading) return <p>Loading your seat…</p>;

  return (
    <div style={{ maxWidth: 520, width: "100%" }}>
      <h2>
        Your Seat{" "}
        {player?.is_admin && (
          <span
            style={{
              marginLeft: 8,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#fbbf24",
              color: "#111827",
              fontWeight: 700,
            }}
          >
            ADMIN
          </span>
        )}
      </h2>
      <div style={{ marginBottom: 12 }}>
        <div>Name: {player?.name}</div>
        <div>Seat: {player ? player.seat + 1 : "—"}</div>
        <div>Money: {player?.money}</div>
      </div>
      <button
        onClick={leaveTable}
        disabled={leaving}
        style={{
          padding: "0.6rem 0.9rem",
          borderRadius: 8,
          background: "#ef4444",
          color: "white",
          fontWeight: 700,
        }}
      >
        {leaving ? "Leaving…" : "Leave Table"}
      </button>
      <p style={{ marginTop: 16 }}>
        <Link to="/">View Main Table</Link>
      </p>
    </div>
  );
}
