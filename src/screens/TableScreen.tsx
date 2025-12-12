// File: src/screens/TableScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  is_dealer: boolean;
};

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface Props {
  roomId: string;
  showHomeButton?: boolean;
}

export default function TableScreen({ roomId, showHomeButton = true }: Props) {
  const [seats, setSeats] = useState<(Player | null)[]>(() =>
    Array.from({ length: 10 }, () => null)
  );
  const [dealerSeat, setDealerSeat] = useState<number | null>(null);
  const navigate = useNavigate();

  const toPlayer = (r: DBPlayer): Player => ({
    id: r.id,
    name: r.name,
    money: r.money,
    isAdmin: r.is_admin,
    isDealer: r.is_dealer,
  });

  function recomputeDealer(next: (Player | null)[]) {
    const idx = next.findIndex((p) => !!p?.isDealer);
    setDealerSeat(idx >= 0 ? idx : null);
  }

  async function loadAll() {
    const { data } = await supabase
      .from("players")
      .select("id,room_id,seat,name,money,is_admin,is_dealer")
      .eq("room_id", roomId);
    const next = Array.from({ length: 10 }, () => null) as (Player | null)[];
    data?.forEach((r: DBPlayer) => {
      if (r.seat >= 0 && r.seat < 10) next[r.seat] = toPlayer(r);
    });
    setSeats(next);
    recomputeDealer(next);
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
            if (evt === "INSERT" && newRow) {
              if (newRow.seat >= 0 && newRow.seat < 10)
                next[newRow.seat] = toPlayer(newRow);
            } else if (evt === "UPDATE" && newRow) {
              const oldSeat = prev.findIndex((p) => p?.id === newRow.id);
              if (oldSeat !== -1 && oldSeat !== newRow.seat)
                next[oldSeat] = null;
              if (newRow.seat >= 0 && newRow.seat < 10)
                next[newRow.seat] = toPlayer(newRow);
            } else if (evt === "DELETE" && oldRow) {
              const seat = prev.findIndex((p) => p?.id === oldRow.id);
              if (seat !== -1) next[seat] = null;
            }
            // Always recompute dealer from current seats after any change
            setTimeout(() => recomputeDealer(next), 0);
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
          setTimeout(() => recomputeDealer(next), 0);
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
  const onOpenSeat = (i: number) => navigate(`/join/${roomId}?seat=${i}`);

  return (
    <>
      {showHomeButton && (
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
        >
          Home
        </button>
      )}
      <PokerTable
        seats={seats}
        formatMoney={formatMoney}
        onOpenSeat={onOpenSeat}
        dealerSeat={dealerSeat ?? undefined}
      />
    </>
  );
}
