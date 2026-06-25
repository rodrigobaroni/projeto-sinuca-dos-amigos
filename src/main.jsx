import React from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import { App } from "./App.jsx";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://jxamljlenizxqijsaale.supabase.co";
const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YW1samxlbml6eHFpanNhYWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjY5ODQsImV4cCI6MjA5NzgwMjk4NH0.VxntkwQAbRP8pSa0pK3FFfdfwXx93y1gxxRHdPgOnj8";

const hasSupabaseConfig =
  /^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL) &&
  SUPABASE_ANON &&
  !SUPABASE_ANON.includes("COLE_AQUI");

const supabaseClient = hasSupabaseConfig ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App supabaseClient={supabaseClient} />
  </React.StrictMode>,
);
