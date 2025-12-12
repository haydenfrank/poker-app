// File: src/screens/AdminScreen.tsx (new)
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

interface Props {
  roomId: string;
  adminId: string;
}
type PlayerRow = {
  id: string;
  name: string;
  seat: number;
  money: number;
  room_id: string;
};

export default function AdminScreen({ roomId, adminId }: Props) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureAdmin() {
    const { data } = await supabase
      .from("players")
      .select("is_admin")
      .eq("id", adminId)
      .eq("room_id", roomId)
      .single();
    if (!data || !(data as any).is_admin) {
      navigate(`/player/${roomId}/${adminId}`, { replace: true });
      return false;
    }
    return true;
  }

  async function loadPlayers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("players")
      .select("id,name,seat,money,room_id")
      .eq("room_id", roomId)
      .order("seat", { ascending: true });
    if (error) {
      setError("Failed to load players.");
    } else {
      setPlayers((data ?? []) as PlayerRow[]);
      setEdits({});
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await ensureAdmin();
      if (!ok) return;
      if (mounted) await loadPlayers();
    })();

    const ch = supabase
      .channel(`room:${roomId}:admin`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload: any) => {
          const room = payload.new?.room_id ?? payload.old?.room_id;
          if (room === roomId) loadPlayers();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId, adminId]);

  const handleMoneyChange = (id: string, value: string) => {
    const n = Math.max(0, Math.floor(Number(value)));
    setEdits((prev) => ({ ...prev, [id]: Number.isFinite(n) ? n : 0 }));
  };

  async function saveOne(id: string) {
    const money = edits[id];
    if (money == null) return;
    setSavingId(id);
    await supabase
      .from("players")
      .update({ money })
      .eq("id", id)
      .eq("room_id", roomId);
    setSavingId(null);
    setEdits((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }

  async function saveAll(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ids = Object.keys(edits);
    for (const id of ids) {
      const money = edits[id];
      await supabase
        .from("players")
        .update({ money })
        .eq("id", id)
        .eq("room_id", roomId);
    }
    setEdits({});
  }

  const hasEdits = useMemo(() => Object.keys(edits).length > 0, [edits]);

  if (loading) return <p>Loading admin tools…</p>;
  if (error)
    return (
      <div>
        <p>{error}</p>
        <button onClick={() => navigate(`/player/${roomId}/${adminId}`)}>
          Back
        </button>
      </div>
    );

  return (
    <div style={{ maxWidth: 640, width: "100%" }}>
      <h2>Admin Panel</h2>
      <p style={{ color: "#9aa4b2", marginTop: -6, marginBottom: 12 }}>
        Room: {roomId}
      </p>

      <form onSubmit={saveAll} style={{ display: "grid", gap: "0.5rem" }}>
        {players.map((p) => {
          const current = edits[p.id] ?? p.money;
          const dirty = edits[p.id] !== undefined && edits[p.id] !== p.money;
          return (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 120px 100px",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#9aa4b2", fontSize: 12 }}>
                  Seat {p.seat + 1}
                </div>
              </div>
              <div style={{ color: "#9aa4b2", textAlign: "right" }}>
                Current: {p.money}
              </div>
              <input
                type="number"
                min={0}
                value={current}
                onChange={(e) => handleMoneyChange(p.id, e.target.value)}
                style={{
                  padding: "0.4rem 0.5rem",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "white",
                }}
              />
              <button
                type="button"
                onClick={() => saveOne(p.id)}
                disabled={!dirty || savingId === p.id}
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  background: dirty ? "#22c55e" : "#374151",
                  color: dirty ? "#08110a" : "#9aa4b2",
                  fontWeight: 700,
                }}
              >
                {savingId === p.id ? "Saving…" : "Save"}
              </button>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: 8 }}>
          <button
            type="submit"
            disabled={!hasEdits}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: 8,
              background: hasEdits ? "#22c55e" : "#374151",
              color: hasEdits ? "#08110a" : "#9aa4b2",
              fontWeight: 800,
            }}
          >
            Save All
          </button>
          <button
            type="button"
            onClick={() => navigate(`/player/${roomId}/${adminId}`)}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: 8,
              background: "#fbbf24",
              color: "#111827",
              fontWeight: 800,
            }}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
