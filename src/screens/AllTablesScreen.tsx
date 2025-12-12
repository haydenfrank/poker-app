// File: src/screens/AllTablesScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import TableScreen from "./TableScreen";

type Room = { room_id: string; name: string | null };

export default function AllTablesScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadRooms() {
      const { data } = await supabase
        .from("rooms")
        .select("room_id,name")
        .order("created_at", { ascending: false });
      setRooms((data ?? []) as Room[]);
    }
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

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1000,
          padding: "0.45rem 0.75rem",
          borderRadius: 8,
          background: "#374151",
          color: "#e5e7eb",
          border: "none",
          fontWeight: 700,
        }}
        aria-label="Go to home"
        title="Home"
      >
        Home
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: "1rem",
          width: "100%",
        }}
      >
        {rooms.map((r) => (
          <div key={r.room_id} className="table-card">
            <div className="table-card-header">{r.name ?? r.room_id}</div>
            <TableScreen roomId={r.room_id} showHomeButton={false} />
          </div>
        ))}
      </div>
    </>
  );
}
