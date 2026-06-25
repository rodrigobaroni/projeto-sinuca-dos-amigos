import React from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import { App } from "./App.jsx";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const SUPABASE_URL = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON = cleanEnv(import.meta.env.VITE_SUPABASE_ANON);

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
