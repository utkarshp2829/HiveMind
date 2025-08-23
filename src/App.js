import React, { useState } from "react";
import HiveMindDashboard from "./HiveMindDashboard";
import Login from "./Login"; // Fancy login component
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);

  // Render login if user not logged in
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Once logged in, render dashboard
  return <HiveMindDashboard user={user} />;
}
