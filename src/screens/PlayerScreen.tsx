// File: src/screens/PlayerScreen.tsx (show Admin Panel button for admins)
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { clearPlayerId } from "../storage";

interface Props {
  roomId: string;
  playerId: string;
}
type Row = {
  id: string;
  name: string;
  seat: number;
  money: number;
  room_id: string;
  is_admin: boolean;
};

export default function PlayerScreen({ roomId, playerId }: Props) {
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("players")
        .select("id,name,seat,money,room_id,is_admin")
        .eq("id", playerId)
        .eq("room_id", roomId)
        .single();
      if (!cancelled) {
        if (!data) {
          clearPlayerId(roomId);
          navigate("/", { replace: true });
        } else {
          setPlayer(data as Row);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [playerId, roomId, navigate]);

  async function leaveTable() {
    setLeaving(true);
    await supabase
      .from("players")
      .delete()
      .eq("id", playerId)
      .eq("room_id", roomId);
    const bc = supabase.channel(`room:${roomId}:bc`, {
      config: { broadcast: { self: true } },
    });
    await bc.subscribe();
    await bc.send({
      type: "broadcast",
      event: "player_left",
      payload: { id: playerId },
    });
    clearPlayerId(roomId);
    setLeaving(false);
    navigate("/", { replace: true });
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

      {player?.is_admin && (
        <button
          onClick={() => navigate(`/admin/${roomId}/${playerId}`)}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: 8,
            background: "#fbbf24",
            color: "#111827",
            fontWeight: 800,
            marginRight: 8,
          }}
        >
          Admin Panel
        </button>
      )}

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
        <Link to={`/table/${roomId}`}>View Main Table</Link>
      </p>
    </div>
  );
}
