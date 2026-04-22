document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const exportBtn = document.getElementById('export-csv');
    const scanStatusText = document.getElementById('scan-status');
    const statusDot = document.querySelector('.dot');

    const statsEls = {
        total: document.getElementById('stat-total'),
        valid: document.getElementById('stat-valid'),
        broken: document.getElementById('stat-broken'),
        redirected: document.getElementById('stat-redirected'),
        warning: document.getElementById('stat-warning')
    };

    let currentStats = { total: 0, valid: 0, broken: 0, redirected: 0, warning: 0 };

    // Initial check for active tab and its stats from background
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab) {
            // Set dynamic placeholder for exclusions based on current domain
            const url = new URL(activeTab.url);
            const domain = url.hostname.replace('www.', '');
            document.getElementById('exclusions').placeholder = `e.g. ${domain}, twitter.com`;
            
            // Get state from background
            chrome.runtime.sendMessage({ action: 'getTabState', tabId: activeTab.id }, (response) => {
                if (response) {
                    updateUI(response.stats);
                    setScanningState(response.isScanning);
                }
            });
        }
    });

    startBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startScan' }, (response) => {
                setScanningState(true);
            });
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScan' }, (response) => {
                setScanningState(false);
            });
        });
    });

    exportBtn.addEventListener('click', () => {
        exportToCSV();
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'updateStats' || request.action === 'statsUpdated') {
            // Only update if it's the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && (request.tabId === tabs[0].id || !request.tabId)) {
                    updateUI(request.stats);
                    setScanningState(request.isScanning);
                }
            });
        }
    });

    function setScanningState(isScanning) {
        startBtn.disabled = isScanning;
        stopBtn.disabled = !isScanning;
        scanStatusText.textContent = isScanning ? 'Scanning...' : 'Ready';
        statusDot.className = isScanning ? 'dot active' : 'dot';
        
        if (isScanning) {
            startBtn.classList.add('scanning');
        } else {
            startBtn.classList.remove('scanning');
        }
    }

    function updateUI(stats) {
        currentStats = stats;
        statsEls.total.textContent = stats.total;
        statsEls.valid.textContent = stats.valid;
        statsEls.broken.textContent = stats.broken;
        statsEls.redirected.textContent = stats.redirected;
        statsEls.warning.textContent = stats.warning;
    }

    function exportToCSV() {
        const rows = [
            ["Metric", "Count"],
            ["Total Links", currentStats.total],
            ["Valid", currentStats.valid],
            ["Broken", currentStats.broken],
            ["Redirected", currentStats.redirected],
            ["Warnings", currentStats.warning]
        ];

        let csvContent = "data:text/csv;charset=utf-8," 
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "link_checker_pro_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
