// src/screens/TableScreen.tsx (add broadcast listener)
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

  const toPlayer = (r: DBPlayer): Player => ({
    id: r.id,
    name: r.name,
    money: r.money,
    isAdmin: r.is_admin,
  });

  async function loadAll() {
    const { data } = await supabase
      .from("players")
      .select("id,room_id,seat,name,money,is_admin")
      .eq("room_id", roomId);
    const next = Array.from({ length: 10 }, () => null) as (Player | null)[];
    data?.forEach((r: DBPlayer) => {
      if (r.seat >= 0 && r.seat < 10) next[r.seat] = toPlayer(r);
    });
    setSeats(next);
  }

  useEffect(() => {
    loadAll();

    const changes = supabase
      .channel(`room:${roomId}:players`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload: any) => {
          const evt = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const newRow = payload.new as DBPlayer | null;
          const oldRow = payload.old as DBPlayer | null;
          const room = newRow?.room_id ?? oldRow?.room_id;
          if (room !== roomId) return;

          setSeats((prev) => {
            const next = [...prev];
            if (
              evt === "INSERT" &&
              newRow &&
              newRow.seat >= 0 &&
              newRow.seat < 10
            )
              next[newRow.seat] = toPlayer(newRow);
            else if (evt === "UPDATE" && newRow) {
              // clear old seat if moved
              const oldSeat = prev.findIndex((p) => p?.id === newRow.id);
              if (oldSeat !== -1 && oldSeat !== newRow.seat)
                next[oldSeat] = null;
              if (newRow.seat >= 0 && newRow.seat < 10)
                next[newRow.seat] = toPlayer(newRow);
            } else if (evt === "DELETE" && oldRow) {
              const seat = prev.findIndex((p) => p?.id === oldRow.id);
              if (seat !== -1) next[seat] = null;
              else queueMicrotask(loadAll);
            }
            return next;
          });
        }
      )
      .subscribe();

    const bc = supabase
      .channel(`room:${roomId}:bc`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "player_left" }, ({ payload }: any) => {
        const id = payload?.id as string | undefined;
        if (!id) return;
        setSeats((prev) => {
          const next = [...prev];
          const seat = prev.findIndex((p) => p?.id === id);
          if (seat !== -1) next[seat] = null;
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
      supabase.removeChannel(bc);
    };
  }, [roomId]);

  const formatMoney = useMemo(() => (n: number) => currency.format(n), []);
  return <PokerTable seats={seats} formatMoney={formatMoney} />;
}
