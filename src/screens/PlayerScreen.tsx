// File: src/screens/PlayerScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  is_dealer: boolean;
};

export default function PlayerScreen({ roomId, playerId }: Props) {
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("players")
      .select("id,name,seat,money,room_id,is_admin,is_dealer")
      .eq("id", playerId)
      .eq("room_id", roomId)
      .maybeSingle();

    if (!data) {
      clearPlayerId(roomId);
      navigate("/", { replace: true });
      return;
    }
    setPlayer(data as Row);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!cancelled) await load();
    })();

    // Reload when THIS player's row changes (admin/dealer status or deletion)
    const ch = supabase
      .channel(`player:${playerId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        async (payload: any) => {
          if (payload.eventType === "DELETE") {
            clearPlayerId(roomId);
            navigate("/", { replace: true });
          } else {
            await load();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [roomId, playerId, navigate]);

  async function leaveTable() {
    const ok = window.confirm("Are you sure you want to leave the table?");
    if (!ok) return;

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
    supabase.removeChannel(bc);

    clearPlayerId(roomId);
    setLeaving(false);
    navigate("/", { replace: true });
  }

  if (loading) return <p>Loading your seat…</p>;

  return (
    <div style={{ maxWidth: 520, width: "100%" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Your Seat
        {player?.is_admin && (
          <span
            style={{
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
        {player?.is_dealer && (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: "#9ca3af",
              color: "#111827",
              fontWeight: 800,
            }}
          >
            DEALER
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
    </div>
  );
}
