const tabStats = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : request.tabId;

  if (request.action === 'checkLink') {
    validateLink(request.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ status: 0, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'updateStats') {
    tabStats[tabId] = {
      stats: request.stats,
      isScanning: request.isScanning
    };
    // Broadcast to popup if open (suppress error if popup is closed)
    chrome.runtime.sendMessage({ 
      action: 'statsUpdated', 
      stats: request.stats, 
      isScanning: request.isScanning, 
      tabId: tabId 
    }).catch(() => {
        // Silently catch the "Receiving end does not exist" error when popup is closed
    });
  }

  if (request.action === 'getTabState') {
    sendResponse(tabStats[request.tabId] || { stats: { total: 0, valid: 0, broken: 0, warning: 0, redirected: 0 }, isScanning: false });
  }
});

async function validateLink(url) {
  try {
    // Try HEAD request first for speed
    let response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Link Checker Pro (Chrome Extension)' }
    });

    // If HEAD is not allowed (405) or other issues, try GET
    if (response.status === 405 || response.status === 404 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Link Checker Pro (Chrome Extension)' }
      });
    }

    return {
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      finalUrl: response.url
    };
  } catch (error) {
    console.error(`Error checking ${url}:`, error);
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}
