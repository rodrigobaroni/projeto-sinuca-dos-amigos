import { useState } from "react";
import { finishMatchPatch, matchPlayerIds, sideLabel } from "../domain/match.js";

// "Definir vencedor" usado tanto no painel de partida simples quanto (com a
// flag finishFromPanel) no card da lista de partidas ao vivo. Com a flag
// ligada, isso tambem finaliza um 1x1 com anotacao de bolas ativa sem passar
// pelo fluxo de bola de castigo (finishWithPenalty) - e intencional, um
// override administrativo direto para quem quer resolver tudo pelo painel.
export function FinishMatchButton({ match, playerName, persistMatch, auditLog, adminUser, showToast, onFinished, buttonClassName }) {
  const [selectingWinner, setSelectingWinner] = useState(false);
  // Trava anti-duplo-clique local - nao resolve dois admins decidindo
  // vencedores opostos em dispositivos diferentes, so evita que o mesmo toque
  // grave a partida duas vezes.
  const [finishing, setFinishing] = useState(false);

  const finish = async (side) => {
    if (finishing) return;
    setFinishing(true);
    try {
      const ok = await persistMatch(match.id, finishMatchPatch(match, side));
      // persistMatch ja mostrou o toast de erro e recarregou o estado; sem o
      // sinal de sucesso a gente daria a partida como resolvida mesmo com a
      // escrita tendo falhado no Supabase.
      if (!ok) return;
      const winnerLabel = sideLabel(match, side, playerName);
      const sideLeadId = side === "a" ? match.player_a : match.player_b;
      await auditLog?.({
        action: "match_finished",
        entityType: "match",
        entityId: match.id,
        message: `${adminUser?.email || "admin"} definiu ${winnerLabel} como vencedor da partida ${sideLabel(match, "a", playerName)} x ${sideLabel(match, "b", playerName)}`,
        metadata: { match, winnerSide: side, winnerName: winnerLabel, players: matchPlayerIds(match).map(playerName) },
      });
      onFinished?.(sideLeadId);
      setSelectingWinner(false);
      showToast(`Vitória de ${winnerLabel} registrada`);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="finish-match-slot" onClick={(event) => event.stopPropagation()}>
      <button type="button" className={buttonClassName} onClick={() => setSelectingWinner(true)}>Definir vencedor</button>

      {selectingWinner && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem venceu?</div>
            <div className="define-actions">
              <button className="btn chalk" disabled={finishing} onClick={() => finish("a")}>{sideLabel(match, "a", playerName)}</button>
              <button className="btn chalk" disabled={finishing} onClick={() => finish("b")}>{sideLabel(match, "b", playerName)}</button>
            </div>
            <button className="btn ghost small" onClick={() => setSelectingWinner(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
