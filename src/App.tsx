// File: src/App.tsx (add Admin route)
import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import "./styles.css";
import TableScreen from "./screens/TableScreen";
import JoinScreen from "./screens/JoinScreen";
import PlayerScreen from "./screens/PlayerScreen";
import LobbyScreen from "./screens/LobbyScreen";
import AllTablesScreen from "./screens/AllTablesScreen";
import AdminScreen from "./screens/AdminScreen";

function TableRoute() {
  const { roomId } = useParams();
  return <TableScreen roomId={roomId!} />;
}
function JoinRoute() {
  const { roomId } = useParams();
  return <JoinScreen roomId={roomId!} />;
}
function PlayerRoute() {
  const { roomId, playerId } = useParams();
  return <PlayerScreen roomId={roomId!} playerId={playerId!} />;
}
function AdminRoute() {
  const { roomId, playerId } = useParams();
  return <AdminScreen roomId={roomId!} adminId={playerId!} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <h1 className="title">Poker Tables</h1>
        <Routes>
          <Route path="/" element={<LobbyScreen />} />
          <Route path="/tables" element={<AllTablesScreen />} />
          <Route path="/table/:roomId" element={<TableRoute />} />
          <Route path="/join/:roomId" element={<JoinRoute />} />
          <Route path="/player/:roomId/:playerId" element={<PlayerRoute />} />
          <Route path="/admin/:roomId/:playerId" element={<AdminRoute />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
