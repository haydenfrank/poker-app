// File: src/types.ts (add isDealer to Player)
export interface Player {
  id: string;
  name: string;
  money: number;
  isAdmin?: boolean;
  isDealer?: boolean;
}
