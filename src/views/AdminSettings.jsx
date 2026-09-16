import { useState } from "react";
import { PoolBall } from "../components/balls.jsx";
import { TablesAdmin } from "../components/TablesAdmin.jsx";
import { GAME_MODELS, getGameRules, KNOCKOUT_COLORS, normalizeGameSettings } from "../domain/rules.js";
import { GAME_SETTINGS_KEY } from "../services/gameSettingsStorage.js";

export function AdminSettings({ settings, onSettingsChange, adminUser, auditLog, showToast, queue, requestConfirm }) {
  const [choicePrompt, setChoicePrompt] = useState(null);
  const rules = getGameRules(settings);

  const saveSettings = (nextSettings, changedKey, changedValue) => {
    const next = normalizeGameSettings(nextSettings);
    onSettingsChange(next);
    window.localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(next));
    auditLog?.({
      action: "settings_updated",
      entityType: "settings",
      entityId: changedKey,
      message: `${adminUser?.email || "admin"} alterou ${settingLabel(changedKey)} para ${settingValueLabel(changedKey, changedValue)}`,
      metadata: { key: changedKey, value: changedValue, settings: next },
    });
    return next;
  };

  const updateSetting = (key, value) => {
    saveSettings({ ...settings, [key]: value }, key, value);
    showToast("Configuração salva");
  };
  const updateGameModel = (gameModel) => {
    const next = saveSettings({ ...settings, gameModel }, "gameModel", gameModel);
    const nextRules = getGameRules(next);
    if (nextRules.penaltyOptions.length > 1) {
      setChoicePrompt("penalty");
      showToast("Escolha a bola de castigo desse modo");
      return;
    }
    if (nextRules.colorOptions.length) {
      setChoicePrompt("color");
      showToast("Escolha as cores dos adversários");
      return;
    }
    setChoicePrompt(null);
    showToast("Configuração salva");
  };
  const choosePenaltyBall = (penaltyBall) => {
    saveSettings({ ...settings, penaltyBall }, "penaltyBall", penaltyBall);
    setChoicePrompt(null);
    showToast(`Bola ${penaltyBall} definida como castigo`);
  };
  const chooseKnockoutColor = (side, colorValue) => {
    const otherKey = side === "A" ? "knockoutColorB" : "knockoutColorA";
    if (settings[otherKey] === colorValue) {
      showToast("Cada adversário precisa ter uma cor diferente");
      return;
    }
    const key = side === "A" ? "knockoutColorA" : "knockoutColorB";
    saveSettings({ ...settings, [key]: colorValue }, key, colorValue);
    showToast(`${side === "A" ? "Adversário A" : "Adversário B"}: ${settingValueLabel(key, colorValue)}`);
  };
  const closeColorChoice = () => {
    setChoicePrompt(null);
    showToast("Cores do mata a mata salvas");
  };

  return (
    <section className="panel">
      <div className="eyebrow">admin</div>
      <div className="viewtitle">Configurações</div>

      <div className="settings-section">
        <div className="record-section-title">partida</div>
        <div className="settings-list">
          <div className="settings-row">
            <div className="settings-copy">
              <strong>Anotar bolas derrubadas durante partida?</strong>
              <span>Quando ligado, a partida ao vivo registra a sequência das bolas.</span>
            </div>
            <button
              className={`switch ${settings.trackBalls ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.trackBalls}
              onClick={() => updateSetting("trackBalls", !settings.trackBalls)}
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <strong>Ir direto à partida criada</strong>
              <span>Quando ligado, ao iniciar a partida o painel abre a tela da partida em andamento.</span>
            </div>
            <button
              className={`switch ${settings.openMatchOnStart ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.openMatchOnStart}
              onClick={() => updateSetting("openMatchOnStart", !settings.openMatchOnStart)}
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <strong>Gerenciar partidas em uma tela</strong>
              <span>Quando ligado, cada partida ao vivo pode ser finalizada direto pelo painel.</span>
            </div>
            <button
              className={`switch ${settings.finishFromPanel ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.finishFromPanel}
              onClick={() => updateSetting("finishFromPanel", !settings.finishFromPanel)}
            >
              <span />
            </button>
          </div>

          <label className="settings-field">
            <span>Modelo de jogo</span>
            <select className="select no-margin" value={settings.gameModel} onChange={(event) => updateGameModel(event.target.value)}>
              {GAME_MODELS.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
            </select>
          </label>

          {choicePrompt === "penalty" && (
            <div className="settings-choice-toast">
              <div>
                <span>bola de castigo</span>
                <strong>{rules.label}</strong>
              </div>
              <div className="penalty-ball-list">
                {rules.penaltyOptions.map((ball) => (
                  <button
                    key={ball}
                    type="button"
                    className={`penalty-ball-option ${settings.penaltyBall === ball ? "active" : ""}`}
                    onClick={() => choosePenaltyBall(ball)}
                  >
                    <PoolBall num={ball} size={38} />
                    <span>Bola {ball}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {choicePrompt === "color" && (
            <div className="settings-choice-toast">
              <div>
                <span>cores das bolas</span>
                <strong>{rules.label}</strong>
              </div>
              <div className="knockout-color-grid">
                <KnockoutColorPicker
                  title="Adversário A"
                  value={settings.knockoutColorA}
                  disabledValue={settings.knockoutColorB}
                  onChoose={(color) => chooseKnockoutColor("A", color)}
                />
                <KnockoutColorPicker
                  title="Adversário B"
                  value={settings.knockoutColorB}
                  disabledValue={settings.knockoutColorA}
                  onChoose={(color) => chooseKnockoutColor("B", color)}
                />
              </div>
              <button className="btn chalk small auto-btn" type="button" onClick={closeColorChoice}>Concluir cores</button>
            </div>
          )}

          {rules.hasPenalty && choicePrompt !== "penalty" && (
            <div className="settings-summary">
              <span>Castigo deste modo</span>
              <strong>Bola {settings.penaltyBall}</strong>
            </div>
          )}

          {rules.colorOptions.length > 0 && choicePrompt !== "color" && (
            <div className="settings-summary">
              <span>Cores do mata a mata</span>
              <strong>{settingValueLabel("knockoutColorA", settings.knockoutColorA)} x {settingValueLabel("knockoutColorB", settings.knockoutColorB)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="record-section-title">fila</div>
        <div className="settings-list">
          <div className="settings-row">
            <div className="settings-copy">
              <strong>Seleção automática de jogador</strong>
              <span>Quando ligado, ao finalizar uma partida o formulário de iniciar já vem preenchido com quem venceu e o próximo da fila.</span>
            </div>
            <button
              className={`switch ${settings.autoPickPlayers ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.autoPickPlayers}
              onClick={() => updateSetting("autoPickPlayers", !settings.autoPickPlayers)}
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <strong>Mostrar a fila no painel</strong>
              <span>Quando desligado, o painel volta a ser exatamente o de hoje, sem o bloco da fila.</span>
            </div>
            <button
              className={`switch ${settings.showQueuePanel ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.showQueuePanel}
              onClick={() => updateSetting("showQueuePanel", !settings.showQueuePanel)}
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <strong>Usar mesas</strong>
              <span>Quando desligado, as mesas continuam cadastradas, só saem da tela — e só dá pra ter uma partida ao vivo por vez.</span>
            </div>
            <button
              className={`switch ${settings.tablesEnabled ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.tablesEnabled}
              onClick={() => updateSetting("tablesEnabled", !settings.tablesEnabled)}
            >
              <span />
            </button>
          </div>

          <div className="settings-field">
            <span>Mesas</span>
            {queue?.available === false ? (
              <div className="empty small-empty">Fila indisponível — a migração 20260915 ainda não rodou neste banco.</div>
            ) : (
              <TablesAdmin
                tables={queue?.tables || []}
                addTable={queue?.addTable}
                updateTable={queue?.updateTable}
                deleteTable={queue?.deleteTable}
                adminUser={adminUser}
                auditLog={auditLog}
                showToast={showToast}
                requestConfirm={requestConfirm}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function settingLabel(key) {
  return {
    trackBalls: "anotação de bolas derrubadas",
    gameModel: "modelo de jogo",
    penaltyBall: "bola de castigo",
    knockoutColorA: "cor do adversário A",
    knockoutColorB: "cor do adversário B",
    openMatchOnStart: "ir direto à partida criada",
    finishFromPanel: "gerenciar partidas em uma tela",
    autoPickPlayers: "seleção automática de jogador",
    showQueuePanel: "mostrar a fila no painel",
    tablesEnabled: "usar mesas",
  }[key] || key;
}

function settingValueLabel(key, value) {
  if (typeof value === "boolean") return value ? "ligado" : "desligado";
  if (key === "gameModel") return GAME_MODELS.find((model) => model.value === value)?.label || value;
  if (key === "penaltyBall") return `Bola ${value}`;
  if (key === "knockoutColorA" || key === "knockoutColorB" || key === "knockoutColor") return KNOCKOUT_COLORS.find((color) => color.value === value)?.label || value;
  return String(value);
}

function KnockoutColorPicker({ title, value, disabledValue, onChoose }) {
  return (
    <div className="knockout-color-picker">
      <span>{title}</span>
      <div className="penalty-ball-list">
        {KNOCKOUT_COLORS.map((color) => {
          const disabled = disabledValue === color.value;
          return (
            <button
              key={color.value}
              type="button"
              className={`penalty-ball-option ${value === color.value ? "active" : ""}`}
              disabled={disabled}
              onClick={() => onChoose(color.value)}
            >
              <span className="color-choice-dot" style={{ background: color.color }} />
              <span>{color.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
