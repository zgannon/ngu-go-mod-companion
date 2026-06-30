const GO_HOST = "gmiclotte.github.io";
const GO_PATH_START = "/gear-optimizer";

const tabStatus = document.getElementById("tabStatus");
const resultEl = document.getElementById("result");
const popupVersionEl = document.getElementById("popupVersion");
const popupAuthorEl = document.getElementById("popupAuthor");
const armDangerBtn = document.getElementById("armDanger");
const dangerBtn = document.getElementById("dangerHackWithTargets");
const openPopupBtn = document.getElementById("openPopup");
const openPopoutBtn = document.getElementById("openPopout");
const openSidePanelBtn = document.getElementById("openSidePanel");
const themeToggleBtn = document.getElementById("themeToggle");
const actionButtons = [...document.querySelectorAll("button[data-action]")];
const accordionTriggers = [
  ...document.querySelectorAll(".accordion .accordion-trigger"),
];
const appRoot = document.querySelector("main.app");
const syncNguGoSection = document.querySelector('[data-accordion="sync-ngu-go"]');
const syncGoNguSection = document.querySelector('[data-accordion="sync-go-ngu"]');
const customHelpersSection = document.querySelector(
  '[data-accordion="custom-helpers"]',
);
const dangerZoneSection = document.querySelector('[data-accordion="danger-zone"]');
const helpfulLinksTrigger = document.querySelector(
  '[data-accordion="helpful-links"] .accordion-trigger',
);
const THEME_STORAGE_KEY = "ngu-go-helper-theme";
const POPUP_PAGE_URL = "src/popup/popup.html";
const SIDE_PANEL_PAGE_URL = `${POPUP_PAGE_URL}?mode=sidepanel`;
const viewMode = new URLSearchParams(window.location.search).get("mode");
const isPopoutMode = viewMode === "popout";
const isSidePanelMode = viewMode === "sidepanel";
const isPopupMode = !isPopoutMode && !isSidePanelMode;

const LIGHT_MODE_SYMBOL = "◑";
const DARK_MODE_SYMBOL = "◐";
const LIGHT_THEME = "light";
const DARK_THEME = "dark";

const HACK_INDEX = Object.freeze({
  ATTACK_DEFENSE: 0,
  ADVENTURE_STATS: 1,
  TIME_MACHINE_SPEED: 2,
  DROP_CHANCE: 3,
  AUGMENT_SPEED: 4,
  ENERGY_NGU_SPEED: 5,
  MAGIC_NGU_SPEED: 6,
  BLOOD_GAIN: 7,
  QP_GAIN: 8,
  DAYCARE: 9,
  EXP_GAIN: 10,
  NUMBER_GAIN: 11,
  PP_GAIN: 12,
  HACK_GAIN: 13,
  WISH_SPEED: 14,
});

const HACK_HARD_CAP_BY_INDEX = Object.freeze({
  [HACK_INDEX.ATTACK_DEFENSE]: 7720,
  [HACK_INDEX.ADVENTURE_STATS]: 7632,
  [HACK_INDEX.TIME_MACHINE_SPEED]: 7544,
  [HACK_INDEX.DROP_CHANCE]: 7544,
  [HACK_INDEX.AUGMENT_SPEED]: 7456,
  [HACK_INDEX.ENERGY_NGU_SPEED]: 7340,
  [HACK_INDEX.MAGIC_NGU_SPEED]: 7340,
  [HACK_INDEX.BLOOD_GAIN]: 7252,
  [HACK_INDEX.QP_GAIN]: 7164,
  [HACK_INDEX.DAYCARE]: 7048,
  [HACK_INDEX.EXP_GAIN]: 6960,
  [HACK_INDEX.NUMBER_GAIN]: 6873,
  [HACK_INDEX.PP_GAIN]: 6757,
  [HACK_INDEX.HACK_GAIN]: 6757,
  [HACK_INDEX.WISH_SPEED]: 6262,
});

function applySystemPrimaryColor() {
  if (typeof CSS !== "undefined" && CSS.supports("color", "AccentColor")) {
    document.documentElement.style.setProperty("--system-primary", "AccentColor");
  }
}

function applyLayoutMode() {
  document.documentElement.dataset.layout = isPopoutMode
    ? "popout"
    : isSidePanelMode
      ? "sidepanel"
      : "popup";
}

function populatePopupMetaFooter() {
  const manifest = globalThis?.chrome?.runtime?.getManifest?.() || {};
  const version = manifest.version || "unknown";
  const author = manifest.author || "unknown";

  if (popupVersionEl) {
    popupVersionEl.textContent = version;
  }

  if (popupAuthorEl) {
    popupAuthorEl.textContent = author;
  }
}

let activeTabId = null;
let goTabReady = false;
let dangerArmedUntil = 0;
let dangerTimer = null;
let refreshTimer = null;
let initializeInFlight = false;
let pendingStatusAction = null;

function getStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const switchToLight = theme === DARK_THEME;
  themeToggleBtn.textContent = switchToLight ? LIGHT_MODE_SYMBOL : DARK_MODE_SYMBOL;
  const nextThemeLabel = switchToLight ? LIGHT_THEME : DARK_THEME;
  const toggleLabel = `Switch to ${nextThemeLabel} mode`;
  themeToggleBtn.setAttribute("aria-label", toggleLabel);
  themeToggleBtn.setAttribute("title", toggleLabel);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.dataset.theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function setAccordionExpanded(trigger, expanded) {
  const panelId = trigger.getAttribute("aria-controls");
  if (!panelId) {
    return;
  }

  const panel = document.getElementById(panelId);
  if (!panel) {
    return;
  }

  trigger.setAttribute("aria-expanded", String(expanded));
  panel.hidden = !expanded;
}

function initializeAccordions() {
  for (const trigger of accordionTriggers) {
    const isExpanded = trigger.getAttribute("aria-expanded") !== "false";
    setAccordionExpanded(trigger, isExpanded);

    trigger.addEventListener("click", () => {
      const currentlyExpanded = trigger.getAttribute("aria-expanded") === "true";
      setAccordionExpanded(trigger, !currentlyExpanded);
    });
  }
}

function setGoModeSections(isOnGoPage) {
  if (syncNguGoSection) {
    syncNguGoSection.hidden = !isOnGoPage;
  }
  if (syncGoNguSection) {
    syncGoNguSection.hidden = !isOnGoPage;
  }
  if (customHelpersSection) {
    customHelpersSection.hidden = !isOnGoPage;
  }
  if (dangerZoneSection) {
    dangerZoneSection.hidden = !isOnGoPage;
  }

  if (isOnGoPage) {
    for (const trigger of accordionTriggers) {
      setAccordionExpanded(trigger, false);
    }
  }

  if (!isOnGoPage && helpfulLinksTrigger) {
    setAccordionExpanded(helpfulLinksTrigger, true);
  }
}

function setStatus(type, text) {
  tabStatus.className = `status status-${type}`;
  tabStatus.textContent = text;
  tabStatus.disabled = true;
  tabStatus.removeAttribute("title");
  tabStatus.classList.remove("status-action");
  pendingStatusAction = null;
}

function setStatusAction(type, text, title, onClick, variant = type) {
  tabStatus.className = `status status-${type} status-${variant} status-action`;
  tabStatus.textContent = text;
  tabStatus.disabled = false;
  tabStatus.title = title;
  pendingStatusAction = onClick;
}

function setResult(text, isError = false) {
  resultEl.textContent = text;
  resultEl.style.color = isError ? "var(--err)" : "var(--on-surface-variant)";
}

function setGoTip() {
  resultEl.textContent = "";
  resultEl.style.color = "var(--on-surface-variant)";
}

function setButtonsEnabled(enabled) {
  for (const btn of actionButtons) {
    if (btn === dangerBtn) {
      continue;
    }
    btn.disabled = !enabled;
  }
  if (!enabled) {
    dangerBtn.disabled = true;
  }
}

function refreshDangerButton() {
  const armed = Date.now() < dangerArmedUntil;
  dangerBtn.disabled = !(goTabReady && armed);
  if (armed) {
    const seconds = Math.max(1, Math.ceil((dangerArmedUntil - Date.now()) / 1000));
    armDangerBtn.textContent = `Armed (${seconds}s)`;
  } else {
    armDangerBtn.textContent = "Arm 5s Confirmation";
  }
}

function armDanger() {
  dangerArmedUntil = Date.now() + 5000;
  clearInterval(dangerTimer);
  dangerTimer = setInterval(() => {
    if (Date.now() >= dangerArmedUntil) {
      clearInterval(dangerTimer);
    }
    refreshDangerButton();
  }, 150);
  refreshDangerButton();
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function isSidePanelSupportedForTab(tab) {
  if (!tab?.id || typeof tab.windowId !== "number") {
    return false;
  }

  const window = await chrome.windows.get(tab.windowId);
  return window?.type === "normal";
}

function setSidePanelButtonEnabled(enabled, title) {
  if (!openSidePanelBtn) {
    return;
  }

  openSidePanelBtn.disabled = !enabled;
  openSidePanelBtn.title = title;
  openSidePanelBtn.setAttribute("aria-label", title);
}

function setPopoutButtonEnabled(enabled, title) {
  if (!openPopoutBtn) {
    return;
  }

  openPopoutBtn.disabled = !enabled;
  openPopoutBtn.title = title;
  openPopoutBtn.setAttribute("aria-label", title);
}

function sortTabsByLastAccessed(tabs) {
  return [...tabs].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
}

/* eslint-disable no-unused-vars */
function pickGoTab(tabs) {
  return tabs.find((tab) => tab?.url && isGoUrl(tab.url)) || null;
}
/* eslint-enable no-unused-vars */

async function findOpenGoTab() {
  const allTabs = await chrome.tabs.query({});
  const goTabs = sortTabsByLastAccessed(
    allTabs.filter((tab) => tab?.url && isGoUrl(tab.url)),
  );
  return goTabs[0] || null;
}

async function activateTab(tab) {
  if (!tab?.id) {
    return;
  }

  if (typeof tab.windowId === "number") {
    await chrome.windows.update(tab.windowId, { focused: true });
  }

  await chrome.tabs.update(tab.id, { active: true });
}

async function getBestGoTargetTab() {
  if (!isPopoutMode) {
    const currentTab = await getActiveTab();
    if (currentTab?.url && isGoUrl(currentTab.url)) {
      return currentTab;
    }

    return findOpenGoTab();
  }

  const allTabs = await chrome.tabs.query({});
  const activeGoTabs = sortTabsByLastAccessed(
    allTabs.filter((tab) => tab.active && tab.url && isGoUrl(tab.url)),
  );

  if (activeGoTabs.length) {
    return activeGoTabs[0];
  }

  const anyGoTabs = sortTabsByLastAccessed(
    allTabs.filter((tab) => tab.url && isGoUrl(tab.url)),
  );

  if (anyGoTabs.length) {
    return anyGoTabs[0];
  }

  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return currentTab || null;
}

async function openPopoutWindow() {
  const url = chrome.runtime.getURL(`${POPUP_PAGE_URL}?mode=popout`);
  await chrome.windows.create({
    url,
    type: "popup",
    width: 470,
    height: 920,
  });

  if (isPopupMode) {
    window.close();
  } else if (isSidePanelMode) {
    await closeAllSidePanels();
  }
}

async function closeAllSidePanels() {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (tab?.id) {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        enabled: false,
      });
    }
  }
}

async function closeCurrentSidePanel() {
  const currentTab = await getActiveTab();
  if (!currentTab?.id) {
    return;
  }

  await chrome.sidePanel.setOptions({
    tabId: currentTab.id,
    enabled: false,
  });
}

async function openPopupView() {
  await chrome.action.openPopup();

  if (isPopoutMode) {
    window.close();
    return;
  }

  if (isSidePanelMode) {
    await closeCurrentSidePanel();
  }
}

async function openSidePanelForTab(tab, { focusTab = true } = {}) {
  if (!tab?.id) {
    throw new Error("No active tab found to attach Side Panel.");
  }

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: SIDE_PANEL_PAGE_URL,
    enabled: true,
  });

  if (focusTab) {
    await activateTab(tab);
  }

  await chrome.sidePanel.open({ tabId: tab.id });
}

async function createGoTabAndOpenSidePanel() {
  const createdTab = await chrome.tabs.create({
    url: `https://${GO_HOST}${GO_PATH_START}`,
    active: true,
  });

  await openSidePanelForTab(createdTab, { focusTab: false });
}

async function openSidePanel() {
  const tab = (await findOpenGoTab()) || (await getActiveTab());
  await openSidePanelForTab(tab);

  setResult("Side panel opened.");

  if (isPopupMode || isPopoutMode) {
    window.close();
    return;
  }
}

function isGoUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === GO_HOST && parsed.pathname.startsWith(GO_PATH_START);
  } catch {
    return false;
  }
}

async function initialize() {
  if (isPopoutMode) {
    const tab = await getBestGoTargetTab();
    if (!tab || !tab.id || !tab.url) {
      setStatus("err", "No active tab found.");
      setButtonsEnabled(false);
      setGoModeSections(false);
      return;
    }

    activeTabId = tab.id;
    goTabReady = isGoUrl(tab.url);

    if (!goTabReady) {
      setStatus("warn", "Open Gear Optimizer tab to enable actions.");
      setButtonsEnabled(false);
      setGoModeSections(false);
      setGoTip();
      return;
    }

    setGoModeSections(true);
    setStatus("ok", "GO tab detected. Actions enabled across browser windows.");
    setButtonsEnabled(true);
    setResult("Ready.");
    refreshDangerButton();
    return;
  }

  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id || !activeTab.url) {
    setPopoutButtonEnabled(false, "Open popout window");
    setSidePanelButtonEnabled(false, "Open side panel");
    setStatus("err", "No active tab found.");
    setButtonsEnabled(false);
    setGoModeSections(false);
    return;
  }

  activeTabId = activeTab.id;
  goTabReady = isGoUrl(activeTab.url);

  const sidePanelSupported = await isSidePanelSupportedForTab(activeTab);
  setPopoutButtonEnabled(
    goTabReady,
    goTabReady
      ? "Open popout window"
      : "Popout is only available when the current tab is Gear Optimizer",
  );
  setSidePanelButtonEnabled(
    goTabReady && sidePanelSupported,
    !goTabReady
      ? "Side panel is only available when the current tab is Gear Optimizer"
      : sidePanelSupported
        ? "Open side panel"
        : "Side panel is unavailable in PWA/app windows",
  );

  if (!goTabReady) {
    const openGoTab = await findOpenGoTab();
    if (openGoTab?.id) {
      setStatusAction(
        "warn",
        "Switch to open Gear Optimizer tab",
        "Activate the most recently used Gear Optimizer tab",
        async () => {
          if (isPopupMode) {
            await openSidePanelForTab(openGoTab);
            window.close();
            return;
          }

          await activateTab(openGoTab);
        },
        "switch",
      );
      setResult("Gear Optimizer is already open in another tab.");
    } else {
      setStatusAction(
        "warn",
        "Open Gear Optimizer",
        "Open a new Gear Optimizer tab and attach the side panel after load",
        async () => {
          await createGoTabAndOpenSidePanel();

          if (isPopupMode) {
            window.close();
          }
        },
        "open",
      );
      setResult("Open a new Gear Optimizer tab to get started.");
    }
    setButtonsEnabled(false);
    setGoModeSections(false);
    return;
  }

  setGoModeSections(true);
  setStatus(
    "ok",
    isPopoutMode
      ? "GO tab detected. Actions enabled across browser windows."
      : isSidePanelMode
        ? "GO tab detected. Actions enabled in side panel."
        : "GO tab detected. Actions enabled.",
  );
  setButtonsEnabled(true);
  setResult("Ready.");
  refreshDangerButton();
}

async function refreshStateFromBrowserContext() {
  if (initializeInFlight) {
    return;
  }

  initializeInFlight = true;
  try {
    await initialize();
  } finally {
    initializeInFlight = false;
  }
}

function scheduleBrowserContextRefresh() {
  if (isPopupMode) {
    return;
  }

  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void refreshStateFromBrowserContext();
  }, 120);
}

function registerBrowserContextListeners() {
  if (chrome?.tabs?.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
      scheduleBrowserContextRefresh();
    });
  }

  if (chrome?.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
      if (changeInfo.status === "complete" || typeof changeInfo.url === "string") {
        scheduleBrowserContextRefresh();
      }
    });
  }

  if (chrome?.windows?.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        scheduleBrowserContextRefresh();
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleBrowserContextRefresh();
    }
  });
}

async function runAction(action) {
  const tab = await getBestGoTargetTab();
  if (tab?.id && tab.url && isGoUrl(tab.url)) {
    activeTabId = tab.id;
    goTabReady = true;
  }

  if (!goTabReady || !activeTabId) {
    setResult(
      isPopoutMode
        ? "Open Gear Optimizer in any tab first."
        : "Open Gear Optimizer in the active tab first.",
      true,
    );
    return;
  }

  setResult(`Running: ${action} ...`);

  try {
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      world: "MAIN",
      args: [action, HACK_HARD_CAP_BY_INDEX],
      func: async (selectedAction, hackHardCapByIndex) => {
        const applySettings = (key, value) => {
          if (
            !window.appHandlers ||
            typeof window.appHandlers.handleSettings !== "function"
          ) {
            throw new Error(
              "GO appHandlers not available. Make sure GO is fully loaded.",
            );
          }
          window.appHandlers.handleSettings(key, value);
        };

        const ensureState = (key) => {
          if (!window.appState || !(key in window.appState)) {
            throw new Error(`GO appState.${key} not available.`);
          }
          return window.appState[key];
        };

        const getJson = async (url) => {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Request failed: ${res.status} ${res.statusText}`);
          }
          return res.json();
        };

        switch (selectedAction) {
          case "custom_set_hack_targets_max": {
            const hackstats = ensureState("hackstats");
            for (const hack of hackstats.hacks) {
              const hardCap = Number(hackHardCapByIndex?.[hack.hackidx]);
              if (!Number.isFinite(hardCap)) {
                throw new Error(
                  `Missing hard cap mapping for hackidx ${hack.hackidx}.`,
                );
              }
              hack.goal = hardCap;
            }
            console.log(
              "Old hack goals:",
              hackstats.hacks.map((h) => h.goal),
            );
            applySettings("hackstats", hackstats);
            console.log(
              "New hack goals:",
              hackstats.hacks.map((h) => h.goal),
            );
            return "Set all GO hack targets to hard cap by hack index.";
          }

          case "go2ngu_loadouts": {
            await fetch("http://localhost:8088/ngu/go2ngu/loadouts", {
              method: "POST",
              body: JSON.stringify(window.appState?.savedequip),
            });
            return "Sent GO loadouts to NGU.";
          }

          case "ngu2go_equipped": {
            const payload = await getJson("http://localhost:8088/ngu/ngu2go/equipped");
            const slots = ensureState("savedequip");
            const currentSlot = slots.find((slot) => slot.name === "current");
            if (!currentSlot) {
              throw new Error('GO save slot "current" not found.');
            }
            Object.assign(currentSlot, payload);
            applySettings("savedequip", slots);
            return 'Updated GO slot "current" from NGU equipped gear.';
          }

          case "ngu2go_nakedemr": {
            const payload = await getJson("http://localhost:8088/ngu/ngu2go/nakedemr");
            const capstats = ensureState("capstats");
            Object.assign(capstats, payload);
            applySettings("capstats", capstats);
            return "Updated GO hardcap input from NGU naked EMR3.";
          }

          case "ngu2go_augstats": {
            const payload = await getJson("http://localhost:8088/ngu/NGU2GO/augstats");
            const augstats = ensureState("augstats");
            Object.assign(augstats, payload);
            applySettings("augstats", augstats);
            return "Updated GO aug stats from NGU.";
          }

          case "ngu2go_ngustats": {
            const payload = await getJson("http://localhost:8088/ngu/NGU2GO/ngustats");
            const ngustats = ensureState("ngustats");
            Object.assign(ngustats, payload);
            applySettings("ngustats", ngustats);
            return "Updated GO NGU stats from NGU.";
          }

          case "ngu2go_hacks_with_targets": {
            const payload = await getJson("http://localhost:8088/ngu/ngu2go/hacks");
            const hackstats = ensureState("hackstats");
            hackstats.rpow = payload.rpow;
            hackstats.rcap = payload.rcap;
            hackstats.hackspeed = payload.hackspeed;
            for (let i = 0; i < 15; i += 1) {
              hackstats.hacks[i].goal = payload.hacks[i].level;
              hackstats.hacks[i].level = payload.hacks[i].level;
              hackstats.hacks[i].reducer = payload.hacks[i].reducer;
            }
            applySettings("hackstats", hackstats);
            return "Updated hack stats and reset targets to current levels.";
          }

          case "ngu2go_hacks_no_targets": {
            const payload = await getJson("http://localhost:8088/ngu/ngu2go/hacks");
            const hackstats = ensureState("hackstats");
            hackstats.rpow = payload.rpow;
            hackstats.rcap = payload.rcap;
            hackstats.hackspeed = payload.hackspeed;
            for (let i = 0; i < 15; i += 1) {
              hackstats.hacks[i].level = payload.hacks[i].level;
              hackstats.hacks[i].reducer = payload.hacks[i].reducer;
            }
            applySettings("hackstats", hackstats);
            return "Updated hack stats while keeping GO targets unchanged.";
          }

          case "go2ngu_hacktargets": {
            const hackstats = ensureState("hackstats");
            await fetch("http://localhost:8088/ngu/go2ngu/hacks", {
              method: "POST",
              body: JSON.stringify(hackstats.hacks.map((h) => h.goal)),
            });
            return "Sent GO hack targets to NGU.";
          }

          case "ngu2go_wishstats": {
            const payload = await getJson("http://localhost:8088/ngu/NGU2GO/wishstats");
            const wishstats = ensureState("wishstats");
            Object.assign(wishstats, payload);
            applySettings("wishstats", wishstats);
            return "Updated GO wish stats from NGU.";
          }

          default:
            throw new Error(`Unknown action: ${selectedAction}`);
        }
      },
    });

    const message = injectionResult?.result || "Done.";
    setResult(message);

    if (action === "ngu2go_hacks_with_targets") {
      dangerArmedUntil = 0;
      refreshDangerButton();
    }
  } catch (error) {
    setResult(error?.message || String(error), true);
  }
}

for (const btn of actionButtons) {
  btn.addEventListener("click", () => {
    runAction(btn.dataset.action);
  });
}

armDangerBtn.addEventListener("click", armDanger);
themeToggleBtn.addEventListener("click", toggleTheme);

if (openPopoutBtn) {
  openPopoutBtn.addEventListener("click", async () => {
    try {
      await openPopoutWindow();
    } catch (error) {
      setResult(error?.message || String(error), true);
    }
  });
}

if (openSidePanelBtn) {
  openSidePanelBtn.addEventListener("click", async () => {
    try {
      await openSidePanel();
    } catch (error) {
      setResult(error?.message || String(error), true);
    }
  });
}

if (openPopupBtn) {
  openPopupBtn.addEventListener("click", async () => {
    try {
      await openPopupView();
    } catch (error) {
      setResult(error?.message || String(error), true);
    }
  });
}

tabStatus.addEventListener("click", async () => {
  if (typeof pendingStatusAction !== "function") {
    return;
  }

  try {
    await pendingStatusAction();
  } catch (error) {
    setResult(error?.message || String(error), true);
  }
});

applySystemPrimaryColor();
applyLayoutMode();
applyTheme(getStoredTheme());
initializeAccordions();
populatePopupMetaFooter();
registerBrowserContextListeners();

void refreshStateFromBrowserContext();
