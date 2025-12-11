// src/storage.ts
export const playerKey = (roomId: string) => `poker:${roomId}:playerId`;
export const savePlayerId = (roomId: string, id: string) =>
  localStorage.setItem(playerKey(roomId), id);
export const getPlayerId = (roomId: string) =>
  localStorage.getItem(playerKey(roomId));
export const clearPlayerId = (roomId: string) =>
  localStorage.removeItem(playerKey(roomId));
