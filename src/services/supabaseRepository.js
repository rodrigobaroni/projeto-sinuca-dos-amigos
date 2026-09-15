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

    // Separado de loadScoreboard de propósito: loadScoreboard roda para todo
    // visitante e usa throw playersError || matchesError - uma query em
    // pool_tables ali derrubaria o ranking público inteiro num banco sem a
    // migração 20260915. Fila é feature de admin; não pode ser ponto único
    // de falha do app público. Por isso não lança: segue o precedente do
    // match_clips aqui em cima, que também vira lista vazia em erro.
    async loadQueue(gameDay) {
      const [{ data: tables, error: tablesError }, { data: attendance, error: attendanceError }] = await Promise.all([
        sb.from("pool_tables").select("*").order("sort_order", { ascending: true }),
        sb.from("attendance").select("*").eq("game_day", gameDay),
      ]);
      if (tablesError || attendanceError) return { tables: [], attendance: [], available: false };
      return { tables: tables || [], attendance: attendance || [], available: true };
    },

    // Primitivo único para chegou / voltou / perdeu-e-volta: upsert com
    // left_at: null sempre limpa "foi embora", e enqueued_at novo sempre
    // manda pro fim da fila - os três casos da spec caem nesse um caminho.
    // arrived_at fica FORA do payload de propósito: o PostgREST só atualiza
    // as colunas presentes, então no conflito o arrived_at original (a
    // chegada de fato) é preservado; só no insert novo o default do banco
    // (now()) entra em jogo.
    // enqueued_at é carimbado aqui no cliente porque não há como expressar
    // "set enqueued_at = now()" via PostgREST sem uma função RPC - custo
    // aceito e documentado junto do AUD-06 (relógios dessincronizados podem
    // inverter duas posições por alguns segundos).
    async enqueuePlayer({ gameDay, playerId }) {
      const { data, error } = await sb
        .from("attendance")
        .upsert(
          { game_day: gameDay, player_id: playerId, enqueued_at: new Date().toISOString(), left_at: null },
          { onConflict: "game_day,player_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async markDeparture({ gameDay, playerId }) {
      const { data, error } = await sb
        .from("attendance")
        .update({ left_at: new Date().toISOString() })
        .eq("game_day", gameDay)
        .eq("player_id", playerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async addPoolTable(name) {
      const { data, error } = await sb.from("pool_tables").insert({ name }).select().single();
      if (error) throw error;
      return data;
    },

    async updatePoolTable(id, patch) {
      const { data, error } = await sb.from("pool_tables").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },

    async deletePoolTable(id) {
      const { error } = await sb.from("pool_tables").delete().eq("id", id);
      if (error) throw error;
    },

    onPoolTablesChange(callback) {
      const channel = sb
        .channel("pool-tables-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "pool_tables" }, callback)
        .subscribe();
      return () => sb.removeChannel(channel);
    },

    // Filtro de game_day fica por conta de quem consome (ver useQueue): esse
    // canal só espelha o WAL, igual onMatchesChange - não sabe qual é "a
    // noite de hoje".
    onAttendanceChange(callback) {
      const channel = sb
        .channel("attendance-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, callback)
        .subscribe();
      return () => sb.removeChannel(channel);
    },
  };
}
