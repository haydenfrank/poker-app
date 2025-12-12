// File: src/screens/AllTablesScreen.tsx (show multiple games at once)
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import TableScreen from "./TableScreen";

type Room = { room_id: string; name: string | null };

export default function AllTablesScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);

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

  // src/screens/AllTablesScreen.tsx (adjust the card wrapper style)
  // src/screens/AllTablesScreen.tsx
  return (
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
          <TableScreen roomId={r.room_id} />
        </div>
      ))}
    </div>
  );
}
