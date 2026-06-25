export function hashColor(str = "?") {
  let h = 0;
  for (const char of str) h = (h * 31 + char.charCodeAt(0)) & 0xffffff;
  return `hsl(${h % 360} 55% 42%)`;
}

export function initials(name = "?") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
