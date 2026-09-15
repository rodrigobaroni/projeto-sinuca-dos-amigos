import { DEFAULT_SETTINGS, normalizeGameSettings } from "../domain/rules.js";

export const GAME_SETTINGS_KEY = "sinuca-game-settings";

export function loadGameSettings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(GAME_SETTINGS_KEY) || "null");
    return normalizeGameSettings({ ...DEFAULT_SETTINGS, ...(stored || {}) });
  } catch {
    return normalizeGameSettings(DEFAULT_SETTINGS);
  }
}
