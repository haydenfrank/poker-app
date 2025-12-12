// File: src/screens/LobbyScreen.tsx
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

type Room = { room_id: string; name: string | null };

export default function LobbyScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("room_id,name")
      .order("created_at", { ascending: false });
    setRooms((data ?? []) as Room[]);
  }

  useEffect(() => {
    loadRooms();
    const ch = supabase
      .channel("rooms:list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        loadRooms
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    const room_id = crypto.randomUUID().slice(0, 8);
    await supabase.from("rooms").insert({ room_id, name: name.trim() || null });
    setCreating(false);
    setName("");
    navigate(`/table/${room_id}`);
  }

  async function deleteRoom(roomId: string) {
    if (
      !confirm("Delete this table? This will remove all players seated in it.")
    )
      return;
    setDeleting(roomId);
    // Remove players in the room, then the room
    await supabase.from("players").delete().eq("room_id", roomId);
    await supabase.from("rooms").delete().eq("room_id", roomId);
    setDeleting(null);
    // rooms list auto-refreshes via realtime subscription
  }

  return (
    <div style={{ maxWidth: 720, width: "100%" }}>
      <h2>Lobby</h2>
      <form
        onSubmit={createRoom}
        style={{ display: "flex", gap: "0.5rem", marginBottom: 12 }}
      >
        <input
          placeholder="Room name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create Room"}
        </button>
        <Link to="/tables" style={{ marginLeft: "auto" }}>
          View All Tables
        </Link>
      </form>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rooms.map((r) => (
          <li
            key={r.room_id}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ flex: 1 }}>{r.name ?? r.room_id}</span>
            <Link to={`/table/${r.room_id}`}>Open Table</Link>
            <button
              onClick={() => deleteRoom(r.room_id)}
              disabled={deleting === r.room_id}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: 6,
                background: "#ef4444",
                color: "white",
                border: "none",
              }}
              title="Delete table"
            >
              {deleting === r.room_id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
