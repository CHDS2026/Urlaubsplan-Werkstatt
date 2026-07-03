import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Theme früh anwenden, damit kein Flackern entsteht
try {
  const saved = localStorage.getItem("up-theme");
  if (saved === "dark") document.documentElement.classList.add("dark");
} catch (e) { /* ignore */ }

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
