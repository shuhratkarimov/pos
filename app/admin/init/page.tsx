"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function AdminInitPage() {
  const [key, setKey] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const checkKey = async () => {
    const res = await fetch(`${API_URL}/auth/check-init-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (res.ok) setAccessGranted(true);
    else alert("Invalid key");
  };

  const createAdmin = async () => {
    const res = await fetch(`${API_URL}/auth/init-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    alert(data.message);
  };

  if (!accessGranted) {
    return (
      <div>
        <h1>Enter secret key to access admin registration</h1>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button onClick={checkKey}>Submit</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Register Admin</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={createAdmin}>Create Admin</button>
    </div>
  );
}
