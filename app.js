const deploymentLogsPath = "../applications";
const deploymentLogsIndexUrl = `${deploymentLogsPath}/index.json`;

let deployments = [];

async function loadData() {
    const container = document.getElementById('dashboard');
    container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">Loading deployments...</div>`;

    try {
        const res = await fetch(deploymentLogsIndexUrl);
        if (!res.ok) throw new Error("index.json not found");

        const files = await res.json();
        deployments = [];
        for (const file of files) {
            if (!file.endsWith('.csv')) continue;
            const fileRes = await fetch(`${deploymentLogsPath}/${file}`);
            if (!fileRes.ok) continue;
            const text = await fileRes.text();
            deployments.push(...parseCSV(text));
        }

        populateAppDropdown();
        renderTable();
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="col-span-full text-red-400 text-center py-20">Failed to load data</div>`;
    }
}

function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    return lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.replace(/"/g, "").trim());
        const row = {};
        headers.forEach((h, i) => row[h] = values[i] || "");
        return row;
    });
}

function populateAppDropdown() {
    const apps = [...new Set(deployments.map(d => d.Application).filter(Boolean))].sort();
    const select = document.getElementById('appFilter');
    select.innerHTML = `<option value="">All Applications</option>`;
    apps.forEach(app => select.innerHTML += `<option value="${app}">${app}</option>`);
}

function renderTable() {
    const selectedApp = document.getElementById('appFilter').value;
    let filtered = selectedApp ? deployments.filter(d => d.Application === selectedApp) : deployments;

    const grouped = {};
    filtered.forEach(row => {
        const key = `${row.Client}-${row.Application}`;
        if (!grouped[key]) grouped[key] = { client: row.Client, app: row.Application, uat: "-", prod: "-" };
        if (row.Environment === "UAT") grouped[key].uat = row.Version;
        if (row.Environment === "PROD") grouped[key].prod = row.Version;
    });

    let html = '';
    Object.values(grouped).forEach(item => {
        html += `
            <div class="deployment-card bg-slate-900 border border-slate-700 rounded-3xl p-8">
                <div class="flex justify-between mb-8">
                    <div>
                        <div class="text-xs uppercase tracking-widest text-slate-400">CLIENT</div>
                        <div class="text-2xl font-bold">${item.client}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs uppercase tracking-widest text-slate-400">APPLICATION</div>
                        <div class="text-3xl font-black text-red-400">${item.app}</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-10">
                    <!-- UAT -->
                    <div>
                        <div class="text-xs font-bold text-blue-400 mb-2">UAT</div>
                        <div class="text-5xl font-mono font-bold text-blue-400 mb-6">${item.uat}</div>
                        <div class="flex flex-col gap-2">
                            <button onclick="handlePromote('${item.client}', '${item.app}', '${item.uat}')" class="py-3 bg-green-600 hover:bg-green-700 rounded-2xl text-sm">Promote to PROD</button>
                            <button onclick="handleRollback('${item.client}', '${item.app}', '${item.uat}')" class="py-3 bg-red-600 hover:bg-red-700 rounded-2xl text-sm">Rollback</button>
                            <button onclick="handleUpgrade('${item.client}', '${item.app}', '${item.uat}')" class="py-3 bg-amber-600 hover:bg-amber-700 rounded-2xl text-sm">Upgrade</button>
                        </div>
                    </div>

                    <!-- PROD -->
                    <div>
                        <div class="text-xs font-bold text-amber-400 mb-2">PROD</div>
                        <div class="text-5xl font-mono font-bold text-amber-400 mb-6">${item.prod}</div>
                        <div class="flex flex-col gap-2">
                            <button onclick="handleRollback('${item.client}', '${item.app}', '${item.prod}')" class="py-3 bg-red-600 hover:bg-red-700 rounded-2xl text-sm">Rollback</button>
                            <button onclick="handleUpgrade('${item.client}', '${item.app}', '${item.prod}')" class="py-3 bg-amber-600 hover:bg-amber-700 rounded-2xl text-sm">Upgrade</button>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('dashboard').innerHTML = html || `<div class="text-center py-20 text-slate-400">No deployments found</div>`;
}

// Placeholder handlers
function handlePromote(client, app, version) { alert(`Promote ${client} | ${app} v${version} to PROD`); }
function handleRollback(client, app, version) { alert(`Rollback ${client} | ${app} v${version}`); }
function handleUpgrade(client, app, version) { alert(`Upgrade ${client} | ${app} from v${version}`); }

window.onload = loadData;