// KESA Space — Mission Control Website
// Data-driven. Update JSON files, site updates automatically.

let agency = {};
let missions = [];
let crew = [];
let programs = [];
let vehicles = [];
let stations = [];

// --- DATA LOADING ---

async function loadJSON(path) {
    try {
        const res = await fetch(path);
        return await res.json();
    } catch(e) {
        console.warn('Failed to load ' + path, e);
        return Array.isArray(path) ? [] : {};
    }
}

async function loadAllData() {
    agency = await loadJSON('data/agency.json');
    missions = await loadJSON('data/missions.json');
    crew = await loadJSON('data/crew.json');
    programs = await loadJSON('data/programs.json');
    vehicles = await loadJSON('data/vehicles.json');
    stations = await loadJSON('data/stations.json');

    renderAgency();
    renderHome();
    renderMissions();
    renderCrew();
    renderPrograms();
    renderVehicles();
    showPage('home');
}

// --- NAVIGATION ---

function showPage(page) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
    document.querySelectorAll('nav button').forEach(b => {
        b.className = b.textContent.toLowerCase() === page ? 'active' : '';
    });
}

// --- HELPERS ---

function resultIcon(r) {
    switch(r) {
        case 'success': return '✅';
        case 'failure': return '❌';
        case 'partial': return '⚠️';
        default: return '⏳';
    }
}

function statusClass(s) {
    const map = { 'Active': 'active', 'Assigned': 'assigned', 'R&R': 'rr',
                  'KIA': 'kia', 'MIA': 'kia', 'Retired': 'retired' };
    return 'status-' + (map[s] || 'active');
}

function programStatusBadge(s) {
    const colors = { 'upcoming': '#54a0ff', 'active': '#2ed573',
                     'planned': '#576574', 'completed': '#feca57' };
    return `<span style="color:${colors[s] || '#576574'}">${s.toUpperCase()}</span>`;
}

function statBox(number, label) {
    return `<div class="stat-box"><div class="number">${number}</div><div class="label">${label}</div></div>`;
}

// --- RENDER: AGENCY ---

function renderAgency() {
    document.getElementById('agency-motto').textContent = '"' + (agency.motto || '') + '"';
    document.getElementById('agency-bio').textContent = agency.bio || '';
    document.getElementById('wall-quote').innerHTML =
        '"' + (agency.wallQuote || '') + '"<br><span style="font-size:0.7rem">— On the wall in KESA Mission Control</span>';
}

// --- RENDER: HOME ---

function renderHome() {
    const total = missions.length;
    const success = missions.filter(m => m.result === 'success').length;
    const crewCount = crew.length;
    const activePrograms = programs.filter(p => p.status === 'upcoming' || p.status === 'active').length;

    document.getElementById('home-stats').innerHTML =
        statBox(total, 'Missions') +
        statBox(success, 'Successful') +
        statBox(crewCount, 'Crew') +
        statBox(activePrograms, 'Active Programs');

    // Recent missions (last 5)
    const recent = [...missions].reverse().slice(0, 5);
    const el = document.getElementById('recent-missions');
    if (recent.length === 0) {
        el.innerHTML = '<div class="empty">No missions yet. The launchpad awaits.</div>';
    } else {
        el.innerHTML = recent.map(m =>
            `<div style="padding:0.4rem 0;border-bottom:1px solid #1e2a3a;font-size:0.82rem">
                <span class="result-${m.result}">${resultIcon(m.result)}</span>
                <strong>${m.id}</strong> — ${m.summary}
            </div>`
        ).join('');
    }

    // Active programs
    const active = programs.filter(p => p.status === 'upcoming' || p.status === 'active');
    const pel = document.getElementById('active-programs');
    pel.innerHTML = active.map(p =>
        `<div style="padding:0.4rem 0;border-bottom:1px solid #1e2a3a;font-size:0.82rem">
            <strong>${p.name}</strong> — <span style="color:#576574">${p.target}</span>
            <div style="color:#576574;font-size:0.75rem">${p.description}</div>
        </div>`
    ).join('');
}

// --- RENDER: MISSIONS ---

function renderMissions() {
    const filterProject = document.getElementById('filter-project').value;
    const filterResult = document.getElementById('filter-result').value;

    // Populate project filter
    const projectSelect = document.getElementById('filter-project');
    if (projectSelect.options.length <= 1) {
        const projects = [...new Set(missions.map(m => m.project))];
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            projectSelect.appendChild(opt);
        });
    }

    let filtered = missions;
    if (filterProject !== 'all') filtered = filtered.filter(m => m.project === filterProject);
    if (filterResult !== 'all') filtered = filtered.filter(m => m.result === filterResult);

    const total = missions.length;
    const success = missions.filter(m => m.result === 'success').length;
    const failed = missions.filter(m => m.result === 'failure').length;
    const pending = missions.filter(m => m.result === 'pending').length;
    const completed = total - pending;
    const rate = completed > 0 ? Math.round((success / completed) * 100) : 0;

    document.getElementById('mission-stats').innerHTML =
        statBox(total, 'Total') +
        statBox(success, 'Success') +
        statBox(failed, 'Failed') +
        statBox(rate + '%', 'Success Rate');

    const tbody = document.getElementById('mission-table');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No missions match the filter.</td></tr>';
        return;
    }
    tbody.innerHTML = [...filtered].reverse().map(m =>
        `<tr>
            <td><strong>${m.id}</strong></td>
            <td>${m.date}</td>
            <td>${m.project}</td>
            <td>${m.vehicle}</td>
            <td>${m.crew.length > 0 ? m.crew.join(', ') : '<span style="color:#576574">Unmanned</span>'}</td>
            <td class="result-${m.result}">${resultIcon(m.result)} ${m.result}</td>
        </tr>`
    ).join('');
}

// --- RENDER: CREW ---

function renderCrew() {
    const active = crew.filter(c => c.status !== 'KIA' && c.status !== 'MIA');
    const kia = crew.filter(c => c.status === 'KIA' || c.status === 'MIA');
    const totalFlights = crew.reduce((s, c) => s + c.missions.length, 0);
    const mostExp = crew.length > 0
        ? crew.reduce((max, c) => c.missions.length > max.missions.length ? c : max, crew[0])
        : null;

    document.getElementById('crew-stats').innerHTML =
        statBox(crew.length, 'Total Crew') +
        statBox(active.length, 'Active') +
        statBox(totalFlights, 'Total Flights') +
        statBox(mostExp ? mostExp.name.split(' ')[0] : '-', 'Most Experienced');

    const list = document.getElementById('crew-list');
    if (active.length === 0) {
        list.innerHTML = '<div class="empty">No crew recruited yet.</div>';
    } else {
        list.innerHTML = active.map(c =>
            `<div class="crew-card">
                <div class="name">${c.name}</div>
                <div class="role">${c.role} — <span class="${statusClass(c.status)}">${c.status}</span></div>
                <div class="notes">${c.notes}</div>
                <div class="mission-list">Missions: ${c.missions.length > 0 ? c.missions.join(', ') : 'None yet'}</div>
                <div style="margin-top:0.3rem">${c.ribbons.map(r => `<span class="ribbon">${r}</span>`).join('')}</div>
            </div>`
        ).join('');
    }

    if (kia.length > 0) {
        document.getElementById('memorial').style.display = 'block';
        document.getElementById('memorial-list').innerHTML = kia.map(c =>
            `<div class="crew-card" style="border-color:#ff4757">
                <div class="name">${c.name}</div>
                <div class="role">${c.role}</div>
                <div class="notes">${c.notes}</div>
            </div>`
        ).join('');
    }
}

// --- RENDER: PROGRAMS ---

function renderPrograms() {
    const types = { exploration: 'programs-exploration', infrastructure: 'programs-infrastructure', operations: 'programs-operations' };

    Object.entries(types).forEach(([type, elId]) => {
        const items = programs.filter(p => p.type === type);
        document.getElementById(elId).innerHTML = items.map(p =>
            `<div class="card">
                <div class="card-title">${p.name}</div>
                <div class="card-subtitle">${p.figure} → ${p.target}</div>
                <div class="card-body">${p.description}</div>
                <div class="card-status">Era ${p.era} — ${programStatusBadge(p.status)}</div>
            </div>`
        ).join('');
    });

    document.getElementById('stations-list').innerHTML = stations.map(s =>
        `<div class="card">
            <div class="card-title">${s.name}</div>
            <div class="card-subtitle">${s.figure}</div>
            <div class="card-body">${s.location}</div>
            <div class="card-status">Era ${s.era} — ${programStatusBadge(s.status)}</div>
        </div>`
    ).join('');
}

// --- RENDER: VEHICLES ---

function renderVehicles() {
    document.getElementById('vehicles-list').innerHTML = vehicles.map(v => {
        let variantHTML = '';
        if (v.variants && v.variants.length > 0) {
            variantHTML = `<table class="variant-table">
                ${v.variants.map(vr => `<tr>
                    <td><strong>${vr.designation}</strong></td>
                    <td>${vr.config}</td>
                    <td>${programStatusBadge(vr.status)}</td>
                </tr>`).join('')}
            </table>`;
        }
        return `<div class="vehicle-block">
            <div class="veh-name">${v.name}</div>
            <div class="veh-role">${v.role}</div>
            <div class="veh-figure">${v.figure}</div>
            ${variantHTML}
        </div>`;
    }).join('');
}

// --- INIT ---
loadAllData();
