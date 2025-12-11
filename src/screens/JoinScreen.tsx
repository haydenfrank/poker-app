// File: src/screens/JoinScreen.tsx (preselect seat from ?seat=)
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";
import { getPlayerId, savePlayerId, clearPlayerId } from "../storage";

interface Props {
  roomId: string;
}

export default function JoinScreen({ roomId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSeatParam = searchParams.get("seat");
  const initialSeat =
    initialSeatParam !== null
      ? (() => {
          const n = Number(initialSeatParam);
          return Number.isFinite(n) && n >= 0 && n < 10 ? n : null;
        })()
      : null;

  const [name, setName] = useState("");
  const [money, setMoney] = useState(1000);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [occupied, setOccupied] = useState<Set<number>>(new Set());
  const [selectedSeat, setSelectedSeat] = useState<number | null>(initialSeat);
  const [isAdmin, setIsAdmin] = useState(false);

  const seatNumbers = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i),
    []
  );

  // Auto-resume if a saved player still exists
  useEffect(() => {
    const saved = getPlayerId(roomId);
    if (!saved) return;
    supabase
      .from("players")
      .select("id")
      .eq("id", saved)
      .eq("room_id", roomId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) navigate(`/player/${saved}`, { replace: true });
        else clearPlayerId(roomId);
      });
  }, [roomId, navigate]);

  // Load and watch seat occupancy
  useEffect(() => {
    let cancelled = false;
    async function loadSeats() {
      const { data, error } = await supabase
        .from("players")
        .select("seat")
        .eq("room_id", roomId);
      if (error) return;
      const occ = new Set<number>(data!.map((r: any) => r.seat));
      if (!cancelled) setOccupied(occ);
    }
    loadSeats();
    const channel = supabase
      .channel(`room:${roomId}:seats`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => loadSeats()
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // If the preselected seat becomes occupied, clear selection
  useEffect(() => {
    setSelectedSeat((prev) =>
      prev != null && occupied.has(prev) ? null : prev
    );
  }, [occupied]);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!name.trim()) return setStatus("Please enter a name.");
    if (selectedSeat === null) return setStatus("Pick a seat.");
    if (occupied.has(selectedSeat))
      return setStatus("That seat was just taken. Pick another.");
    setLoading(true);

    const { data: inserted, error: insErr } = await supabase
      .from("players")
      .insert({
        room_id: roomId,
        seat: selectedSeat,
        name: name.trim(),
        money: Math.max(0, Math.floor(money)),
        is_admin: isAdmin,
      })
      .select()
      .single();

    if (insErr) {
      if ((insErr as any).code === "23505")
        setStatus("Seat already taken. Please choose another.");
      else setStatus("Join failed.");
      setLoading(false);
      return;
    }

    savePlayerId(roomId, inserted!.id);
    setLoading(false);
    navigate(`/player/${inserted!.id}`);
  }

  return (
    <div style={{ maxWidth: 520, width: "100%" }}>
      <h2>Join the Table</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "0.5rem",
          margin: "0.75rem 0 1rem",
        }}
      >
        {seatNumbers.map((s) => {
          const isOccupied = occupied.has(s);
          const isSelected = selectedSeat === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => !isOccupied && setSelectedSeat(s)}
              disabled={isOccupied}
              style={{
                padding: "0.6rem",
                borderRadius: 8,
                border: "1px solid #374151",
                cursor: isOccupied ? "not-allowed" : "pointer",
                background: isOccupied
                  ? "#111827"
                  : isSelected
                  ? "#22c55e"
                  : "#0b1220",
                color: isSelected ? "#08110a" : "#e5e7eb",
                fontWeight: isSelected ? 700 : 500,
              }}
              title={isOccupied ? "Occupied" : "Available"}
            >
              Seat {s + 1}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleJoin} style={{ display: "grid", gap: "0.75rem" }}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "0.6rem",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#0b1220",
            color: "white",
          }}
        />
        <input
          type="number"
          min={0}
          placeholder="Starting money"
          value={money}
          onChange={(e) => setMoney(Number(e.target.value))}
          style={{
            padding: "0.6rem",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#0b1220",
            color: "white",
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#e5e7eb",
          }}
        >
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Join as admin
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.6rem",
            borderRadius: 8,
            background: "#22c55e",
            color: "#08110a",
            fontWeight: 700,
          }}
        >
          {loading ? "Joining…" : "Join"}
        </button>
      </form>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
