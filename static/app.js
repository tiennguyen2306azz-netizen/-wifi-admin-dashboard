let pingChart = null;
let speedChart = null;

const maxChartPoints = 20;

let timeLabels = [];
let gatewayPingData = [];
let googlePingData = [];

let speedTimeLabels = [];
let downloadSpeedData = [];
let uploadSpeedData = [];

let allDevicesList = [];
let activeCategoryFilter = 'all';

let lastHealthStatus = "";
let currentActiveSSID = "";
let currentActiveGateway = "";

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    initSpeedChart();

    await fetchData();
    
    // Step 1: Render existing cached devices instantly (0ms delay!)
    await fetchDevices(false);
    
    // Step 2: Trigger background deep subnet sweep
    fetchDevices(true);

    fetchNearbyWifi();
    updateQRCode();

    // Auto refresh network ping status every 4 seconds
    setInterval(fetchPingAndStatus, 4000);

    // Continuous Real-Time Speed & Health Scanner (Cập nhật mỗi 1 giây)
    setInterval(fetchRealtimeSpeed, 1000);
});

function initChart() {
    const ctx = document.getElementById('pingChart').getContext('2d');
    pingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Router Gateway',
                    data: gatewayPingData,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Google DNS (8.8.8.8)',
                    data: googlePingData,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
                x: {
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: {
                    min: 0,
                    suggestedMax: 50,
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        callback: (val) => val + ' ms'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ms`
                    }
                }
            }
        }
    });
}

function initSpeedChart() {
    const ctx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: speedTimeLabels,
            datasets: [
                {
                    label: 'Download (Mbps)',
                    data: downloadSpeedData,
                    borderColor: '#34d399',
                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 2
                },
                {
                    label: 'Upload (Mbps)',
                    data: uploadSpeedData,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 200 },
            scales: {
                x: {
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                },
                y: {
                    min: 0,
                    suggestedMax: 5,
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 9 },
                        callback: (val) => val + ' Mbps'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} Mbps`
                    }
                }
            }
        }
    });
}

async function fetchRealtimeSpeed() {
    try {
        const res = await fetch('/api/realtime-speed');
        const data = await res.json();

        const dlMbps = data.download_mbps || 0;
        const ulMbps = data.upload_mbps || 0;
        const dlKbps = data.download_kbps || 0;
        const ulKbps = data.upload_kbps || 0;

        document.getElementById('live-dl-mbps').textContent = dlMbps.toFixed(2);
        document.getElementById('live-ul-mbps').textContent = ulMbps.toFixed(2);

        document.getElementById('live-dl-kbps').textContent = `${dlKbps.toFixed(1)} KB/s`;
        document.getElementById('live-ul-kbps').textContent = `${ulKbps.toFixed(1)} KB/s`;

        // Update Health Analysis Banner
        document.getElementById('health-status-text').textContent = data.health_status;
        document.getElementById('health-score').textContent = data.stability_score;
        document.getElementById('health-jitter').textContent = data.jitter_ms;
        document.getElementById('health-recommendation').textContent = data.recommendation;

        const iconBg = document.getElementById('health-icon-bg');
        const statusText = document.getElementById('health-status-text');

        if (data.status_color === 'emerald') {
            statusText.className = "text-xl font-black text-emerald-400";
            iconBg.className = "w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl";
        } else if (data.status_color === 'sky') {
            statusText.className = "text-xl font-black text-sky-400";
            iconBg.className = "w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-2xl";
        } else if (data.status_color === 'amber') {
            statusText.className = "text-xl font-black text-amber-400";
            iconBg.className = "w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl";
        } else {
            statusText.className = "text-xl font-black text-rose-400";
            iconBg.className = "w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl";
        }

        // Timeline Log Entry
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        if (lastHealthStatus !== data.health_status || Math.random() < 0.12) {
            lastHealthStatus = data.health_status;
            addFluctuationLog(`[${timeStr}] Mạng (${data.active_ssid || 'Wi-Fi'}): ${data.health_status} | Ping: ${data.ping_gateway_ms || 1.0}ms | DL ${dlMbps}Mbps / UL ${ulMbps}Mbps`);
        }

        if (speedTimeLabels.length >= maxChartPoints) {
            speedTimeLabels.shift();
            downloadSpeedData.shift();
            uploadSpeedData.shift();
        }

        speedTimeLabels.push(timeStr);
        downloadSpeedData.push(dlMbps);
        uploadSpeedData.push(ulMbps);

        if (speedChart) {
            speedChart.update();
        }

    } catch (e) {
        console.error("Lỗi đo tốc độ thời gian thực:", e);
    }
}

function addFluctuationLog(message) {
    const logBox = document.getElementById('fluctuation-log');
    const item = document.createElement('div');
    item.className = "flex items-center space-x-2 py-0.5 border-b border-slate-900/60";

    let dotColor = "text-emerald-400";
    if (message.includes("YẾU") || message.includes("LAG")) dotColor = "text-rose-400 animate-ping";
    else if (message.includes("DAO ĐỘNG")) dotColor = "text-amber-400";

    item.innerHTML = `<span class="${dotColor}">•</span> <span>${message}</span>`;
    
    if (logBox.children.length === 1 && logBox.children[0].classList.contains("italic")) {
        logBox.innerHTML = '';
    }

    logBox.prepend(item);
}

async function runSpeedtest() {
    const modal = document.getElementById('speedtest-modal');
    const loading = document.getElementById('speedtest-loading');
    const result = document.getElementById('speedtest-result');

    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    result.classList.add('hidden');

    try {
        const res = await fetch('/api/run-speedtest');
        const data = await res.json();

        document.getElementById('st-dl').textContent = data.download_mbps || '0.00';
        document.getElementById('st-ul').textContent = data.upload_mbps || '0.00';
        document.getElementById('st-ping-gw').textContent = `${data.ping_gateway_ms} ms`;
        document.getElementById('st-ping-inet').textContent = `${data.ping_internet_ms} ms`;

        loading.classList.add('hidden');
        result.classList.remove('hidden');
    } catch (e) {
        alert("Lỗi khi đo tốc độ băng thông mạng.");
        modal.classList.add('hidden');
    }
}

function closeSpeedtestModal() {
    document.getElementById('speedtest-modal').classList.add('hidden');
}

async function fetchData() {
    fetchPingAndStatus();
}

async function fetchPingAndStatus() {
    try {
        const resStatus = await fetch('/api/wifi-status');
        const data = await resStatus.json();

        const ssid = data.ssid || 'Wi-Fi Network';
        const gateway = data.gateway || '192.168.1.1';

        document.getElementById('val-ssid').textContent = ssid;
        document.getElementById('val-radio').textContent = data.radio_type || 'N/A';
        document.getElementById('val-band-badge').textContent = data.band || '5 GHz';
        document.getElementById('val-signal').textContent = (data.signal || 0) + '%';
        document.getElementById('val-rssi').textContent = `(${data.rssi || -100} dBm)`;
        document.getElementById('bar-signal').style.width = (data.signal || 0) + '%';

        document.getElementById('val-txrate').textContent = data.tx_rate || 0;
        document.getElementById('val-rxrate').textContent = (data.rx_rate || 0) + ' Mbps';

        document.getElementById('val-gateway').textContent = gateway;
        document.getElementById('val-channel').textContent = data.channel || 'N/A';
        document.getElementById('val-auth').textContent = data.auth || 'WPA2';

        document.getElementById('header-local-ip').textContent = data.ip_address || '192.168.1.13';
        document.getElementById('header-status').textContent = `Kết nối: ${ssid} (${data.radio_type})`;

        // Check if Wi-Fi network changed!
        if (currentActiveSSID !== "" && (currentActiveSSID !== ssid || currentActiveGateway !== gateway)) {
            addFluctuationLog(`[Chuyển Mạng Wi-Fi] Phát hiện chuyển sang Wi-Fi mới: ${ssid} (Gateway ${gateway})`);
            fetchDevices(true);
            fetchNearbyWifi();
            updateQRCode();
        }

        currentActiveSSID = ssid;
        currentActiveGateway = gateway;

        const resPing = await fetch(`/api/ping-test?gateway=${gateway}`);
        const pingData = await resPing.json();

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        const gwLat = pingData.gateway.latency_ms !== null ? pingData.gateway.latency_ms : 0;
        const googleLat = pingData.google_dns.latency_ms !== null ? pingData.google_dns.latency_ms : 0;

        if (timeLabels.length >= maxChartPoints) {
            timeLabels.shift();
            gatewayPingData.shift();
            googlePingData.shift();
        }

        timeLabels.push(timeStr);
        gatewayPingData.push(gwLat);
        googlePingData.push(googleLat);

        if (pingChart) {
            pingChart.data.datasets[0].label = `Router (${gateway})`;
            pingChart.update();
        }

    } catch (e) {
        console.error("Lỗi cập nhật dữ liệu Wi-Fi:", e);
    }
}

async function fetchDevices(deepScan = false) {
    const progressBar = document.getElementById('scan-progress-bar');

    if (deepScan) {
        progressBar.classList.remove('hidden');
    }

    try {
        const url = `/api/network-devices?deep_scan=${deepScan ? 'true' : 'false'}`;
        const res = await fetch(url);
        const data = await res.json();

        allDevicesList = data.devices || [];
        updateCategoryCounters();
        renderDevicesGrid();

    } catch (e) {
        console.error("Lỗi tải danh sách thiết bị:", e);
    } finally {
        progressBar.classList.add('hidden');
    }
}

function updateCategoryCounters() {
    let cntAll = allDevicesList.length;
    let cntPhone = 0;
    let cntPc = 0;
    let cntRouter = 0;
    let cntIot = 0;

    allDevicesList.forEach(d => {
        if (d.category === 'Điện thoại') cntPhone++;
        else if (d.category === 'Máy tính') cntPc++;
        else if (d.category === 'Router') cntRouter++;
        else if (d.category === 'Smart Home') cntIot++;
    });

    document.getElementById('cnt-all').textContent = cntAll;
    document.getElementById('cnt-phone').textContent = cntPhone;
    document.getElementById('cnt-pc').textContent = cntPc;
    document.getElementById('cnt-router').textContent = cntRouter;
    document.getElementById('cnt-iot').textContent = cntIot;
    document.getElementById('devices-count').textContent = cntAll;
}

function filterCategory(cat) {
    activeCategoryFilter = cat;
    
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.remove('bg-cyan-500', 'text-slate-950');
        btn.classList.add('bg-slate-800', 'text-slate-400');
    });

    let activePillId = 'pill-all';
    if (cat === 'Điện thoại') activePillId = 'pill-phone';
    else if (cat === 'Máy tính') activePillId = 'pill-pc';
    else if (cat === 'Router') activePillId = 'pill-router';
    else if (cat === 'Smart Home') activePillId = 'pill-iot';

    const btn = document.getElementById(activePillId);
    if (btn) {
        btn.classList.remove('bg-slate-800', 'text-slate-400');
        btn.classList.add('bg-cyan-500', 'text-slate-950');
    }

    renderDevicesGrid();
}

function renderDevicesGrid() {
    const grid = document.getElementById('devices-grid');

    const filtered = allDevicesList.filter(d => {
        if (activeCategoryFilter === 'all') return true;
        return d.category === activeCategoryFilter;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-slate-500">
                Không tìm thấy thiết bị thuộc mục này.
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(dev => {
        const isOnline = dev.status === 'Online';
        const statusBadge = isOnline 
            ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">Online</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">Chờ / Off</span>';

        const borderClass = dev.is_self 
            ? 'border-cyan-500/60 bg-cyan-950/20' 
            : (dev.is_gateway ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800 bg-slate-900/40');

        html += `
            <div class="rounded-xl border ${borderClass} p-4 flex flex-col justify-between space-y-3 hover:border-cyan-500/40 transition-all">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                            <i class="fa-solid ${dev.icon}"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-100 text-sm flex items-center space-x-1">
                                <span>${dev.display_name}</span>
                                <button onclick="openRenameModal('${dev.ip}', '${dev.display_name}')" title="Đổi tên gợi nhớ" class="text-slate-500 hover:text-cyan-400 text-xs ml-1">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                            </h3>
                            <p class="text-[11px] text-slate-400">${dev.device_type}</p>
                        </div>
                    </div>
                    ${statusBadge}
                </div>

                <div class="space-y-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono">
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-sans">Địa chỉ IP:</span>
                        <strong class="text-cyan-300">${dev.ip}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-sans">Địa chỉ MAC:</span>
                        <span class="text-slate-300 text-[11px]">${dev.mac}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-sans">Nhà sản xuất:</span>
                        <span class="text-slate-300 font-sans truncate max-w-[140px] text-right">${dev.vendor}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Phân loại: <strong class="text-slate-200">${dev.category}</strong></span>
                    <span>Ping: <strong class="${isOnline ? 'text-emerald-400' : 'text-slate-500'} font-mono">${dev.latency_ms ? dev.latency_ms.toFixed(1) + ' ms' : '--'}</strong></span>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

async function fetchNearbyWifi() {
    const container = document.getElementById('nearby-wifi-container');
    container.innerHTML = `
        <div class="col-span-3 text-center py-6 text-slate-400">
            <i class="fa-solid fa-spinner animate-spin text-cyan-400 text-lg mr-2"></i> Đang quét các mạng Wi-Fi lân cận...
        </div>
    `;

    try {
        const res = await fetch('/api/nearby-wifi');
        const data = await res.json();

        if (!data.networks || data.networks.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-6 text-slate-500">
                    Không tìm thấy mạng Wi-Fi nào khác xung quanh.
                </div>
            `;
            return;
        }

        let html = '';
        data.networks.forEach(net => {
            const isCurrent = net.ssid === currentActiveSSID || net.ssid.includes("XUANTIEN");
            const cardBorder = isCurrent ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/40';

            let bssidInfo = '';
            if (net.bssids && net.bssids.length > 0) {
                net.bssids.forEach(b => {
                    bssidInfo += `
                        <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-800/40">
                            <span>Băng tần: <strong class="text-slate-200">${b.band}</strong></span>
                            <span>Kênh: <strong class="text-amber-400">${b.channel}</strong></span>
                            <span>Sóng: <strong class="text-emerald-400">${b.signal}%</strong></span>
                        </div>
                    `;
                });
            }

            html += `
                <div class="p-4 rounded-xl border ${cardBorder} flex flex-col justify-between space-y-2">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-2">
                            <i class="fa-solid fa-wifi ${isCurrent ? 'text-cyan-400' : 'text-slate-400'}"></i>
                            <span class="font-bold text-slate-100">${net.ssid}</span>
                        </div>
                        ${isCurrent ? '<span class="px-2 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-400 rounded font-bold">MẠNG ĐANG DÙNG</span>' : ''}
                    </div>
                    <div class="text-xs text-slate-400">
                        Bảo mật: <span class="text-slate-300">${net.auth}</span>
                    </div>
                    ${bssidInfo}
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-6 text-rose-400">
                Lỗi khi quét mạng Wi-Fi lân cận.
            </div>
        `;
    }
}

function openRenameModal(ip, currentName) {
    document.getElementById('rename-ip').value = ip;
    document.getElementById('rename-name').value = currentName;
    document.getElementById('rename-modal').classList.remove('hidden');
}

function closeRenameModal() {
    document.getElementById('rename-modal').classList.add('hidden');
}

async function submitRenameDevice() {
    const ip = document.getElementById('rename-ip').value;
    const name = document.getElementById('rename-name').value;

    try {
        await fetch('/api/rename-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, name })
        });

        closeRenameModal();
        fetchDevices(false);
    } catch (e) {
        alert("Lỗi khi lưu tên gợi nhớ");
    }
}

function togglePasswordInput() {
    const container = document.getElementById('pw-input-container');
    container.classList.toggle('hidden');
}

async function updateQRCode() {
    const ssid = document.getElementById('val-ssid').textContent || currentActiveSSID || 'Wi-Fi Network';
    const password = document.getElementById('qr-password-input')?.value || '';

    try {
        const res = await fetch(`/api/qr-code?ssid=${encodeURIComponent(ssid)}&password=${encodeURIComponent(password)}`);
        const data = await res.json();

        document.getElementById('qr-image').src = data.qr_base64;
        document.getElementById('qr-ssid-display').textContent = ssid;
    } catch (e) {
        console.error("Lỗi tạo mã QR:", e);
    }
}
