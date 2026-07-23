export function createRepository(sb) {
  return {
    async loadScoreboard() {
      const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
        sb.from("players").select("*").order("name"),
        sb.from("matches").select("*").order("played_at", { ascending: true }),
      ]);
      if (playersError || matchesError) throw playersError || matchesError;
      const { data: clips, error: clipsError } = await sb
        .from("match_clips")
        .select("*")
        .order("created_at", { ascending: false });
      const safeClips = clipsError ? [] : clips || [];
      return {
        players: players || [],
        matches: matches || [],
        clips: safeClips.map((clip) => ({
          ...clip,
          public_url: this.getClipPublicUrl(clip.storage_path),
        })),
      };
    },

    getClipPublicUrl(storagePath) {
      if (!storagePath) return "";
      const { data } = sb.storage.from("match-clips").getPublicUrl(storagePath);
      return data.publicUrl;
    },

    async listAuditLogs(limit = 100) {
      const { data, error } = await sb
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async createAuditLog(entry) {
      const { data, error } = await sb.from("audit_logs").insert(entry).select().single();
      if (error) throw error;
      return data;
    },

    async addPlayer(name) {
      const { data, error } = await sb.from("players").insert({ name }).select().single();
      if (error) throw error;
      return data;
    },

    async updatePlayer(id, patch) {
      const { data, error } = await sb.from("players").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },

    async startMatch(match) {
      const { data, error } = await sb.from("matches").insert(match).select().single();
      if (error) throw error;
      return data;
    },

    async updateMatch(id, patch) {
      const { error } = await sb.from("matches").update(patch).eq("id", id);
      if (error) throw error;
    },

    async deleteMatch(id) {
      const { error } = await sb.from("matches").delete().eq("id", id);
      if (error) throw error;
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    async signOut() {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
    },

    async getSession() {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    onAuthStateChange(callback) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session));
      return () => data.subscription.unsubscribe();
    },

    onMatchesChange(callback) {
      const channel = sb
        .channel("matches-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, callback)
        .subscribe();
      return () => sb.removeChannel(channel);
    },
  };
}
