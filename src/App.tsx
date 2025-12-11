// File: src/App.tsx (update to add PlayerScreen route)
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./styles.css";
import TableScreen from "./screens/TableScreen";
import JoinScreen from "./screens/JoinScreen";
import PlayerScreen from "./screens/PlayerScreen";

export default function App() {
  const roomId = "default";
  return (
    <BrowserRouter>
      <div className="app-shell">
        <h1 className="title">Poker Table</h1>
        <Routes>
          <Route path="/" element={<TableScreen roomId={roomId} />} />
          <Route path="/join" element={<JoinScreen roomId={roomId} />} />
          <Route
            path="/player/:playerId"
            element={<PlayerScreen roomId={roomId} />}
          />
        </Routes>
        <p className="subtitle">Ask players to visit /join on their device.</p>
        <p>
          <Link to="/join">Open Join Page</Link>
        </p>
      </div>
    </BrowserRouter>
  );
}
