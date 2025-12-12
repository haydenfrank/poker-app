// File: src/screens/AdminScreen.tsx
import { useEffect, useState } from "react";
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
  is_dealer: boolean;
  is_admin: boolean;
};

export default function AdminScreen({ roomId, adminId }: Props) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureAdmin() {
    const { data, error } = await supabase
      .from("players")
      .select("is_admin")
      .eq("id", adminId)
      .eq("room_id", roomId)
      .single();
    if (error || !data || !(data as any).is_admin) {
      navigate(`/player/${roomId}/${adminId}`, { replace: true });
      return false;
    }
    return true;
  }

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("id,name,seat,money,room_id,is_dealer,is_admin")
      .eq("room_id", roomId)
      .order("seat", { ascending: true });
    if (error) {
      setError("Failed to load players.");
      return;
    }
    setPlayers((data ?? []) as PlayerRow[]);
    setEdits({});
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await ensureAdmin();
      if (!ok) return;
      await loadPlayers();
      if (mounted) setLoading(false);
    })();

    // Listen for any player changes (refresh list)
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

    // Also listen to THIS admin's own row; if they lose admin or get deleted, kick out of admin panel
    const chSelf = supabase
      .channel(`room:${roomId}:admin-self:${adminId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${adminId}`,
        },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            navigate(`/player/${roomId}/${adminId}`, { replace: true });
            return;
          }
          const isAdminNow = payload.new?.is_admin;
          if (isAdminNow === false) {
            navigate(`/player/${roomId}/${adminId}`, { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      supabase.removeChannel(chSelf);
    };
  }, [roomId, adminId, navigate]);

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

  async function makeDealer(id: string) {
    await supabase
      .from("players")
      .update({ is_dealer: false })
      .eq("room_id", roomId);
    await supabase
      .from("players")
      .update({ is_dealer: true })
      .eq("id", id)
      .eq("room_id", roomId);

    const bc = supabase.channel(`room:${roomId}:bc`, {
      config: { broadcast: { self: true } },
    });
    await bc.subscribe();
    await bc.send({ type: "broadcast", event: "dealer_set", payload: { id } });
    supabase.removeChannel(bc);

    loadPlayers();
  }

  async function makeSoleAdmin(id: string) {
    // Demote everyone, then promote the selected player to be the single admin
    await supabase
      .from("players")
      .update({ is_admin: false })
      .eq("room_id", roomId);
    const { error } = await supabase
      .from("players")
      .update({ is_admin: true })
      .eq("id", id)
      .eq("room_id", roomId);

    // Handle rare race: re-apply demotion + promotion
    if (error && (error as any).code === "23505") {
      await supabase
        .from("players")
        .update({ is_admin: false })
        .eq("room_id", roomId);
      await supabase
        .from("players")
        .update({ is_admin: true })
        .eq("id", id)
        .eq("room_id", roomId);
    }

    // If the current viewer just gave admin to someone else, immediately leave Admin panel
    if (id !== adminId) {
      navigate(`/player/${roomId}/${adminId}`, { replace: true });
      return;
    }

    loadPlayers();
  }

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

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {players.map((p) => {
          const current = edits[p.id] ?? p.money;
          const dirty = edits[p.id] !== undefined && edits[p.id] !== p.money;
          return (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 140px 100px 120px 120px",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {/* Name area with badges stacked vertically to the right */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "start",
                  columnGap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: "#9aa4b2", fontSize: 12 }}>
                    Seat {p.seat + 1}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {p.is_admin && <span className="badge admin">ADMIN</span>}
                  {p.is_dealer && <span className="badge dealer">DEALER</span>}
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

              <button
                type="button"
                onClick={() => makeDealer(p.id)}
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  background: p.is_dealer ? "#9ca3af" : "#2563eb",
                  color: "#111827",
                  fontWeight: 800,
                }}
                title="Make this player the dealer"
              >
                {p.is_dealer ? "Dealer" : "Make Dealer"}
              </button>

              <button
                type="button"
                onClick={() => makeSoleAdmin(p.id)}
                style={{
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  background: p.is_admin ? "#fbbf24" : "#0ea5e9",
                  color: "#111827",
                  fontWeight: 800,
                }}
                title="Make this player the sole admin"
              >
                {p.is_admin ? "Admin" : "Make Admin"}
              </button>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: 8 }}>
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
      </div>
    </div>
  );
}
