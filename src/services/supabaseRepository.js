export function createRepository(sb) {
  return {
    async loadScoreboard() {
      const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
        sb.from("players").select("*").order("name"),
        sb.from("matches").select("*").order("played_at", { ascending: true }),
      ]);
      if (playersError || matchesError) throw playersError || matchesError;
      return { players: players || [], matches: matches || [] };
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
      const { error } = await sb.from("matches").insert(match);
      if (error) throw error;
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
  };
}
