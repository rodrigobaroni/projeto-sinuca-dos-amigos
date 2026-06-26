export const GAME_MODELS = [
  { value: "even-odd", label: "Numerada (Ímpares e Pares)" },
  { value: "solids-stripes", label: "Numerada (Lisas e Listradas)" },
  { value: "high-low", label: "Numerada (Maiores e Menores)" },
  { value: "knockout", label: "Mata a Mata" },
  { value: "three-balls", label: "3 bolas" },
];

export const KNOCKOUT_COLORS = [
  { value: "red", label: "Vermelhas", color: "#d64232" },
  { value: "yellow", label: "Amarelas", color: "#f4c430" },
  { value: "blue", label: "Azuis", color: "#2379d4" },
];

const DEFAULT_SETTINGS = {
  trackBalls: true,
  gameModel: "even-odd",
  penaltyBall: "1",
  knockoutColorA: "red",
  knockoutColorB: "yellow",
};

const MODEL_RULES = {
  "even-odd": {
    label: "Numerada (Ímpares e Pares)",
    groupLabels: { even: "pares", odd: "ímpares" },
    groups: {
      even: [2, 4, 6, 8, 10, 12, 14],
      odd: [1, 3, 5, 7, 9, 11, 13, 15],
    },
    penaltyOptions: ["1", "15"],
    defaultPenaltyBall: "1",
    setupText: "Toque na primeira bola encaçapada e escolha quem matou. Ela define pares e ímpares.",
  },
  "solids-stripes": {
    label: "Numerada (Lisas e Listradas)",
    groupLabels: { solid: "lisas", stripe: "listradas" },
    groups: {
      solid: [1, 2, 3, 4, 5, 6, 7, 8],
      stripe: [9, 10, 11, 12, 13, 14, 15],
    },
    penaltyOptions: ["1", "8"],
    defaultPenaltyBall: "8",
    setupText: "Toque na primeira bola encaçapada e escolha quem matou. Ela define lisas e listradas.",
  },
  "high-low": {
    label: "Numerada (Maiores e Menores)",
    groupLabels: { low: "menores", high: "maiores" },
    groups: {
      low: [1, 2, 3, 4, 5, 6, 7],
      high: [9, 10, 11, 12, 13, 14, 15],
    },
    penaltyOptions: ["8"],
    defaultPenaltyBall: "8",
    setupText: "Toque na primeira bola encaçapada e escolha quem matou. Ela define maiores e menores.",
  },
  knockout: {
    label: "Mata a Mata",
    simpleOnly: true,
    penaltyOptions: [],
    colorOptions: KNOCKOUT_COLORS,
  },
  "three-balls": {
    label: "3 bolas",
    simpleOnly: true,
    penaltyOptions: [],
  },
};

function uniqueNumbers(numbers) {
  return [...new Set(numbers.map(Number))].sort((a, b) => a - b);
}

function oppositeGroup(groups, group) {
  return Object.keys(groups).find((key) => key !== group) || "";
}

export function normalizeGameSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const gameModel = MODEL_RULES[merged.gameModel] ? merged.gameModel : DEFAULT_SETTINGS.gameModel;
  const model = MODEL_RULES[gameModel];
  const penaltyOptions = model.penaltyOptions || [];
  const penaltyBall = penaltyOptions.length
    ? (penaltyOptions.includes(String(merged.penaltyBall)) ? String(merged.penaltyBall) : model.defaultPenaltyBall)
    : "";
  const colorValues = (model.colorOptions || []).map((item) => item.value);
  const hasColorA = Object.prototype.hasOwnProperty.call(settings || {}, "knockoutColorA");
  const legacyColor = colorValues.includes(merged.knockoutColor) ? merged.knockoutColor : "";
  const preferredColorA = hasColorA ? merged.knockoutColorA : (legacyColor || merged.knockoutColorA);
  const knockoutColorA = colorValues.length && colorValues.includes(preferredColorA)
    ? preferredColorA
    : DEFAULT_SETTINGS.knockoutColorA;
  const fallbackColorB = colorValues.find((color) => color !== knockoutColorA) || DEFAULT_SETTINGS.knockoutColorB;
  const chosenColorB = colorValues.length && colorValues.includes(merged.knockoutColorB)
    ? merged.knockoutColorB
    : fallbackColorB;
  const knockoutColorB = chosenColorB === knockoutColorA ? fallbackColorB : chosenColorB;

  return {
    ...merged,
    gameModel,
    penaltyBall,
    knockoutColorA,
    knockoutColorB,
  };
}

export class GameRules {
  constructor(settings = {}) {
    this.settings = normalizeGameSettings(settings);
    this.modelKey = this.settings.gameModel;
    this.model = MODEL_RULES[this.modelKey];
  }

  get label() {
    return this.model.label;
  }

  get simpleOnly() {
    return Boolean(this.model.simpleOnly);
  }

  get penaltyOptions() {
    return this.model.penaltyOptions || [];
  }

  get colorOptions() {
    return this.model.colorOptions || [];
  }

  get knockoutColors() {
    return {
      a: this.settings.knockoutColorA,
      b: this.settings.knockoutColorB,
    };
  }

  get penaltyBall() {
    return this.settings.penaltyBall || "";
  }

  get hasPenalty() {
    return Boolean(this.penaltyBall);
  }

  get setupText() {
    return this.model.setupText || "";
  }

  get groups() {
    return this.model.groups || {};
  }

  groupLabel(group) {
    return this.model.groupLabels?.[group] || group || "grupo indefinido";
  }

  groupFromBall(ball) {
    const num = Number(ball);
    if (!num || String(num) === String(this.penaltyBall)) return "";
    return Object.entries(this.groups).find(([, balls]) => balls.includes(num))?.[0] || "";
  }

  oppositeGroup(group) {
    return oppositeGroup(this.groups, group);
  }

  groupBalls(group) {
    return uniqueNumbers(this.groups[group] || []).filter((ball) => String(ball) !== String(this.penaltyBall));
  }

  setupBalls() {
    return uniqueNumbers(Object.values(this.groups).flat()).filter((ball) => String(ball) !== String(this.penaltyBall));
  }

  deriveGroups(match, log = []) {
    const firstDefinition = log.find((entry) => (
      entry.type !== "foul" &&
      !entry.brk &&
      this.groupFromBall(entry.ball)
    ));
    if (!firstDefinition) return {};
    const group = this.groupFromBall(firstDefinition.ball);
    const opponent = firstDefinition.by === match.player_a ? match.player_b : match.player_a;
    return {
      [firstDefinition.by]: group,
      [opponent]: this.oppositeGroup(group),
    };
  }

  isGroupCleared(playerId, groups, log = []) {
    const group = groups[playerId];
    if (!group) return false;
    const removed = new Set(log.map((entry) => Number(entry.ball)));
    return this.groupBalls(group).every((ball) => removed.has(ball));
  }

  classifyPot({ ball, by, groups = {}, log = [] }) {
    const num = Number(ball);
    if (this.hasPenalty && String(num) === String(this.penaltyBall)) {
      return this.isGroupCleared(by, groups, log) ? { type: "pot" } : { type: "foul", reason: "trunfo" };
    }

    const ballGroup = this.groupFromBall(num);
    if (!ballGroup) return { type: "pot" };
    if (!groups[by] || groups[by] === ballGroup) return { type: "pot" };
    return { type: "foul", reason: "oponente" };
  }
}

export function getGameRules(settings) {
  return new GameRules(settings);
}

const defaultRules = getGameRules(DEFAULT_SETTINGS);

export function groupBalls(group, settings) {
  return getGameRules(settings || DEFAULT_SETTINGS).groupBalls(group);
}

export function groupLabel(group, settings) {
  return getGameRules(settings || DEFAULT_SETTINGS).groupLabel(group);
}

export function deriveGroups(match, log, settings) {
  return getGameRules(settings || DEFAULT_SETTINGS).deriveGroups(match, log);
}

export function classifyPot(payload, settings) {
  return getGameRules(settings || DEFAULT_SETTINGS).classifyPot(payload);
}

export function foulReasonText(reason) {
  if (reason === "oponente") return "bola do oponente";
  if (reason === "trunfo") return `bola ${defaultRules.penaltyBall} fora da hora`;
  return "falta";
}
