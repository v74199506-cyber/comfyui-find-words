import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Comfy.FindWords";
const COMMAND_ID = "Comfy.FindWords.Open";
const STYLE_ID = "comfy-find-words-style";

// Small, curated groups keep synonym suggestions fast, private, and available offline.
const SYNONYM_GROUPS = [
  ["beautiful", "gorgeous", "stunning", "attractive", "elegant", "lovely"],
  ["realistic", "photorealistic", "lifelike", "natural"],
  ["detailed", "intricate", "elaborate", "complex"],
  ["girl", "woman", "female", "lady"],
  ["boy", "man", "male", "gentleman"],
  ["happy", "joyful", "cheerful", "smiling"],
  ["sad", "unhappy", "sorrowful", "melancholic"],
  ["angry", "furious", "mad", "irritated"],
  ["calm", "peaceful", "serene", "tranquil"],
  ["big", "large", "huge", "gigantic", "enormous"],
  ["small", "tiny", "little", "miniature", "compact"],
  ["fast", "quick", "rapid", "speedy"],
  ["slow", "sluggish", "unhurried"],
  ["dark", "dim", "shadowy", "gloomy"],
  ["bright", "luminous", "radiant", "vivid"],
  ["soft", "gentle", "smooth", "delicate"],
  ["strong", "powerful", "robust", "mighty"],
  ["sexy", "sensual", "seductive", "alluring", "provocative"],
  ["forest", "woods", "woodland"],
  ["waterfall", "cascade"],
  ["photo", "photograph", "picture", "image"],
  ["portrait", "headshot", "likeness"],
  ["bonito", "bonita", "belo", "bela", "lindo", "linda"],
  ["realista", "fotorrealista", "natural"],
  ["detalhado", "detalhada", "minucioso", "minuciosa", "elaborado", "elaborada"],
  ["garota", "menina", "mulher", "dama"],
  ["garoto", "menino", "homem", "rapaz"],
  ["feliz", "alegre", "contente", "sorridente"],
  ["triste", "infeliz", "melancólico", "melancólica"],
  ["grande", "enorme", "gigante"],
  ["pequeno", "pequena", "minúsculo", "minúscula"],
  ["calmo", "calma", "sereno", "serena", "tranquilo", "tranquila"],
  ["floresta", "bosque", "mata"],
  ["cachoeira", "cascata", "queda-d'água"],
];

const state = {
  open: false,
  query: "",
  results: [],
  activeIndex: -1,
  activeOccurrence: -1,
  filter: "all",
  caseSensitive: false,
  wholeWord: false,
  includeSynonyms: false,
  previousSelection: null,
};

let root;
let input;
let status;
let resultsList;
let launcher;
let launcherObserver;
let launcherMountFrame;
let highlightedElement;
let highlightTimer;
let refreshTimer;
let clearButton;
let filterSelect;
let caseButton;
let wordButton;
let synonymButton;
let synonymsPanel;

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function graphNodes() {
  return app.canvas?.graph?._nodes ?? app.graph?._nodes ?? [];
}

function searchableFields(node) {
  const fields = [
    { label: "Title", value: node.title, kind: "node" },
    { label: "Type", value: node.type ?? node.comfyClass, kind: "node" },
  ];

  for (const widget of node.widgets ?? []) {
    const value = widget.value;
    if (["string", "number", "boolean"].includes(typeof value)) {
      fields.push({ label: widget.label ?? widget.name ?? "Widget", value, widget, kind: "widget" });
    } else if (Array.isArray(value)) {
      fields.push({ label: widget.label ?? widget.name ?? "Widget", value: value.join(", "), widget, kind: "widget" });
    }
  }

  if (node.properties && typeof node.properties === "object") {
    for (const [name, value] of Object.entries(node.properties)) {
      if (["string", "number", "boolean"].includes(typeof value)) {
        fields.push({ label: name, value, kind: "property" });
      }
    }
  }

  return fields
    .map((field) => ({
      ...field,
      label: normalize(field.label),
      value: normalize(field.value),
    }))
    .filter(({ value }) => value.length > 0);
}

function isWordCharacter(character) {
  return Boolean(character) && /[\p{L}\p{N}_]/u.test(character);
}

function matchingIndices(text, query, wholeWord = state.wholeWord) {
  if (!query) return [];
  const source = state.caseSensitive ? text : text.toLocaleLowerCase();
  const needle = state.caseSensitive ? query : query.toLocaleLowerCase();
  const indices = [];
  let cursor = 0;

  while (cursor <= source.length - needle.length) {
    const index = source.indexOf(needle, cursor);
    if (index < 0) break;
    const startsWord = !isWordCharacter(text[index - 1]);
    const endsWord = !isWordCharacter(text[index + query.length]);
    if (!wholeWord || (startsWord && endsWord)) indices.push(index);
    cursor = index + Math.max(needle.length, 1);
  }
  return indices;
}

function synonymsFor(query) {
  const normalizedQuery = normalize(query).toLocaleLowerCase();
  if (!normalizedQuery) return [];
  const group = SYNONYM_GROUPS.find((words) =>
    words.some((word) => word.toLocaleLowerCase() === normalizedQuery)
  );
  return group?.filter((word) => word.toLocaleLowerCase() !== normalizedQuery) ?? [];
}

function findResults(query) {
  if (!query) return [];

  const terms = [
    { term: query, isSynonym: false },
    ...(state.includeSynonyms
      ? synonymsFor(query).map((term) => ({ term, isSynonym: true }))
      : []),
  ];
  const found = [];
  for (const node of graphNodes()) {
    for (const field of searchableFields(node)) {
      if (state.filter !== "all" && field.kind !== state.filter) continue;
      const occurrences = terms.flatMap(({ term, isSynonym }) =>
        matchingIndices(field.value, term, isSynonym ? true : state.wholeWord)
          .map((index) => ({ index, term, isSynonym }))
      ).sort((a, b) => a.index - b.index || b.term.length - a.term.length)
        .filter((occurrence, index, all) =>
          !all.slice(0, index).some((previous) =>
            previous.index === occurrence.index && previous.term.length === occurrence.term.length
          )
        );
      if (occurrences.length) found.push({ node, field, occurrences });
    }
  }
  return found;
}

function snippet(text, query, radius = 42) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function addHighlightedText(container, text, query) {
  const indices = matchingIndices(text, query);
  let cursor = 0;

  for (const match of indices) {
    container.append(document.createTextNode(text.slice(cursor, match)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(match, match + query.length);
    container.append(mark);
    cursor = match + query.length;
  }
  container.append(document.createTextNode(text.slice(cursor)));
}

function render() {
  resultsList.replaceChildren();
  const occurrenceCount = state.results.reduce((total, result) => total + result.occurrences.length, 0);
  const activeOrdinal = state.activeIndex < 0
    ? 0
    : state.results.slice(0, state.activeIndex)
      .reduce((total, result) => total + result.occurrences.length, 0)
      + state.activeOccurrence + 1;
  status.textContent = !state.query
    ? "Search node titles, types, properties, and widget text"
    : activeOrdinal
      ? `${activeOrdinal} of ${occurrenceCount} matches`
      : `${occurrenceCount} ${occurrenceCount === 1 ? "match" : "matches"} in ${state.results.length} ${state.results.length === 1 ? "field" : "fields"}${state.includeSynonyms ? " · synonyms on" : ""}`;
  if (clearButton) clearButton.hidden = !input.value;

  synonymsPanel.replaceChildren();
  const suggestions = synonymsFor(state.query);
  synonymsPanel.hidden = !state.query || !suggestions.length;
  if (suggestions.length) {
    const label = document.createElement("span");
    label.className = "cfw-synonym-label";
    label.textContent = "Synonyms";
    synonymsPanel.append(label);
    for (const synonym of suggestions) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cfw-synonym-chip";
      chip.textContent = synonym;
      chip.title = `Search for ${synonym}`;
      chip.addEventListener("click", () => {
        input.value = synonym;
        refresh();
        input.focus();
      });
      synonymsPanel.append(chip);
    }
  }

  let currentNode = null;
  let group = null;

  state.results.forEach((result, index) => {
    if (result.node !== currentNode) {
      currentNode = result.node;
      group = document.createElement("section");
      group.className = "cfw-node-group";
      const groupTitle = document.createElement("div");
      groupTitle.className = "cfw-node-title";
      groupTitle.textContent = result.node.title || result.node.type || `Node ${result.node.id}`;
      group.append(groupTitle);
      resultsList.append(group);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cfw-result";
    button.dataset.resultIndex = String(index);
    button.dataset.active = String(index === state.activeIndex);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === state.activeIndex));

    const detail = document.createElement("span");
    detail.className = "cfw-result-detail";
    const field = document.createElement("span");
    field.className = "cfw-field";
    field.textContent = `${result.field.label}: `;
    detail.append(field);
    const previewTerm = result.occurrences[0]?.term ?? state.query;
    addHighlightedText(detail, snippet(result.field.value, previewTerm), previewTerm);

    if (result.occurrences.length > 1) {
      const count = document.createElement("span");
      count.className = "cfw-occurrence-count";
      count.textContent = `${result.occurrences.length}×`;
      detail.append(count);
    }

    button.append(detail);
    button.addEventListener("click", () => activate(index, true, 0));
    group.append(button);
  });

  if (state.activeIndex >= 0) {
    resultsList.querySelector(`[data-result-index="${state.activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
}

function refresh() {
  state.query = input.value.trim();
  state.results = findResults(state.query);
  state.activeIndex = -1;
  state.activeOccurrence = -1;
  render();
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 100);
}

function centerNode(node) {
  const canvas = app.canvas;
  if (!canvas || !node) return;

  canvas.deselectAllNodes?.();
  canvas.selectNode?.(node, false);

  if (typeof canvas.centerOnNode === "function") {
    canvas.centerOnNode(node);
  } else if (canvas.ds?.offset && canvas.canvas) {
    const scale = canvas.ds.scale || 1;
    canvas.ds.offset[0] = canvas.canvas.width / (2 * scale) - node.pos[0] - node.size[0] / 2;
    canvas.ds.offset[1] = canvas.canvas.height / (2 * scale) - node.pos[1] - node.size[1] / 2;
  }
  canvas.setDirty?.(true, true);
}

function textElementForResult(result) {
  const widget = result.field.widget;
  const directCandidates = [widget?.element, widget?.inputEl, widget?.input, widget?.el];

  for (const candidate of directCandidates) {
    if (!(candidate instanceof HTMLElement)) continue;
    if (candidate.matches("textarea, input[type='text'], input[type='search']")) return candidate;
    const nested = candidate.querySelector("textarea, input[type='text'], input[type='search']");
    if (nested) return nested;
  }

  const candidates = document.querySelectorAll(
    "textarea[data-testid='dom-widget-textarea'], textarea, input[type='text']"
  );
  return [...candidates].find((element) => {
    const value = "value" in element ? element.value : element.textContent;
    const rect = element.getBoundingClientRect();
    return normalize(value) === result.field.value && rect.width > 0 && rect.height > 0;
  });
}

function highlightResult(result, occurrenceIndex) {
  const element = textElementForResult(result);
  if (!(element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) return;

  const occurrence = result.occurrences[occurrenceIndex] ?? result.occurrences[0];
  const query = occurrence?.term ?? state.query;
  const elementOccurrences = matchingIndices(element.value, query, occurrence?.isSynonym ? true : state.wholeWord);
  const matchIndex = elementOccurrences[occurrenceIndex] ?? elementOccurrences[0] ?? -1;
  if (matchIndex < 0) return;

  if (highlightedElement) highlightedElement.classList.remove("cfw-match-pulse");
  clearTimeout(highlightTimer);

  element.focus({ preventScroll: true });
  element.setSelectionRange(matchIndex, matchIndex + query.length);
  element.classList.remove("cfw-match-pulse");
  void element.offsetWidth;
  element.classList.add("cfw-match-pulse");
  highlightedElement = element;
  highlightTimer = setTimeout(() => {
    element.classList.remove("cfw-match-pulse");
    if (highlightedElement === element) highlightedElement = null;
  }, 4200);
}

function activate(index, closeAfter = false, occurrenceIndex = 0) {
  if (!state.results.length) return;
  state.activeIndex = (index + state.results.length) % state.results.length;
  const result = state.results[state.activeIndex];
  state.activeOccurrence = Math.max(0, Math.min(occurrenceIndex, result.occurrences.length - 1));
  centerNode(result.node);
  render();
  if (closeAfter) closeSearch(false);
  requestAnimationFrame(() => requestAnimationFrame(() =>
    highlightResult(result, state.activeOccurrence)
  ));
}

function move(direction) {
  if (!state.results.length) return;
  if (state.activeIndex < 0) {
    const index = direction > 0 ? 0 : state.results.length - 1;
    const occurrence = direction > 0 ? 0 : state.results[index].occurrences.length - 1;
    activate(index, false, occurrence);
    return;
  }

  const current = state.results[state.activeIndex];
  const nextOccurrence = state.activeOccurrence + direction;
  if (nextOccurrence >= 0 && nextOccurrence < current.occurrences.length) {
    activate(state.activeIndex, false, nextOccurrence);
    return;
  }

  const nextIndex = (state.activeIndex + direction + state.results.length) % state.results.length;
  const occurrence = direction > 0 ? 0 : state.results[nextIndex].occurrences.length - 1;
  activate(nextIndex, false, occurrence);
}

function openSearch() {
  if (!root) createUi();
  mountLauncher();
  if (!input) return;
  if (state.open) {
    input.focus();
    input.select();
    return;
  }
  state.open = true;
  state.previousSelection = app.canvas?.selected_nodes
    ? { ...app.canvas.selected_nodes }
    : null;
  root.hidden = false;
  positionDropdown();
  input.focus();
  input.select();
  refresh();
}

function closeSearch(restoreSelection = false) {
  if (!state.open) return;
  state.open = false;
  root.hidden = true;

  if (restoreSelection && state.previousSelection && app.canvas) {
    app.canvas.deselectAllNodes?.();
    for (const node of Object.values(state.previousSelection)) {
      app.canvas.selectNode?.(node, true);
    }
    app.canvas.setDirty?.(true, true);
  }
  app.canvas?.canvas?.focus?.();
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes cfw-widget-pulse {
      0%, 100% { outline-color: #facc15; box-shadow: 0 0 0 2px #facc1566, 0 0 10px 2px #facc1544; }
      50% { outline-color: #fff3a3; box-shadow: 0 0 0 5px #facc1599, 0 0 28px 10px #facc1577; }
    }
    .cfw-match-pulse { position: relative !important; z-index: 1002 !important; outline: 3px solid #facc15 !important; outline-offset: 3px; animation: cfw-widget-pulse 0.7s ease-in-out 6; }
    .cfw-match-pulse::selection { color: #111; background: #facc15; }
    .cfw-launcher { pointer-events: auto; position: fixed; z-index: 1000; display: flex; align-items: center; gap: 8px; width: 240px; height: 40px; padding: 0 11px; border: 1px solid var(--border-color, #444); border-radius: 10px; color: var(--fg-color, #ddd); background: var(--comfy-menu-bg, #202020); box-shadow: 0 2px 8px #0005; font: 13px/1 system-ui, sans-serif; }
    .cfw-launcher:hover { border-color: #666; background: color-mix(in srgb, var(--comfy-menu-bg, #202020) 88%, white); }
    .cfw-launcher:focus-within { border-color: var(--p-primary-color, #60a5fa); box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-primary-color, #60a5fa) 25%, transparent); }
    .cfw-launcher-icon { color: #aaa; font-size: 14px; }
    .cfw-launcher-input { min-width: 0; flex: 1; border: 0; outline: 0; color: inherit; background: transparent; font: inherit; }
    .cfw-launcher-input::placeholder { color: #aaa; opacity: 1; }
    .cfw-clear { flex: 0 0 auto; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; color: #aaa; background: transparent; cursor: pointer; font: 16px/1 system-ui, sans-serif; }
    .cfw-clear:hover { color: #fff; background: #fff2; }
    .cfw-clear[hidden] { display: none; }
    .cfw-launcher kbd { flex: 0 0 auto; padding: 3px 5px; border: 1px solid #555; border-radius: 4px; color: #999; background: #1118; font: 10px/1 system-ui, sans-serif; }
    .cfw-launcher[data-compact="true"] kbd { display: none; }
    .cfw-root { position: fixed; z-index: 100000; pointer-events: auto; }
    .cfw-root[hidden] { display: none; }
    .cfw-panel { width: 100%; max-height: min(520px, calc(100vh - 120px)); overflow: hidden; border: 1px solid var(--border-color, #444); border-radius: 10px; color: var(--fg-color, #eee); background: var(--comfy-menu-bg, #202020); box-shadow: 0 14px 40px #0009; font: 13px/1.4 system-ui, sans-serif; }
    .cfw-tools { display: flex; align-items: center; gap: 6px; padding: 8px; border-bottom: 1px solid var(--border-color, #444); }
    .cfw-status { min-width: 0; flex: 1; overflow: hidden; color: #aaa; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .cfw-filter, .cfw-toggle { height: 27px; border: 1px solid #555; border-radius: 6px; color: #bbb; background: #1118; font: 11px system-ui, sans-serif; }
    .cfw-filter { max-width: 130px; padding: 0 6px; }
    .cfw-toggle { min-width: 28px; padding: 0 7px; cursor: pointer; }
    .cfw-toggle[aria-pressed="true"] { border-color: var(--p-primary-color, #60a5fa); color: #fff; background: color-mix(in srgb, var(--p-primary-color, #60a5fa) 28%, transparent); }
    .cfw-synonyms { display: flex; align-items: center; gap: 6px; overflow-x: auto; padding: 7px 10px; border-bottom: 1px solid var(--border-color, #444); scrollbar-width: thin; }
    .cfw-synonyms[hidden] { display: none; }
    .cfw-synonym-label { flex: 0 0 auto; color: #888; font-size: 11px; font-weight: 650; text-transform: uppercase; }
    .cfw-synonym-chip { flex: 0 0 auto; padding: 3px 8px; border: 1px solid #555; border-radius: 999px; color: #d8d8d8; background: #fff1; cursor: pointer; font: 11px system-ui, sans-serif; }
    .cfw-synonym-chip:hover { border-color: #d6b73f; color: #fff; background: #facc151a; }
    .cfw-results { max-height: 400px; overflow: auto; padding: 0 7px 7px; }
    .cfw-node-group { padding-top: 5px; }
    .cfw-node-title { padding: 5px 10px 3px; color: #ddd; font-size: 12px; font-weight: 650; }
    .cfw-result { display: block; width: 100%; padding: 9px 10px; border: 0; border-radius: 7px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
    .cfw-result:hover, .cfw-result[data-active="true"] { background: #fff2; }
    .cfw-result-detail { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cfw-result-detail { margin-top: 2px; color: #bbb; font-size: 12px; }
    .cfw-field { color: #888; }
    .cfw-occurrence-count { float: right; margin-left: 8px; padding: 1px 5px; border-radius: 8px; color: #d6b73f; background: #facc151a; }
    .cfw-result mark { padding: 0 1px; border-radius: 2px; color: #111; background: #facc15; }
    .cfw-help { display: flex; gap: 14px; padding: 8px 14px 10px; border-top: 1px solid var(--border-color, #444); color: #888; font-size: 11px; }
    .cfw-help kbd { padding: 1px 4px; border: 1px solid #666; border-radius: 3px; color: #bbb; background: #1118; font: inherit; }
  `;
  document.head.append(style);
}

function createLauncher() {
  if (launcher) return launcher;

  launcher = document.createElement("div");
  launcher.className = "cfw-launcher";
  launcher.title = "Find words in workflow (Ctrl+F)";
  launcher.setAttribute("role", "search");
  launcher.innerHTML = `
    <i class="pi pi-search cfw-launcher-icon" aria-hidden="true"></i>
    <input class="cfw-launcher-input" type="search" autocomplete="off" spellcheck="false" placeholder="Find words…" aria-label="Find words in workflow" aria-keyshortcuts="Control+F Meta+F">
    <button class="cfw-clear" type="button" title="Clear search" aria-label="Clear search" hidden>×</button>
    <kbd>Ctrl F</kbd>`;
  input = launcher.querySelector(".cfw-launcher-input");
  clearButton = launcher.querySelector(".cfw-clear");
  input.addEventListener("focus", () => {
    if (!state.open) openSearch();
  });
  input.addEventListener("input", () => {
    if (!state.open) openSearch();
    scheduleRefresh();
  });
  clearButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.value = "";
    refresh();
    input.focus();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch(true);
    }
  });
  launcher.addEventListener("pointerdown", (event) => {
    if (event.target === input) return;
    event.preventDefault();
    input.focus();
  });
  return launcher;
}

function positionDropdown() {
  if (!root || !launcher || root.hidden) return;
  const rect = launcher.getBoundingClientRect();
  const availableWidth = Math.max(0, window.innerWidth - rect.left - 12);
  root.style.left = `${Math.round(rect.left)}px`;
  root.style.top = `${Math.round(rect.bottom + 6)}px`;
  root.style.width = `${Math.min(620, availableWidth)}px`;
}

function mountLauncher() {
  const breadcrumb = document.querySelector('[data-testid="subgraph-breadcrumb"]');
  const workflowButton = breadcrumb?.querySelector('button[aria-label="Workflow actions"]')
    ?? [...(breadcrumb?.querySelectorAll("button") ?? [])].find((element) =>
      element.textContent?.trim().includes("Graph")
    );
  const graphControl = workflowButton?.parentElement ?? breadcrumb;

  const legacyTopbar = document.querySelector('[data-testid="legacy-topbar-container"]');
  const firstLegacyButton = [...(legacyTopbar?.querySelectorAll("button") ?? [])]
    .find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    });
  const rightControl = document.querySelector("#civitai-downloader-button")
    ?? firstLegacyButton
    ?? document.querySelector('[data-testid="action-bar-card"]');

  if (!(graphControl instanceof HTMLElement) || !(rightControl instanceof HTMLElement)) {
    if (launcher) launcher.hidden = true;
    return false;
  }

  const graphRect = graphControl.getBoundingClientRect();
  const toolsRect = rightControl.getBoundingClientRect();
  const left = Math.round(graphRect.right + 10);
  const availableWidth = Math.floor(toolsRect.left - left - 10);
  const width = Math.min(280, availableWidth);
  const button = createLauncher();

  if (button.parentElement !== document.body) document.body.append(button);
  button.hidden = width < 40;
  if (button.hidden) return false;

  button.style.left = `${left}px`;
  button.style.top = `${Math.round(graphRect.top)}px`;
  button.style.width = `${Math.max(40, width)}px`;
  button.style.height = `${Math.max(36, Math.round(graphRect.height))}px`;
  button.dataset.compact = String(width < 150);
  positionDropdown();
  return true;
}

function scheduleLauncherMount() {
  if (launcherMountFrame) return;
  launcherMountFrame = requestAnimationFrame(() => {
    launcherMountFrame = null;
    mountLauncher();
  });
}

function watchForTopbar() {
  mountLauncher();
  launcherObserver = new MutationObserver(scheduleLauncherMount);
  launcherObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleLauncherMount);
}

function createUi() {
  injectStyle();
  root = document.createElement("div");
  root.className = "cfw-root";
  root.hidden = true;
  root.innerHTML = `
    <section class="cfw-panel" aria-label="Workflow search results">
      <div class="cfw-tools">
        <div class="cfw-status" aria-live="polite"></div>
        <select class="cfw-filter" aria-label="Search field filter" title="Filter searchable fields">
          <option value="all">All fields</option>
          <option value="widget">Text & widgets</option>
          <option value="node">Titles & types</option>
          <option value="property">Properties</option>
        </select>
        <button class="cfw-toggle cfw-case" type="button" aria-pressed="false" title="Match case">Aa</button>
        <button class="cfw-toggle cfw-word" type="button" aria-pressed="false" title="Match whole word">W</button>
        <button class="cfw-toggle cfw-synonym-toggle" type="button" aria-pressed="false" title="Include synonyms in results">≈</button>
      </div>
      <div class="cfw-synonyms" aria-label="Synonym suggestions" hidden></div>
      <div class="cfw-results" role="listbox"></div>
      <div class="cfw-help"><span><kbd>Enter</kbd> next</span><span><kbd>Shift</kbd> + <kbd>Enter</kbd> previous</span><span><kbd>Esc</kbd> close</span></div>
    </section>`;

  document.body.append(root);
  status = root.querySelector(".cfw-status");
  resultsList = root.querySelector(".cfw-results");
  filterSelect = root.querySelector(".cfw-filter");
  caseButton = root.querySelector(".cfw-case");
  wordButton = root.querySelector(".cfw-word");
  synonymButton = root.querySelector(".cfw-synonym-toggle");
  synonymsPanel = root.querySelector(".cfw-synonyms");
  filterSelect.addEventListener("change", () => {
    state.filter = filterSelect.value;
    refresh();
  });
  caseButton.addEventListener("click", () => {
    state.caseSensitive = !state.caseSensitive;
    caseButton.setAttribute("aria-pressed", String(state.caseSensitive));
    refresh();
  });
  wordButton.addEventListener("click", () => {
    state.wholeWord = !state.wholeWord;
    wordButton.setAttribute("aria-pressed", String(state.wholeWord));
    refresh();
  });
  synonymButton.addEventListener("click", () => {
    state.includeSynonyms = !state.includeSynonyms;
    synonymButton.setAttribute("aria-pressed", String(state.includeSynonyms));
    refresh();
  });
  document.addEventListener("pointerdown", (event) => {
    if (state.open && !root.contains(event.target) && !launcher?.contains(event.target)) {
      closeSearch(false);
    }
  });
}

function onGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLocaleLowerCase() === "f") {
    event.preventDefault();
    event.stopImmediatePropagation();
    openSearch();
    return;
  }

  if (state.open && event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeSearch(true);
  }
}

app.registerExtension({
  name: EXTENSION_NAME,
  commands: [
    {
      id: COMMAND_ID,
      label: "Find words in workflow",
      icon: "pi pi-search",
      function: openSearch,
    },
  ],
  menuCommands: [
    {
      path: ["Extensions", "Find Words"],
      commands: [COMMAND_ID],
    },
  ],
  async setup() {
    createUi();
    watchForTopbar();
    // Capture phase is necessary because Ctrl+F is otherwise handled by the browser.
    window.addEventListener("keydown", onGlobalKeydown, true);
  },
});
