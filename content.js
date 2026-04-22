let isScanning = false;
let stats = { total: 0, valid: 0, broken: 0, warning: 0, redirected: 0 };
let currentLinks = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScan') {
        if (!isScanning) startScan();
        sendResponse({ status: 'started' });
    } else if (request.action === 'getStats') {
        sendResponse(stats);
    } else if (request.action === 'stopScan') {
        stopScan();
        sendResponse({ status: 'stopped' });
    }
});

function resetStats() {
    stats = { total: 0, valid: 0, broken: 0, warning: 0, redirected: 0 };
    // Remove existing badges
    document.querySelectorAll('.lcp-status-badge').forEach(b => b.remove());
    document.querySelectorAll('.lcp-link-highlight').forEach(l => {
        l.classList.remove('lcp-link-highlight', 'lcp-link-broken');
    });
}

async function startScan() {
    resetStats();
    isScanning = true;

    const links = Array.from(document.querySelectorAll('a[href]'));
    // Filter out common non-link hrefs
    const validLinks = links.filter(link => {
        const href = link.getAttribute('href');
        return href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:');
    });

    stats.total = validLinks.length;
    updatePopupStats();

    for (const link of validLinks) {
        if (!isScanning) break;

        const url = link.href;
        checkLinkStatus(link, url);
        // Add a small delay to prevent massive spikes
        await new Promise(r => setTimeout(r, 100));
    }

    isScanning = false;
}

function stopScan() {
    isScanning = false;
}

async function checkLinkStatus(element, url) {
    chrome.runtime.sendMessage({ action: 'checkLink', url: url }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        processResult(element, response);
    });
}

function processResult(element, result) {
    const badge = document.createElement('span');
    badge.className = 'lcp-status-badge';
    
    if (result.status === 200) {
        badge.textContent = '200';
        badge.classList.add('lcp-status-200');
        element.classList.add('lcp-link-highlight');
        stats.valid++;
    } else if (result.status >= 300 && result.status < 400) {
        badge.textContent = result.status;
        badge.classList.add('lcp-status-301');
        stats.redirected++;
    } else if (result.status === 404) {
        badge.textContent = '404';
        badge.classList.add('lcp-status-404');
        element.classList.add('lcp-link-broken');
        stats.broken++;
    } else if (result.status === 0) {
        badge.textContent = 'ERR';
        badge.classList.add('lcp-status-warning');
        stats.warning++;
    } else {
        badge.textContent = result.status || '???';
        badge.classList.add('lcp-status-warning');
        stats.warning++;
    }

    element.appendChild(badge);
    updatePopupStats();
}

function updatePopupStats() {
    chrome.runtime.sendMessage({ 
        action: 'updateStats', 
        stats: stats,
        isScanning: isScanning
    });
}
