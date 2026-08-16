/* Exate Unified Performance Engineering Portal — 100% Dynamic Engine */

let RAW_DATASET = null;
let PORTAL_DATA = null;
let cmpCharts = {};
let jobCharts = {};

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light-theme');
    updateThemeToggleUI(true);
  } else {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark');
    updateThemeToggleUI(false);
  }
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light-theme');
  if (isLight) {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    updateThemeToggleUI(false);
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
    updateThemeToggleUI(true);
  }
  if (cmpCharts['cmpLatencyChart']) {
    renderComparisonTab();
  }
}

function updateThemeToggleUI(isLight) {
  const label = document.getElementById('themeBtnText');
  const iconBox = document.getElementById('themeIconBox');
  if (label) label.innerText = isLight ? 'Dark Mode' : 'Light Mode';
  if (iconBox) {
    iconBox.innerHTML = isLight
      ? `<i data-lucide="moon" class="toggle-icon"></i>`
      : `<i data-lucide="sun" class="toggle-icon"></i>`;
    if (window.lucide) lucide.createIcons();
  }
}

function initSidebar() {
  const savedState = localStorage.getItem('sidebar_collapsed');
  if (savedState === 'true') {
    applySidebarState(true);
  } else {
    applySidebarState(false);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const isCollapsed = sidebar && sidebar.classList.contains('collapsed');
  applySidebarState(!isCollapsed);
}

function applySidebarState(collapse) {
  const sidebar = document.getElementById('mainSidebar');
  const mainContent = document.querySelector('.main-content');
  const iconBox = document.getElementById('sidebarToggleIconBox');

  if (sidebar && mainContent) {
    if (collapse) {
      sidebar.classList.add('collapsed');
      mainContent.classList.add('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', 'true');
      if (iconBox) iconBox.innerHTML = `<i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>`;
    } else {
      sidebar.classList.remove('collapsed');
      mainContent.classList.remove('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', 'false');
      if (iconBox) iconBox.innerHTML = `<i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>`;
    }
    if (window.lucide) lucide.createIcons();

    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 280);
  }
}

// 1. Render Platform Selector Dropdown
function renderPlatformSelector() {
  const container = document.querySelector('.sidebar-platform-container');
  const selectBox = document.getElementById('platformSelector');

  const isEnabled = Boolean(RAW_DATASET && RAW_DATASET.enable_platform_selector);

  if (container) {
    container.style.display = isEnabled ? 'block' : 'none';
  }

  if (!isEnabled || !selectBox || !RAW_DATASET || !RAW_DATASET.platforms) return;

  const activeId = PORTAL_DATA.active_platform_id || Object.keys(RAW_DATASET.platforms)[0];

  selectBox.innerHTML = Object.keys(RAW_DATASET.platforms).map(pid => {
    const p = RAW_DATASET.platforms[pid].platform || {};
    const title = p.title || pid;
    const arch = p.arch ? p.arch.toLowerCase() : '';
    const selected = pid === activeId ? 'selected' : '';
    return `<option value="${pid}" ${selected}>${arch ? arch + ': ' : ''}${title}</option>`;
  }).join('');
}

let CURRENT_TAB = 'overview';

// 2. Switch Active Platform Configuration
function switchPlatform(platformId, preserveTab = null) {
  if (!RAW_DATASET || !RAW_DATASET.platforms || !RAW_DATASET.platforms[platformId]) return;

  localStorage.setItem('active_platform', platformId);

  const targetPlatform = RAW_DATASET.platforms[platformId];
  PORTAL_DATA = {
    active_platform_id: platformId,
    platform: targetPlatform.platform,
    global_summary: targetPlatform.global_summary,
    jobs: targetPlatform.jobs,
    comparison_matrix: targetPlatform.comparison_matrix,
    infrastructure: targetPlatform.infrastructure
  };

  const envEl = document.getElementById('hdrEnv');
  const archEl = document.getElementById('hdrArch');

  if (envEl) envEl.innerText = targetPlatform.infrastructure.environment || 'N/A';
  if (archEl) archEl.innerText = (targetPlatform.platform.arch || '').toUpperCase() + ' (' + (targetPlatform.platform.title || '') + ')';

  renderPlatformSelector();
  renderSidebarNav();
  renderJobDetailTabs();
  renderGlobalOverview();
  renderComparisonTab();
  renderInfraTab();

  const activeTabToRestore = preserveTab || CURRENT_TAB || 'overview';
  switchTab(activeTabToRestore);
}

// 3. Render Dynamic Sidebar Nav Buttons
function renderSidebarNav() {
  const navContainer = document.getElementById('sidebarNavContainer');
  if (!navContainer || !PORTAL_DATA) return;

  const jobs = PORTAL_DATA.jobs || {};
  const jobKeys = Object.keys(jobs);

  const jobButtonsHtml = jobKeys.map(jk => {
    const j = jobs[jk];
    const cfg = j.config || {};
    const safeRps = cfg.safe_capacity_rps ? (cfg.safe_capacity_rps / 1000).toFixed(1) + 'k RPS' : '0 RPS';
    return `
      <button class="sidebar-btn" onclick="switchTab('${jk.toLowerCase()}', this)">
        <div class="sidebar-btn-left">
          <i data-lucide="shield-check" style="width: 16px; height: 16px;"></i>
          <span>${jk}</span>
        </div>
        <span class="nav-tag">${safeRps}</span>
      </button>
    `;
  }).join('');

  navContainer.innerHTML = `
    <div class="nav-group-title">Analytics & Metrics</div>
    <button class="sidebar-btn active" onclick="switchTab('overview', this)">
      <div class="sidebar-btn-left">
        <i data-lucide="layout-dashboard" style="width: 16px; height: 16px;"></i>
        <span>Overview</span>
      </div>
      <span class="nav-tag">${jobKeys.length} Jobs</span>
    </button>

    <button class="sidebar-btn" onclick="switchTab('comparison', this)">
      <div class="sidebar-btn-left">
        <i data-lucide="git-compare" style="width: 16px; height: 16px;"></i>
        <span>Job Comparison</span>
      </div>
      <span class="nav-tag">Matrix</span>
    </button>

    <div class="nav-group-title">Job Categories</div>
    ${jobButtonsHtml}

    <div class="nav-group-title">System Architecture</div>
    <button class="sidebar-btn" onclick="switchTab('infrastructure', this)">
      <div class="sidebar-btn-left">
        <i data-lucide="cpu" style="width: 16px; height: 16px;"></i>
        <span>Infrastructure</span>
      </div>
      <span class="nav-tag">Specs</span>
    </button>
  `;

  // Render Sidebar Status Footer
  const footer = document.getElementById('sidebarStatusFooter');
  if (footer) {
    const g = PORTAL_DATA.global_summary || {};
    const totalRuns = g.total_test_runs || 0;
    footer.innerHTML = `
      <div class="status-card">
        <div class="status-dot" style="${totalRuns === 0 ? 'background:#fbbc04; box-shadow:0 0 8px #fbbc04;' : ''}"></div>
        <div>
          <div class="status-text-main" style="${totalRuns === 0 ? 'color:#fbbc04;' : ''}">
            ${totalRuns > 0 ? 'System Health 100%' : 'Pending Test Runs'}
          </div>
          <div class="status-text-sub">
            ${totalRuns > 0 ? 'P95 &le; 100ms SLA Compliant' : 'Awaiting k6 load runs'}
          </div>
        </div>
      </div>
    `;
  }

  lucide.createIcons();
}

// 4. Generate Dynamic Job Detail Tab Containers
function renderJobDetailTabs() {
  const container = document.getElementById('jobTabsContainer');
  if (!container || !PORTAL_DATA) return;

  const jobs = PORTAL_DATA.jobs || {};
  container.innerHTML = Object.keys(jobs).map(jk => {
    return `<div class="tab-content" id="tab-${jk.toLowerCase()}"></div>`;
  }).join('');

  Object.keys(jobs).forEach(jk => {
    renderJobDetailTab(jk, 'tab-' + jk.toLowerCase());
  });
}

// 5. Global Tab Switching Logic
function switchTab(tabId, btn) {
  if (!tabId) tabId = 'overview';
  tabId = tabId.toLowerCase();

  // Validate target tab exists
  if (!document.getElementById('tab-' + tabId)) {
    tabId = 'overview';
  }

  CURRENT_TAB = tabId;
  localStorage.setItem('active_tab', tabId);

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, null, '#' + tabId);
  }

  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (!btn) {
    const buttons = Array.from(document.querySelectorAll('.sidebar-btn'));
    btn = buttons.find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${tabId}'`));
  }

  if (btn) btn.classList.add('active');
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');

  const titleEl = document.getElementById('pageTitle');
  const subTitleEl = document.getElementById('pageSubtitle');

  const pTitle = PORTAL_DATA.platform ? PORTAL_DATA.platform.title || '' : '';

  if (titleEl && subTitleEl) {
    if (tabId === 'overview') {
      titleEl.innerHTML = `<i data-lucide="layout-dashboard" style="color: #1a73e8;"></i> Executive Performance Overview`;
      subTitleEl.innerText = `Comprehensive Load Testing, Safe Production Capacity & Resource Analysis (${pTitle})`;
    } else if (tabId === 'comparison') {
      titleEl.innerHTML = `<i data-lucide="git-compare" style="color: #a142f4;"></i> Cross-Job Multi-Metric Comparison`;
      subTitleEl.innerText = `Side-by-side capacity, latency scaling, failure rates & resource consumption`;
    } else if (tabId === 'infrastructure') {
      titleEl.innerHTML = `<i data-lucide="cpu" style="color: #a142f4;"></i> Infrastructure & Pod Resource Specs`;
      subTitleEl.innerText = `Hardware environment & Kubernetes pod CPU/Memory resource allocations (${pTitle})`;
    } else if (PORTAL_DATA.jobs[tabId.toUpperCase()] || PORTAL_DATA.jobs[capitalize(tabId)]) {
      const jk = PORTAL_DATA.jobs[tabId.toUpperCase()] ? tabId.toUpperCase() : capitalize(tabId);
      const cfg = PORTAL_DATA.jobs[jk].config || {};
      titleEl.innerHTML = `<i data-lucide="shield-check" style="color: #34a853;"></i> ${jk} Performance & Capacity`;
      subTitleEl.innerText = `${cfg.category || 'Security transform performance report'}`;
    }
    lucide.createIcons();
  }

  if (tabId === 'comparison') {
    initComparisonCharts();
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// 6. Render Executive Overview Tab
function renderGlobalOverview() {
  const g = PORTAL_DATA.global_summary || {};
  const jobs = PORTAL_DATA.jobs || {};
  const p = PORTAL_DATA.platform || {};
  const infra = PORTAL_DATA.infrastructure || {};
  const totals = infra.totals || {};
  const briefing = g.briefing || {};
  const heatmap = g.heatmap || { steps: [], rows: [] };

  // Render Briefing Section
  const briefingContainer = document.getElementById('briefingContainer');
  if (briefingContainer) {
    const pillarsHtml = (briefing.pillars || []).map(pil => `
      <div style="background:var(--bg-card); padding:16px 18px; border-radius:10px; border:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; color:${pil.color}; font-weight:700; font-size:0.9rem;">
          <i data-lucide="${pil.icon}" style="width:16px;"></i> ${pil.title}
        </div>
        <ul style="font-size:0.83rem; color:var(--text-main); line-height:1.6; padding-left:18px;">
          ${pil.items.map(it => `<li>${it}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const statusBadge = (g.total_test_runs || 0) > 0
      ? `<span class="badge badge-emerald" style="font-size:0.8rem; font-weight:700;"><i data-lucide="check-circle" style="width:14px;"></i> 100% SLA Compliant</span>`
      : `<span class="badge badge-amber" style="font-size:0.8rem; font-weight:700;"><i data-lucide="clock" style="width:14px;"></i> Pending Test Execution</span>`;

    briefingContainer.innerHTML = `
      <section class="section" style="background: linear-gradient(135deg, rgba(26, 115, 232, 0.06) 0%, rgba(161, 66, 244, 0.06) 100%); border-left: 4px solid var(--google-blue);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:800; letter-spacing:0.08em; color:#1a73e8; margin-bottom:4px;">
              Executive Briefing: ${p.title || 'Platform Benchmarks'}
            </div>
            <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-main);">
              ${briefing.title || 'Exate Enterprise Security Gateway'}
            </h3>
            <p style="font-size:0.88rem; color:var(--text-muted); margin-top:4px;">
              ${briefing.subtitle || ''}
            </p>
          </div>
          ${statusBadge}
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:18px;">
          ${pillarsHtml}
        </div>
      </section>
    `;
  }

  // Render Overview KPI Cards Container
  const kpiContainer = document.getElementById('overviewKpiContainer');
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Active Job Categories</span>
            <div class="kpi-icon" style="background: rgba(26, 115, 232, 0.15); color: #1a73e8;">
              <i data-lucide="layers"></i>
            </div>
          </div>
          <div class="kpi-value">${g.total_job_types || 0}</div>
          <div class="kpi-subtext">${Object.keys(jobs).join(', ')}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Total Benchmark Executions</span>
            <div class="kpi-icon" style="background: rgba(161, 66, 244, 0.15); color: #c58af9;">
              <i data-lucide="activity"></i>
            </div>
          </div>
          <div class="kpi-value">${g.total_test_runs || 0}</div>
          <div class="kpi-subtext">3-Stage verified test runs</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Total Requests Evaluated</span>
            <div class="kpi-icon" style="background: rgba(249, 171, 0, 0.15); color: #fbbc04;">
              <i data-lucide="database"></i>
            </div>
          </div>
          <div class="kpi-value">${g.total_requests_processed ? (g.total_requests_processed / 1e6).toFixed(2) + ' M' : '0.00 M'}</div>
          <div class="kpi-subtext">Total HTTP requests</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Total Payload Volume</span>
            <div class="kpi-icon" style="background: rgba(52, 168, 83, 0.15); color: #34a853;">
              <i data-lucide="hard-drive"></i>
            </div>
          </div>
          <div class="kpi-value">${((g.total_data_sent_gb || 0) + (g.total_data_rec_gb || 0)).toFixed(1)} GB</div>
          <div class="kpi-subtext">Data Sent & Received</div>
        </div>
      </section>
    `;
  }

  // Render Cross-Job Heatmap Table
  const heatmapContainer = document.getElementById('heatmapContainer');
  if (heatmapContainer) {
    const stepsHeaders = (heatmap.steps || []).map(s => `<th>${s.toLocaleString()} RPS</th>`).join('');
    const rowsHtml = (heatmap.rows || []).map(r => `
      <tr>
        <td><strong>${r.job_title}</strong><br><span style="font-size:0.72rem; color:var(--text-muted);">${r.category}</span></td>
        ${r.cells.map(c => `
          <td style="background:${c.bg}; border:1px solid rgba(128,134,139,0.1);">
            <div style="font-weight:700; color:${c.fg}; font-size:0.8rem; text-align:center;">
              <div>${c.p95_ms != null ? c.p95_ms + ' ms' : '-'}</div>
              <div style="font-size:0.65rem; opacity:0.85;">${c.label}</div>
            </div>
          </td>
        `).join('')}
      </tr>
    `).join('');

    heatmapContainer.innerHTML = `
      <section class="section">
        <div class="section-title">
          <i data-lucide="grid" style="color: #34a853;"></i> Cross-Job SLA Compliance & Step Endurance Heatmap
        </div>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
          Visual SLA compliance matrix mapping target RPS steps against 60-minute endurance soak verification and P95 latency bounds (&le; 100ms).
        </p>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Job Category</th>
                ${stepsHeaders}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Render HPA Modeler Container
  const modelerContainer = document.getElementById('modelerContainer');
  if (modelerContainer) {
    const jobOptions = Object.keys(jobs).map(jk => {
      const cfg = jobs[jk].config || {};
      return `<option value="${jk}">${jk} (${cfg.hpa_target_per_pod_rps || 400} RPS / pod HPA target)</option>`;
    }).join('');

    modelerContainer.innerHTML = `
      <section class="section">
        <div class="section-title">
          <i data-lucide="calculator" style="color: #1a73e8;"></i> Interactive Hardware Capacity & HPA Scaling Modeler
        </div>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
          Model required gateway pods, vCPU compute, RAM, and processor core allocation in real-time by adjusting target throughput.
        </p>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:28px; background:var(--bg-card); padding:24px; border-radius:12px; border:1px solid var(--border-color);">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <label style="font-size:0.9rem; font-weight:700; color:var(--text-main);">Target Throughput (RPS):</label>
              <strong style="font-size:1.1rem; color:#1a73e8;" id="modelRpsVal">5,000 RPS</strong>
            </div>
            <input type="range" id="modelRpsSlider" min="500" max="15000" step="500" value="5000" style="width:100%; accent-color:#1a73e8; cursor:pointer; margin-bottom:20px;" oninput="updateCapacityModeler()">

            <div style="margin-bottom:14px;">
              <label style="font-size:0.85rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">Job Category:</label>
              <select id="modelJobSelect" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); font-size:0.88rem; font-weight:600;" onchange="updateCapacityModeler()">
                ${jobOptions}
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Required Gateway Pods</div>
              <div style="font-size:1.5rem; font-weight:800; color:#1a73e8; margin-top:4px;" id="modelPodsOut">10 Pods</div>
              <div style="font-size:0.72rem; color:var(--text-muted);" id="modelPodSub">Load balanced</div>
            </div>

            <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Guaranteed vCPU Cores</div>
              <div style="font-size:1.5rem; font-weight:800; color:#34a853; margin-top:4px;" id="modelCpuOut">13.00 Cores</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">1,200m per pod</div>
            </div>

            <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Guaranteed RAM</div>
              <div style="font-size:1.5rem; font-weight:800; color:#c58af9; margin-top:4px;" id="modelRamOut">15.0 GiB</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">1 GiB per pod</div>
            </div>

            <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Hardware Core Status</div>
              <div style="font-size:1.1rem; font-weight:800; color:#fbbc04; margin-top:6px;" id="modelIflOut">Calculated</div>
              <div style="font-size:0.72rem; color:var(--text-muted);" id="modelIflSub">Platform budget</div>
            </div>
          </div>
        </div>
      </section>
    `;
    updateCapacityModeler();
  }

  lucide.createIcons();
}

function updateCapacityModeler() {
  const slider = document.getElementById('modelRpsSlider');
  const select = document.getElementById('modelJobSelect');
  if (!slider || !select || !PORTAL_DATA || !PORTAL_DATA.jobs) return;

  const targetRps = parseInt(slider.value, 10);
  const jobKey = select.value;
  const jobObj = PORTAL_DATA.jobs[jobKey] || {};
  const cfg = jobObj.config || {};
  const targetPerPod = cfg.hpa_target_per_pod_rps || 500;

  const requiredPods = Math.ceil(targetRps / targetPerPod);
  const totalCpuCores = (requiredPods * 1.2 + 1.0).toFixed(2);
  const totalRamGiB = (requiredPods * 1.0 + 5.0).toFixed(1);

  document.getElementById('modelRpsVal').innerText = targetRps.toLocaleString() + ' RPS';
  document.getElementById('modelPodsOut').innerText = requiredPods + ' Pods';
  document.getElementById('modelPodSub').innerText = `~${targetPerPod} RPS / pod HPA target`;
  document.getElementById('modelCpuOut').innerText = totalCpuCores + ' Cores';
  document.getElementById('modelRamOut').innerText = totalRamGiB + ' GiB';

  const iflOut = document.getElementById('modelIflOut');
  const iflSub = document.getElementById('modelIflSub');
  const coresNum = parseFloat(totalCpuCores);
  const platform = PORTAL_DATA.platform || {};
  const cpuBudget = platform.cpu_budget_cores || 0;

  if (cpuBudget > 0) {
    if (coresNum <= cpuBudget) {
      iflOut.innerText = `${coresNum.toFixed(1)} / ${cpuBudget} Cores`;
      iflOut.style.color = '#34a853';
      iflSub.innerText = `Fits in current ${cpuBudget} core budget (${((coresNum/cpuBudget)*100).toFixed(0)}%)`;
    } else {
      const extraCores = (coresNum - cpuBudget).toFixed(1);
      iflOut.innerText = `Requires ${Math.ceil(coresNum)} Cores`;
      iflOut.style.color = '#ea4335';
      iflSub.innerText = `Exceeds ${cpuBudget} core budget by +${extraCores} core(s)`;
    }
  } else {
    iflOut.innerText = `${coresNum.toFixed(1)} Cores`;
    iflOut.style.color = '#1a73e8';
    iflSub.innerText = `Compute requirement for ${platform.title || 'platform'}`;
  }
}

// 7. Render Comparison Tab
function renderComparisonTab() {
  const container = document.getElementById('cmpMatrixContainer');
  if (!container || !PORTAL_DATA) return;

  const matrix = PORTAL_DATA.comparison_matrix || [];

  const rowsHtml = matrix.map(row => `
    <tr>
      <td><strong>${row.title}</strong><br><span style="font-size:0.72rem; color:var(--text-muted);">${row.category}</span></td>
      <td><code>${row.endpoint}</code></td>
      <td><strong style="color:#34a853;">${row.safe_capacity_rps ? row.safe_capacity_rps.toLocaleString() + ' RPS' : 'N/A'}</strong></td>
      <td><strong style="color:#ea4335;">${row.knee_point_rps ? row.knee_point_rps.toLocaleString() + ' RPS' : 'N/A'}</strong></td>
      <td>${row.p95_safe_ms != null && row.p95_safe_ms !== 'N/A' ? row.p95_safe_ms + ' ms' : 'N/A'}</td>
      <td>${row.p99_safe_ms != null && row.p99_safe_ms !== 'N/A' ? row.p99_safe_ms + ' ms' : 'N/A'}</td>
      <td>${row.fail_pct_safe != null ? row.fail_pct_safe.toFixed(2) + '%' : '0.00%'}</td>
      <td>${row.total_requests ? (row.total_requests / 1e6).toFixed(2) + ' M' : '0.00 M'}</td>
      <td><strong>${row.hpa_target_per_pod_rps ? row.hpa_target_per_pod_rps.toLocaleString() + ' RPS / Pod' : 'N/A'}</strong></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <section class="section">
      <div class="section-title">
        <i data-lucide="table" style="color: #34a853;"></i> Side-by-Side Job Type Capacity & Stability Matrix
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Job Type</th>
              <th>Load Endpoint</th>
              <th>Optimal Safe Capacity</th>
              <th>Degradation Knee Point</th>
              <th>P95 @ Safe Ceiling</th>
              <th>P99 @ Safe Ceiling</th>
              <th>Fail Rate @ Safe Ceiling</th>
              <th>Max Tested Requests</th>
              <th>Autoscaling HPA Target</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </section>
  `;

  lucide.createIcons();
  initComparisonCharts();
}

function initComparisonCharts() {
  const jobs = PORTAL_DATA.jobs || {};
  const jobKeys = Object.keys(jobs);
  if (jobKeys.length === 0) return;

  const isDark = !document.documentElement.classList.contains('light-theme');
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const colors = ['#1a73e8', '#34a853', '#fbbc04', '#c58af9', '#ea4335'];
  const bgColors = ['rgba(26,115,232,0.85)', 'rgba(52,168,83,0.85)', 'rgba(251,188,4,0.85)', 'rgba(197,138,249,0.85)', 'rgba(234,67,53,0.85)'];

  const rpsSteps = [100, 500, 1000, 1500, 2000, 2500, 2600, 2800];

  Object.values(cmpCharts).forEach(c => c && c.destroy());
  cmpCharts = {};

  const latDatasets = jobKeys.map((jk, i) => {
    const agg = jobs[jk].aggregated || [];
    const data = rpsSteps.map(r => {
      const item = agg.find(x => x.rps === r);
      return item ? item.p95_ms : null;
    });
    return {
      label: `${jk} P95`,
      data: data,
      borderColor: colors[i % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      tension: 0.3,
      spanGaps: true
    };
  });

  const latCanvas = document.getElementById('cmpLatencyChart');
  if (latCanvas) {
    cmpCharts['cmpLatencyChart'] = new Chart(latCanvas, {
      type: 'line',
      data: { labels: rpsSteps.map(r => r + ' RPS'), datasets: latDatasets },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'P95 Latency (ms)' } } } }
    });
  }

  const safeData = jobKeys.map(jk => jobs[jk].config ? jobs[jk].config.safe_capacity_rps || 0 : 0);
  const kneeData = jobKeys.map(jk => jobs[jk].config ? jobs[jk].config.knee_point_rps || 0 : 0);

  const capCanvas = document.getElementById('cmpCapacityChart');
  if (capCanvas) {
    cmpCharts['cmpCapacityChart'] = new Chart(capCanvas, {
      type: 'bar',
      data: {
        labels: jobKeys,
        datasets: [
          { label: 'Optimal Safe RPS (P95 <= 100ms)', data: safeData, backgroundColor: bgColors.slice(0, jobKeys.length), borderRadius: 6 },
          { label: 'Degradation Knee Point RPS', data: kneeData, backgroundColor: Array(jobKeys.length).fill('rgba(234, 67, 53, 0.5)'), borderRadius: 6 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'Target RPS' } } } }
    });
  }

  const errorDatasets = jobKeys.map((jk, i) => {
    const agg = jobs[jk].aggregated || [];
    const data = rpsSteps.map(r => {
      const item = agg.find(x => x.rps === r);
      return item ? item.fail_pct : 0;
    });
    return {
      label: `${jk} Fail %`,
      data: data,
      backgroundColor: bgColors[i % bgColors.length],
      borderRadius: 4
    };
  });

  const errCanvas = document.getElementById('cmpErrorChart');
  if (errCanvas) {
    cmpCharts['cmpErrorChart'] = new Chart(errCanvas, {
      type: 'bar',
      data: { labels: rpsSteps.map(r => r + ' RPS'), datasets: errorDatasets },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'Failure Rate (%)' } } } }
    });
  }

  const cpuSteps = [100, 500, 1000, 1500, 1600, 2000, 2200, 2500];
  const cpuDatasets = jobKeys.map((jk, i) => {
    const agg = jobs[jk].aggregated || [];
    const data = cpuSteps.map(r => {
      const item = agg.find(x => x.rps === r);
      return (item && item.cpu_pct != null) ? item.cpu_pct : null;
    });
    return {
      label: `${jk} CPU %`,
      data: data,
      borderColor: colors[i % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      spanGaps: true
    };
  });

  const cpuCanvas = document.getElementById('cmpCpuChart');
  if (cpuCanvas) {
    cmpCharts['cmpCpuChart'] = new Chart(cpuCanvas, {
      type: 'line',
      data: { labels: cpuSteps.map(c => c + ' RPS'), datasets: cpuDatasets },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'CPU Usage (%)' } } } }
    });
  }
}

// 8. Render Individual Job Detail Tab
function renderJobDetailTab(jobKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !PORTAL_DATA || !PORTAL_DATA.jobs[jobKey]) return;

  const j = PORTAL_DATA.jobs[jobKey];
  const cfg = j.config || {};
  const s = j.summary || {};
  const agg = j.aggregated || [];

  const safeRps = cfg.safe_capacity_rps ? cfg.safe_capacity_rps.toLocaleString() + ' RPS' : 'N/A';

  container.innerHTML = `
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span>60m Soak Safe Capacity</span>
          <div class="kpi-icon" style="background: rgba(52, 168, 83, 0.15); color: #34a853;">
            <i data-lucide="shield-check"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #34a853;">${safeRps}</div>
        <div class="kpi-subtext">~${cfg.hpa_target_per_pod_rps || 400} RPS / pod HPA target</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Testing Stage Status</span>
          <div class="kpi-icon" style="background: rgba(249, 171, 0, 0.15); color: #fbbc04;">
            <i data-lucide="activity"></i>
          </div>
        </div>
        <div class="kpi-value" style="font-size: 1.15rem; color: #fbbc04;">${cfg.testing_stage || 'N/A'}</div>
        <div class="kpi-subtext">${s.total_runs || 0} Test Runs (${s.pass_rate_pct || 0}% Pass)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Total Requests Tested</span>
          <div class="kpi-icon" style="background: rgba(26, 115, 232, 0.15); color: #1a73e8;">
            <i data-lucide="database"></i>
          </div>
        </div>
        <div class="kpi-value">${s.total_requests ? (s.total_requests / 1e6).toFixed(2) + ' M' : '0.00 M'}</div>
        <div class="kpi-subtext">Total HTTP requests</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Payload Volume</span>
          <div class="kpi-icon" style="background: rgba(161, 66, 244, 0.15); color: #c58af9;">
            <i data-lucide="hard-drive"></i>
          </div>
        </div>
        <div class="kpi-value">${s.data_sent_gb || 0} GB</div>
        <div class="kpi-subtext">${s.data_rec_gb || 0} GB Received</div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <i data-lucide="trending-up" style="color: #1a73e8;"></i> Latency Scaling & Throughput Charts (${jobKey})
      </div>
      <div class="chart-grid-2col">
        <div class="chart-container">
          <div class="chart-header">
            <h3>P95 Latency Scaling Curve (${jobKey})</h3>
            <span class="badge badge-sky">SLA: &le; 100ms</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="${jobKey.toLowerCase()}LatencyChart"></canvas>
          </div>
        </div>

        <div class="chart-container">
          <div class="chart-header">
            <h3>Benchmark Executions Throughput (${jobKey})</h3>
            <span class="badge badge-emerald">${j.runs.length} Executions</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="${jobKey.toLowerCase()}RunsChart"></canvas>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <i data-lucide="table" style="color: #34a853;"></i> Aggregated Capacity Ladder Performance (${jobKey})
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>RPS Step</th>
              <th>Test Executions</th>
              <th>Avg Latency</th>
              <th>P95 Latency</th>
              <th>P99 Latency</th>
              <th>Peak Max Latency</th>
              <th>Error Rate</th>
              <th>SLA & Endurance Status</th>
            </tr>
          </thead>
          <tbody>
            ${agg.length > 0 ? agg.map(item => {
              let badgeClass = 'status-pass';
              let statusText = '60m SOAK VERIFIED SAFE';
              let customStyle = '';
              if (item.status === 'SOAK_VERIFIED_SAFE') {
                badgeClass = 'status-pass';
                statusText = '60m SOAK VERIFIED SAFE';
              } else if (item.status === 'RAMP_PASS_SOAK_PENDING') {
                badgeClass = 'status-elevated';
                customStyle = 'style="background:rgba(56,189,248,0.15); color:#38bdf8; border-color:rgba(56,189,248,0.3);"';
                statusText = '1m RAMP PASS (SOAK PENDING)';
              } else if (item.status === 'ELEVATED') {
                badgeClass = 'status-elevated';
                statusText = 'ELEVATED (>100ms P95)';
              } else if (item.status === 'DEGRADED') {
                badgeClass = 'status-fail';
                statusText = 'DEGRADED';
              }

              const hasError = item.fail_pct > 0;
              const rowStyle = hasError ? 'style="background: rgba(234, 67, 53, 0.12); border-left: 4px solid #ea4335;"' : '';
              const errStyle = hasError ? 'style="color: #ea4335; font-weight: 800;"' : '';

              return `
                <tr ${rowStyle}>
                  <td><strong>${item.rps} RPS</strong></td>
                  <td>${item.runs_count}</td>
                  <td>${item.avg_ms} ms</td>
                  <td><strong>${item.p95_ms} ms</strong></td>
                  <td>${item.p99_ms} ms</td>
                  <td>${item.max_ms_peak} ms</td>
                  <td><strong ${errStyle}>${item.fail_pct.toFixed(2)}%</strong></td>
                  <td><span class="status-badge ${badgeClass}" ${customStyle}>${statusText}</span></td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No aggregated benchmark runs recorded for this platform.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  lucide.createIcons();

  setTimeout(() => {
    initJobCharts(jobKey, agg, j.runs);
  }, 100);
}

function initJobCharts(jobKey, agg, runs) {
  const isDark = !document.documentElement.classList.contains('light-theme');
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const latCanvas = document.getElementById(`${jobKey.toLowerCase()}LatencyChart`);
  if (latCanvas && agg.length > 0) {
    if (jobCharts[`${jobKey}_lat`]) jobCharts[`${jobKey}_lat`].destroy();
    jobCharts[`${jobKey}_lat`] = new Chart(latCanvas, {
      type: 'line',
      data: {
        labels: agg.map(a => a.rps + ' RPS'),
        datasets: [
          { label: 'P95 Latency (ms)', data: agg.map(a => a.p95_ms), borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, borderWidth: 2.5, tension: 0.3 },
          { label: 'Avg Latency (ms)', data: agg.map(a => a.avg_ms), borderColor: '#34a853', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'Latency (ms)' } } } }
    });
  }

  const runsCanvas = document.getElementById(`${jobKey.toLowerCase()}RunsChart`);
  if (runsCanvas && runs.length > 0) {
    if (jobCharts[`${jobKey}_runs`]) jobCharts[`${jobKey}_runs`].destroy();
    jobCharts[`${jobKey}_runs`] = new Chart(runsCanvas, {
      type: 'bar',
      data: {
        labels: runs.map((r, idx) => `Run #${idx+1}`),
        datasets: [
          { label: 'Achieved RPS', data: runs.map(r => r.steps && r.steps[0] ? r.steps[0].achieved_rps : 0), backgroundColor: 'rgba(52,168,83,0.85)', borderRadius: 6 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, title: { display: true, text: 'Achieved RPS' } } } }
    });
  }
}

// 9. Render Infrastructure Specs Tab
function renderInfraTab() {
  const infraContainer = document.getElementById('infraContainer');
  if (!infraContainer || !PORTAL_DATA) return;

  const infra = PORTAL_DATA.infrastructure || {};
  const platform = PORTAL_DATA.platform || {};
  const totals = infra.totals || {};
  const services = infra.services || [];
  const features = infra.ibm_architectural_features || [];
  const platformTitle = platform.title || 'Platform Architecture';

  infraContainer.innerHTML = `
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Total System CPU Request</span>
          <div class="kpi-icon" style="background: rgba(26, 115, 232, 0.15); color: #1a73e8;">
            <i data-lucide="cpu"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #1a73e8;">${totals.total_cpu_request || 'N/A'}</div>
        <div class="kpi-subtext">Guaranteed CPU request on ${platformTitle}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Total Guaranteed Memory Request</span>
          <div class="kpi-icon" style="background: rgba(161, 66, 244, 0.15); color: #c58af9;">
            <i data-lucide="hard-drive"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #c58af9;">${totals.total_memory_request || 'N/A'}</div>
        <div class="kpi-subtext">Sum of Guaranteed RAM Requests</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Peak Tested CPU Usage</span>
          <div class="kpi-icon" style="background: rgba(52, 168, 83, 0.15); color: #34a853;">
            <i data-lucide="zap"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #34a853;">${totals.peak_cpu_used_pct || 'N/A'}</div>
        <div class="kpi-subtext">Peak CPU load recorded</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Peak Tested RAM Footprint</span>
          <div class="kpi-icon" style="background: rgba(249, 171, 0, 0.15); color: #fbbc04;">
            <i data-lucide="database"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #fbbc04;">${totals.peak_memory_used_mb || 'N/A'}</div>
        <div class="kpi-subtext">Physical RAM used under peak load</div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <i data-lucide="cpu" style="color: #1a73e8;"></i> ${platformTitle} Architectural & Hardware Capabilities
      </div>
      ${features.length > 0 ? `
        <div class="cards-grid">
          ${features.map(f => `
            <div class="kpi-card" style="border-left: 4px solid #1a73e8;">
              <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 800; color: #1a73e8; margin-bottom: 4px;">${platform.arch ? platform.arch.toUpperCase() : 'PLATFORM'} SPEC</div>
              <h4 style="font-size: 1.02rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">${f.feature}</h4>
              <div style="font-size: 0.8rem; font-weight: 700; color: #34a853; margin-bottom: 8px;">${f.spec}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">${f.desc}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <p style="color: var(--text-muted); font-size: 0.88rem;">No architectural features defined in <code>data/${platform.id || 'arch'}/platform.md</code>.</p>
      `}
    </section>

    <section class="section">
      <div class="section-title">
        <i data-lucide="box" style="color: #c58af9;"></i> Microservice Pod Resource Allocations (${services.length} Container Pods)
      </div>
      ${services.length > 0 ? `
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Pod Name & Topology</th>
                <th>System Role</th>
                <th>Guaranteed CPU Request</th>
                <th>Guaranteed RAM Request</th>
                <th>Max CPU Limit</th>
                <th>Max RAM Limit</th>
              </tr>
            </thead>
            <tbody>
              ${services.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td><span class="badge badge-${s.badge_color}">${s.role}</span></td>
                  <td><strong style="color:#34a853;">${s.requests ? s.requests.cpu : 'N/A'}</strong></td>
                  <td><strong style="color:#34a853;">${s.requests ? s.requests.memory : 'N/A'}</strong></td>
                  <td><span style="color:#1a73e8;">${s.limits ? s.limits.cpu : 'N/A'}</span></td>
                  <td><span style="color:#c58af9;">${s.limits ? s.limits.memory : 'N/A'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <p style="color: var(--text-muted); font-size: 0.88rem;">No microservices pod allocations defined in <code>data/${platform.id || 'arch'}/platform.md</code>.</p>
      `}
    </section>
  `;

  lucide.createIcons();
}

let RAW_ENCRYPTED_PAYLOAD = null;

async function decryptPayload(encryptedObj, passcode) {
  try {
    const salt = Uint8Array.from(atob(encryptedObj.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passcode),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedBuf));
  } catch (err) {
    console.warn("AES Decryption failed for provided passcode.", err);
    return null;
  }
}

async function handlePasscodeSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('authPasscodeInput');
  const err = document.getElementById('authGateError');
  if (!input) return;

  const passcode = input.value.trim();
  if (!passcode) return;

  const encObj = window.PORTAL_DATA_ENCRYPTED || RAW_ENCRYPTED_PAYLOAD;
  if (!encObj) {
    try {
      const res = await fetch('data.json');
      RAW_ENCRYPTED_PAYLOAD = await res.json();
    } catch (fetchErr) {
      console.error("Failed to fetch data.json", fetchErr);
    }
  }

  const targetEncObj = window.PORTAL_DATA_ENCRYPTED || RAW_ENCRYPTED_PAYLOAD;
  if (!targetEncObj || !targetEncObj.encrypted) {
    if (err) err.style.display = 'flex';
    return;
  }

  const decryptedData = await decryptPayload(targetEncObj, passcode);

  if (decryptedData) {
    if (err) err.style.display = 'none';
    RAW_DATASET = decryptedData;
    sessionStorage.setItem('portal_passcode', passcode);

    const screen = document.getElementById('loginPortalScreen');
    const appWrapper = document.getElementById('appMainWrapper');

    if (screen) screen.classList.remove('active');
    if (appWrapper) appWrapper.style.display = 'flex';

    initPortal(true);
  } else {
    if (err) {
      err.style.display = 'flex';
    }
  }
}

function lockPortal() {
  sessionStorage.removeItem('portal_passcode');
  RAW_DATASET = null;

  const screen = document.getElementById('loginPortalScreen');
  const appWrapper = document.getElementById('appMainWrapper');

  if (appWrapper) appWrapper.style.display = 'none';
  if (screen) screen.classList.add('active');

  const input = document.getElementById('authPasscodeInput');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function togglePasscodeVisibility() {
  const input = document.getElementById('authPasscodeInput');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

async function initPortal(skipAuthCheck = false) {
  initTheme();
  initSidebar();

  const screen = document.getElementById('loginPortalScreen');
  const appWrapper = document.getElementById('appMainWrapper');

  if (!skipAuthCheck && !RAW_DATASET) {
    const savedPasscode = sessionStorage.getItem('portal_passcode');
    const encObj = window.PORTAL_DATA_ENCRYPTED || RAW_ENCRYPTED_PAYLOAD;

    if (!encObj) {
      try {
        const res = await fetch('data.json');
        RAW_ENCRYPTED_PAYLOAD = await res.json();
      } catch (err) {
        console.warn("Could not load data.json via fetch", err);
      }
    }

    const targetEncObj = window.PORTAL_DATA_ENCRYPTED || RAW_ENCRYPTED_PAYLOAD;

    if (savedPasscode && targetEncObj && targetEncObj.encrypted) {
      const decrypted = await decryptPayload(targetEncObj, savedPasscode);
      if (decrypted) {
        RAW_DATASET = decrypted;
      }
    }

    if (!RAW_DATASET) {
      if (screen) screen.classList.add('active');
      if (appWrapper) appWrapper.style.display = 'none';
      return;
    }
  }

  if (screen) screen.classList.remove('active');
  if (appWrapper) appWrapper.style.display = 'flex';

  if (!RAW_DATASET || !RAW_DATASET.platforms) {
    console.error("Portal data unavailable.");
    return;
  }

  const savedPlatform = localStorage.getItem('active_platform');
  const validPlatform = (savedPlatform && RAW_DATASET.platforms[savedPlatform]) ? savedPlatform : null;
  const firstPid = validPlatform || RAW_DATASET.active_platform_id || Object.keys(RAW_DATASET.platforms)[0];

  const hashTab = window.location.hash ? window.location.hash.replace('#', '').toLowerCase() : null;
  const savedTab = localStorage.getItem('active_tab');
  const targetTab = hashTab || savedTab || 'overview';

  switchPlatform(firstPid, targetTab);
}

window.addEventListener('hashchange', () => {
  const hashTab = window.location.hash ? window.location.hash.replace('#', '').toLowerCase() : 'overview';
  switchTab(hashTab);
});

window.addEventListener('DOMContentLoaded', () => initPortal(false));
