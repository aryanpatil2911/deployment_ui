const deploymentLogsPath = "../applications";
const deploymentLogsIndexUrl = `${deploymentLogsPath}/index.json`;
let deployments = [];

function parseCSV(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0]
        .split(",")
        .map(h => h.replace(/"/g, "").trim());
    return lines.slice(1).map(line => {
        const values = line
            .split(",")
            .map(v => v.replace(/"/g, "").trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || "";
        });
        return row;
    });
}

async function loadData() {
    try {
        const indexResponse = await fetch(deploymentLogsIndexUrl);
        if (!indexResponse.ok) throw new Error(`Unable to load ${deploymentLogsIndexUrl}`);

        const folderItems = await indexResponse.json();
        const files = (Array.isArray(folderItems) ? folderItems : folderItems.files || [])
            .filter(fileName => typeof fileName === "string" && fileName.toLowerCase().endsWith(".csv"));

        deployments = [];
        for (const file of files) {
            const fileResponse = await fetch(`${deploymentLogsPath}/${file}`);
            if (!fileResponse.ok) continue;
            const text = await fileResponse.text();
            deployments.push(...parseCSV(text));
        }

        loadFilters();
        renderTable();
    } catch (error) {
        console.error(error);
        document.getElementById("tableContainer").innerHTML = 
            `<div class="text-red-500 text-center py-12">Failed to load deployment data</div>`;
    }
}

function loadFilters() {
    fillSelect("clientFilter", [...new Set(deployments.map(x => x.Client))]);
    fillSelect("applicationFilter", [...new Set(deployments.map(x => x.Application))]);
    fillSelect("versionFilter", [...new Set(deployments.map(x => x.Version))]);
    fillSelect("environmentFilter", [...new Set(deployments.map(x => x.Environment))]);
}

function fillSelect(id, values) {
    const select = document.getElementById(id);
    values
        .filter(Boolean)
        .sort()
        .forEach(value => {
            select.innerHTML += `<option value="${value}">${value}</option>`;
        });
}

function renderTable() {
    const search = document.getElementById("search").value.toLowerCase();
    const client = document.getElementById("clientFilter").value;
    const application = document.getElementById("applicationFilter").value;
    const version = document.getElementById("versionFilter").value;
    const environment = document.getElementById("environmentFilter").value;

    const rows = deployments.filter(row => {
        const matchSearch = !search ||
            (row.Client && row.Client.toLowerCase().includes(search)) ||
            (row.Application && row.Application.toLowerCase().includes(search)) ||
            (row.Version && row.Version.toLowerCase().includes(search)) ||
            (row.Environment && row.Environment.toLowerCase().includes(search));

        return matchSearch &&
            (!client || row.Client === client) &&
            (!application || row.Application === application) &&
            (!version || row.Version === version) &&
            (!environment || row.Environment === environment);
    });

    document.getElementById("tableContainer").innerHTML = `
        <table class="w-full">
            <thead>
                <tr class="bg-slate-900 border-b border-slate-700">
                    <th class="p-4 text-left font-medium text-slate-300">Client</th>
                    <th class="p-4 text-left font-medium text-slate-300">Application</th>
                    <th class="p-4 text-left font-medium text-slate-300">Version</th>
                    <th class="p-4 text-left font-medium text-slate-300">Environment</th>
                    <th class="p-4 text-left font-medium text-slate-300">Status</th>
                    <th class="p-4 text-left font-medium text-slate-300">Deployment Time</th>
                    <th class="p-4 text-left font-medium text-slate-300">Triggered By</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
                ${rows.map(row => `
                    <tr class="hover:bg-slate-800/70 transition-colors table-row">
                        <td class="p-4">${row.Client || "-"}</td>
                        <td class="p-4">${row.Application || "-"}</td>
                        <td class="p-4 font-mono">${row.Version || "-"}</td>
                        <td class="p-4">
                            <span class="px-3 py-1 rounded-full text-xs font-medium ${
                                row.Environment === 'PROD'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                    : 'bg-blue-500/20 text-blue-400'
                            }">
                                ${row.Environment || "-"}
                            </span>
                        </td>
                        <td class="p-4">
                            <span class="${
                                row.DeploymentStatus === "Succeeded"
                                    ? "text-emerald-500" 
                                    : "text-red-500"
                            } font-medium">
                                ${row.DeploymentStatus || "-"}
                            </span>
                        </td>
                        <td class="p-4 text-slate-400">${row.DeploymentDateTime || "-"}</td>
                        <td class="p-4 text-slate-400">${row.TriggeredBy || "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        ${rows.length === 0 ? 
            `<div class="text-center py-12 text-slate-400">No deployments found</div>` : 
            ''}
    `;
}

// Event Listeners
document.getElementById("search").addEventListener("input", renderTable);
document.getElementById("clientFilter").addEventListener("change", renderTable);
document.getElementById("applicationFilter").addEventListener("change", renderTable);
document.getElementById("versionFilter").addEventListener("change", renderTable);
document.getElementById("environmentFilter").addEventListener("change", renderTable);

// Initial load
loadData();