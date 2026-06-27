const GO_URL_START = "https://gmiclotte.github.io/gear-optimizer";
const SIDE_PANEL_PATH = "src/popup/popup.html?mode=sidepanel";

function isGoUrl(url) {
  return typeof url === "string" && url.startsWith(GO_URL_START);
}

async function configureForTab(tab) {
  if (!tab?.id) {
    return;
  }

  const onGo = isGoUrl(tab.url);
  const window = await chrome.windows.get(tab.windowId);
  const supportsActionSidePanel = window?.type === "normal";
  const shouldOpenSidePanelOnActionClick = onGo && supportsActionSidePanel;

  try {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: SIDE_PANEL_PATH,
      enabled: shouldOpenSidePanelOnActionClick,
    });

    if (chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: shouldOpenSidePanelOnActionClick,
      });
    }
  } catch (err) {
    console.error("SidePanel configuration error:", err);
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab?.id) {
    return;
  }

  if (
    tab.active &&
    (changeInfo.status === "complete" || typeof changeInfo.url === "string")
  ) {
    await configureForTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  await configureForTab(tab);
});

chrome.runtime.onStartup.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await configureForTab(tab);
});

chrome.runtime.onInstalled.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await configureForTab(tab);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, windowId });
  await configureForTab(tabs[0]);
});
