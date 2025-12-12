// File: src/screens/JoinScreen.tsx (uses roomId from prop, same as before)
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
  const initialSeat = initialSeatParam
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
        if (data && !error)
          navigate(`/player/${roomId}/${saved}`, { replace: true });
        else clearPlayerId(roomId);
      });
  }, [roomId, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function loadSeats() {
      const { data } = await supabase
        .from("players")
        .select("seat")
        .eq("room_id", roomId);
      const occ = new Set<number>(data?.map((r: any) => r.seat) ?? []);
      if (!cancelled) setOccupied(occ);
    }
    loadSeats();
    const channel = supabase
      .channel(`room:${roomId}:seats`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        loadSeats
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

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
      setStatus(
        (insErr as any).code === "23505"
          ? "Seat already taken. Please choose another."
          : "Join failed."
      );
      setLoading(false);
      return;
    }

    savePlayerId(roomId, inserted!.id);
    setLoading(false);
    navigate(`/player/${roomId}/${inserted!.id}`);
  }

  return (
    <div style={{ maxWidth: 520, width: "100%" }}>
      <h2>Join the Table ({roomId})</h2>
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
        />
        <input
          type="number"
          min={0}
          placeholder="Starting money"
          value={money}
          onChange={(e) => setMoney(Number(e.target.value))}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />{" "}
          Join as admin
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Joining…" : "Join"}
        </button>
      </form>
    </div>
  );
}
