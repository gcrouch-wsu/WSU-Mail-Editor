const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const SIS_RE = /\b\d{6,10}\b/;
const TOTAL_ACTIVITY_RE = /^\d{1,3}:\d{2}(?::\d{2})?$/;
const MONTH_RE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

const ROLE_VALUES = new Set([
    "Student",
    "Teacher",
    "TA",
    "Observer",
    "Designer",
    "Librarian",
    "Admin",
    "Administrator",
    "Instructor",
]);

const IGNORED_LINES = new Set(["All Roles", "Search people", "EveryoneGroups"]);

function cleanLines(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

function findTableStart(lines) {
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.includes("Profile Picture") && line.includes("Login ID") && line.includes("SIS ID")) {
            return i + 1;
        }
    }
    return 0;
}

function isSectionLine(line) {
    return line.includes("CONT-") || line.includes("NCR") || line.includes("Grad School");
}

function isLastActivity(line) {
    return line.includes(" at ") && MONTH_RE.test(line);
}

function isTotalActivity(line) {
    return TOTAL_ACTIVITY_RE.test(line);
}

function parseCanvasExport(text) {
    const lines = cleanLines(text);
    const startIndex = findTableStart(lines);
    const dataLines = lines.slice(startIndex);

    const rows = [];
    let current = null;

    const startRow = (name = "") => ({
        name,
        login_id: "",
        sis_id: "",
        section: "",
        role: "",
        last_activity: "",
        total_activity: "",
    });

    const finalizeRow = () => {
        if (current && Object.values(current).some(value => value)) {
            rows.push(current);
        }
        current = null;
    };

    dataLines.forEach(line => {
        if (IGNORED_LINES.has(line)) {
            return;
        }

        const emailMatch = line.match(EMAIL_RE);
        if (emailMatch) {
            if (!current) {
                current = startRow();
            }
            const namePart = line.slice(0, emailMatch.index).trim();
            if (namePart && (!current.name || current.name === namePart)) {
                current.name = namePart;
            }
            current.login_id = emailMatch[0];
            const sisMatch = line.slice(emailMatch.index + emailMatch[0].length).match(SIS_RE);
            if (sisMatch) {
                current.sis_id = sisMatch[0];
            }
            return;
        }

        if (ROLE_VALUES.has(line)) {
            if (!current) {
                current = startRow();
            }
            current.role = line;
            return;
        }

        if (isSectionLine(line)) {
            if (!current) {
                current = startRow();
            }
            current.section = line;
            return;
        }

        if (isLastActivity(line)) {
            if (!current) {
                current = startRow();
            }
            current.last_activity = line;
            return;
        }

        if (isTotalActivity(line)) {
            if (!current) {
                current = startRow();
            }
            current.total_activity = line;
            return;
        }

        if (!current) {
            current = startRow(line);
            return;
        }

        if (line === current.name) {
            return;
        }

        const hasCoreFields = Boolean(
            current.login_id ||
            current.sis_id ||
            current.section ||
            current.role
        );

        if (hasCoreFields) {
            finalizeRow();
            current = startRow(line);
        } else if (!current.name || line.length > current.name.length) {
            current.name = line;
        }
    });

    finalizeRow();
    return rows;
}

function buildSummary(rows) {
    return {
        total: rows.length,
        missing_login: rows.filter(row => !row.login_id).length,
        missing_sis: rows.filter(row => !row.sis_id).length,
        missing_section: rows.filter(row => !row.section).length,
        missing_role: rows.filter(row => !row.role).length,
    };
}

function escapeCsvValue(value) {
    const text = String(value ?? "");
    if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function rowsToCsv(rows) {
    const headers = [
        "Name",
        "Login ID",
        "SIS ID",
        "Section",
        "Role",
        "Last Activity",
        "Total Activity",
    ];
    const lines = [headers.join(",")];
    rows.forEach(row => {
        lines.push(
            [
                row.name,
                row.login_id,
                row.sis_id,
                row.section,
                row.role,
                row.last_activity,
                row.total_activity,
            ]
                .map(escapeCsvValue)
                .join(",")
        );
    });
    return lines.join("\n");
}

function renderSummary(summary) {
    document.getElementById("summary-total").textContent = summary.total;
    document.getElementById("summary-missing-login").textContent = summary.missing_login;
    document.getElementById("summary-missing-sis").textContent = summary.missing_sis;
    document.getElementById("summary-missing-section").textContent = summary.missing_section;
    document.getElementById("summary-missing-role").textContent = summary.missing_role;
    document.getElementById("summary-card").classList.remove("hidden");
}

function renderTable(rows) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";
    rows.forEach(row => {
        const tr = document.createElement("tr");
        [
            row.name,
            row.login_id,
            row.sis_id,
            row.section,
            row.role,
            row.last_activity,
            row.total_activity,
        ].forEach(cellValue => {
            const td = document.createElement("td");
            td.textContent = cellValue || "";
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    document.getElementById("table-card").classList.remove("hidden");
}

function downloadCsv(rows) {
    const csvContent = rowsToCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `canvas_people_export_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

let lastRows = [];

document.getElementById("extract-btn").addEventListener("click", () => {
    const rawText = document.getElementById("raw-text").value;
    lastRows = parseCanvasExport(rawText);
    renderSummary(buildSummary(lastRows));
    renderTable(lastRows);
});

document.getElementById("download-btn").addEventListener("click", () => {
    if (!lastRows.length) {
        const rawText = document.getElementById("raw-text").value;
        lastRows = parseCanvasExport(rawText);
    }
    if (!lastRows.length) {
        return;
    }
    downloadCsv(lastRows);
});
