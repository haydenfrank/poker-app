// File: src/screens/TableScreen.tsx (update to fetch is_admin and pass through)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import PokerTable from "../components/PokerTable";
import type { Player } from "../types";

type DBPlayer = {
  id: string;
  room_id: string;
  seat: number;
  name: string;
  money: number;
  is_admin: boolean;
};

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface Props {
  roomId: string;
}

export default function TableScreen({ roomId }: Props) {
  const [seats, setSeats] = useState<(Player | null)[]>(() =>
    Array.from({ length: 10 }, () => null)
  );

  async function load() {
    const { data, error } = await supabase
      .from("players")
      .select("id,room_id,seat,name,money,is_admin")
      .eq("room_id", roomId);
    if (error) return console.error(error);
    const next: (Player | null)[] = Array.from({ length: 10 }, () => null);
    data!.forEach((row: DBPlayer) => {
      if (row.seat >= 0 && row.seat < 10) {
        next[row.seat] = {
          id: row.id,
          name: row.name,
          money: row.money,
          isAdmin: row.is_admin,
        };
      }
    });
    setSeats(next);
  }
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const formatMoney = useMemo(() => (n: number) => currency.format(n), []);

  return <PokerTable seats={seats} formatMoney={formatMoney} />;
}
