/* Exate Unified Performance Engineering Portal — 100% Dynamic Engine */

let RAW_DATASET = null;
let PORTAL_DATA = null;
let cmpCharts = {};
let jobCharts = {};
let MODELER_CALC_MODE = 'throughput'; // 'throughput' or 'hardware'

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
  renderCapacityModeler();
  renderComparisonTab();
  renderInfraTab();
  renderFormulasTab();

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

    <button class="sidebar-btn" onclick="switchTab('modeler', this)">
      <div class="sidebar-btn-left">
        <i data-lucide="calculator" style="width: 16px; height: 16px;"></i>
        <span>Capacity Modeler</span>
      </div>
      <span class="nav-tag" style="background:rgba(26,115,232,0.15); color:#1a73e8; border-color:rgba(26,115,232,0.3);">Interactive</span>
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

    <button class="sidebar-btn" onclick="switchTab('formulas', this)">
      <div class="sidebar-btn-left">
        <i data-lucide="book-open" style="width: 16px; height: 16px;"></i>
        <span>Calculation Logic</span>
      </div>
      <span class="nav-tag" style="background:rgba(52,168,83,0.15); color:#34a853; border-color:rgba(52,168,83,0.3);">Formulas</span>
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
    } else if (tabId === 'modeler') {
      titleEl.innerHTML = `<i data-lucide="calculator" style="color: #1a73e8;"></i> Interactive Hardware Capacity & HPA Scaling Modeler`;
      subTitleEl.innerText = `Real-time Kubernetes resource calculator & dual-mode capacity modeler (${pTitle})`;
      renderCapacityModeler();
    } else if (tabId === 'comparison') {
      titleEl.innerHTML = `<i data-lucide="git-compare" style="color: #a142f4;"></i> Cross-Job Multi-Metric Comparison`;
      subTitleEl.innerText = `Side-by-side capacity, latency scaling, failure rates & resource consumption`;
    } else if (tabId === 'infrastructure') {
      titleEl.innerHTML = `<i data-lucide="cpu" style="color: #a142f4;"></i> Infrastructure & Pod Resource Specs`;
      subTitleEl.innerText = `Hardware environment & Kubernetes pod CPU/Memory resource allocations (${pTitle})`;
    } else if (tabId === 'formulas') {
      titleEl.innerHTML = `<i data-lucide="book-open" style="color: #34a853;"></i> Capacity Calculation Logic & Formulas`;
      subTitleEl.innerText = `Mathematical equations, microservice scaling rules, HPA target formulas & bottleneck logic (${pTitle})`;
      renderFormulasTab();
    } else if (PORTAL_DATA.jobs[tabId.toUpperCase()] || PORTAL_DATA.jobs[capitalize(tabId)]) {
      const jk = PORTAL_DATA.jobs[tabId.toUpperCase()] ? tabId.toUpperCase() : capitalize(tabId);
      const cfg = PORTAL_DATA.jobs[jk].config || {};
      titleEl.innerHTML = `<i data-lucide="shield-check" style="color: #34a853;"></i> ${jk} Performance & Capacity`;
      subTitleEl.innerText = `${cfg.category || 'Security transform performance report'}`;
    }
    lucide.createIcons();
  }

  if (tabId === 'formulas') {
    renderFormulasTab();
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

  // Render Callout Banner to Modeler in Infrastructure tab
  const overviewTab = document.getElementById('tab-overview');
  if (overviewTab && !document.getElementById('overviewModelerBanner')) {
    const bannerDiv = document.createElement('div');
    bannerDiv.id = 'overviewModelerBanner';
    bannerDiv.innerHTML = `
      <section class="section" style="margin-top:24px; background:linear-gradient(135deg, rgba(26,115,232,0.08) 0%, rgba(52,168,83,0.08) 100%); border-left:4px solid var(--google-blue);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:10px; background:rgba(26,115,232,0.15); color:#1a73e8; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="calculator" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-main);">Interactive Hardware Capacity & HPA Scaling Modeler</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">Compute required pods, vCPU & RAM from target RPS or calculate max achievable throughput from defined hardware.</p>
            </div>
          </div>
          <button class="sidebar-btn" style="background:#1a73e8; color:#ffffff; border:none; padding:10px 18px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px;" onclick="switchTab('modeler')">
            <span>Launch Modeler Section</span>
            <i data-lucide="arrow-right" style="width:16px;"></i>
          </button>
        </div>
      </section>
    `;
    overviewTab.appendChild(bannerDiv);
  }

  lucide.createIcons();
}

// 6b. Interactive Hardware Capacity & HPA Scaling Modeler
function renderCapacityModeler() {
  const modelerContainer = document.getElementById('modelerContainer');
  if (!modelerContainer || !PORTAL_DATA) return;

  modelerContainer.innerHTML = `
    <section class="section">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <i data-lucide="calculator" style="color: #1a73e8;"></i> Interactive Hardware Capacity & HPA Scaling Modeler
        </div>
        <button class="badge badge-emerald" style="font-size:0.78rem; border:1px solid #34a853; padding:6px 12px; cursor:pointer; background:rgba(52,168,83,0.12); display:flex; align-items:center; gap:6px;" onclick="switchTab('formulas')">
          <i data-lucide="book-open" style="width:14px;"></i> View Calculation Logic & Formulas Reference &rarr;
        </button>
      </div>
      <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
        Real-time Kubernetes resource calculator with dynamic inter-service scaling dependency modeling. Compute required hardware from target RPS or calculate maximum achievable throughput from defined vCPU cores and RAM.
      </p>

      <!-- Capacity Sizing Approximation & Workload Complexity Notice -->
      <div style="background: rgba(249, 171, 0, 0.08); border-left: 4px solid #fbbc04; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid rgba(249, 171, 0, 0.25);">
        <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.88rem; color:#fbbc04; margin-bottom:6px;">
          <i data-lucide="alert-triangle" style="width:16px;"></i> Capacity Sizing Approximation & Workload Complexity Notice
        </div>
        <p style="font-size:0.82rem; color:var(--text-main); margin:0; line-height:1.5;">
          <strong>Note:</strong> The resource calculations, pod sizing, and achievable throughput numbers generated by this modeler represent <strong>baseline empirical projections</strong>. Actual production hardware capacity can vary based on specific workload parameters, such as:
        </p>
        <ul style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; margin-bottom:0; padding-left:20px; line-height:1.6;">
          <li><strong>JSON Structure Depth:</strong> Deeply nested JSON payload structures vs flat key-value pairs (JSON AST parsing &amp; traversal overhead).</li>
          <li><strong>Field Protection Density:</strong> Number of sensitive values protected/masked per payload (e.g. masking 10 fields vs 20 fields per request).</li>
          <li><strong>Payload Size &amp; Policy Rules:</strong> Individual request payload byte volumes, token dictionary lookup hits, and ABAC policy evaluation rule depth.</li>
        </ul>
      </div>

      <!-- Mode Selector Buttons -->
      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
        <button id="modeBtnThroughput" class="modeler-mode-btn ${MODELER_CALC_MODE === 'throughput' ? 'active' : ''}" onclick="setCapacityModelerMode('throughput')">
          <i data-lucide="arrow-right-circle" style="width:16px;"></i>
          <span>Mode 1: Target Throughput &rarr; Required Hardware</span>
        </button>
        <button id="modeBtnHardware" class="modeler-mode-btn ${MODELER_CALC_MODE === 'hardware' ? 'active' : ''}" onclick="setCapacityModelerMode('hardware')">
          <i data-lucide="cpu" style="width:16px;"></i>
          <span>Mode 2: Defined Hardware &rarr; Achievable Throughput</span>
        </button>
      </div>

      <!-- Main Modeler Card -->
      <div style="background:var(--bg-card); padding:24px; border-radius:12px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:24px;">
        
        <!-- Controls Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:28px;" id="modelerInputsContainer">
          <!-- Populated dynamically via renderModelerInputs() -->
        </div>

        <!-- 4 Primary Metric Output Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px;" id="modelerKpiCards">
          <!-- Populated dynamically via updateCapacityModeler() -->
        </div>

        <!-- Multi-Service Dynamic Resource Breakdown -->
        <div style="background:var(--bg-primary); padding:20px; border-radius:10px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
            <div style="font-size:0.92rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i data-lucide="layers" style="width:18px; color:#1a73e8;"></i> Microservices Dynamic Resource Allocation & Inter-Service Scaling
            </div>
            <span class="badge badge-sky" style="font-size:0.75rem;">
              <i data-lucide="refresh-cw" style="width:12px;"></i> Proportional Auto-Scaling Rules
            </span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:16px; line-height:1.5;">
            <strong>Dynamic Scaling Dynamics:</strong> As <code>APIgator</code> gateway pods scale horizontally with throughput, <code>Meta Data Worker</code> remains a single pod instance (<code>1 Pod</code>) with vertically auto-scaled vCPU and RAM allocations to process higher key generation load. Shared <code>Redis Cache</code> and <code>HashiCorp Vault</code> baseline instances remain constant.
          </p>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;" id="modelerServicesGrid">
            <!-- Dynamic per-service cards populated via updateCapacityModeler() -->
          </div>
        </div>

      </div>
    </section>
  `;

  renderModelerInputs();
  updateCapacityModeler();
  lucide.createIcons();
}

// 6c. Capacity Calculation Logic & Formulas Tab
function renderFormulasTab() {
  const container = document.getElementById('formulasContainer');
  if (!container || !PORTAL_DATA) return;

  const platform = PORTAL_DATA.platform || {};

  container.innerHTML = `
    <section class="section">
      <div class="section-title">
        <i data-lucide="book-open" style="color: #34a853;"></i> System Capacity Calculation Logic & Mathematical Formulas
      </div>
      <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px; line-height:1.6;">
        This standalone reference section documents all mathematical equations, inter-service scaling rules, Kubernetes Horizontal Pod Autoscaler (HPA) target derivations, and bottleneck determination solvers used across the Exate Capacity Modeler and Performance Portal.
      </p>

      <!-- Grid of 6 Main Calculation Modules -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:22px; margin-bottom:28px;">

        <!-- Card 1: APIgator Gateway Pod Sizing -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #1a73e8; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">1. APIgator Pod Sizing Formula</strong>
            <span class="badge badge-sky" style="font-size:0.72rem;">Horizontal Autoscaling</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.88rem; color:#1a73e8; border:1px solid var(--border-subtle); line-height:1.5;">
            APIgator_Pods = Math.ceil( Target_RPS / HPA_Target_Per_Pod )
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Parameter Definitions:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li><code>Target_RPS</code>: Required overall system request rate (e.g. 5,000 RPS).</li>
              <li><code>HPA_Target_Per_Pod</code>: Safe target RPS capacity allocated per gateway pod (500 for PROTECT, 400 for RESTRICT, 350 for PSEUDONYMISE, 320 for RECONSTRUCT).</li>
              <li><strong>Pod Spec:</strong> 1.20 vCPU (1200m) &amp; 1.00 GiB RAM per pod instance.</li>
            </ul>
          </div>
        </div>

        <!-- Card 2: Meta Data Worker Vertical Scaling -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #c58af9; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">2. Meta Data Worker Resource Scaling</strong>
            <span class="badge badge-purple" style="font-size:0.72rem;">Vertical Scaling (1 Pod)</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.84rem; color:#c58af9; border:1px solid var(--border-subtle); line-height:1.6;">
            Pods = 1 (Fixed Single Instance)<br>
            Meta_CPU = Math.max(0.25, (APIgator_Pods / 4) * 0.25) vCPU<br>
            Meta_RAM = Math.max(0.50, (APIgator_Pods / 4) * 0.50) GiB
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Scaling Logic:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li>Pod count remains strictly <strong>1 Pod</strong> to eliminate multi-instance session synchronization overhead.</li>
              <li>Allocated vCPU and Memory scale vertically (+0.25 vCPU &amp; +0.5 GiB RAM for every 4 APIgator pods) to sustain key generator throughput.</li>
            </ul>
          </div>
        </div>

        <!-- Card 3: Total System Hardware Aggregation -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #34a853; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">3. Total Hardware Footprint Formula</strong>
            <span class="badge badge-emerald" style="font-size:0.72rem;">System Aggregation</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#34a853; border:1px solid var(--border-subtle); line-height:1.6;">
            Total_CPU = (APIgator_Pods * 1.2) + Meta_CPU + 0.50(Redis) + 0.25(Vault)<br>
            Total_RAM = (APIgator_Pods * 1.0) + Meta_RAM + 4.00(Redis) + 0.50(Vault)<br>
            Physical_Cores = Math.ceil( Total_CPU )
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Static Baseline Overhead:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li><code>Redis Cache</code>: Fixed 1 Pod @ 0.50 vCPU, 4.0 GiB RAM.</li>
              <li><code>HashiCorp Vault</code>: Fixed 1 Pod @ 0.25 vCPU, 0.5 GiB RAM.</li>
              <li><code>Total Pods</code> = APIgator_Pods + 3.</li>
            </ul>
          </div>
        </div>

        <!-- Card 4: Mode 2 Hardware Capacity Solver -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #fbbc04; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">4. Mode 2 Hardware Capacity Solver</strong>
            <span class="badge badge-amber" style="font-size:0.72rem;">Hardware &rarr; RPS</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#fbbc04; border:1px solid var(--border-subtle); line-height:1.6;">
            Solve Max A (APIgator Pods) where:<br>
            Total_CPU(A) &lt;= Defined_CPU AND Total_RAM(A) &lt;= Defined_RAM<br>
            Achievable_RPS = Max_A * HPA_Target_Per_Pod
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Evaluation Mechanism:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li>Iterates integer pod counts A &gt;= 1 against physical host resource boundaries.</li>
              <li>Calculates achievable RPS across <strong>all job categories simultaneously</strong>.</li>
            </ul>
          </div>
        </div>

        <!-- Card 5: HPA Target Per Pod Safety Buffer Math -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #ea4335; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">5. HPA Per-Pod Safety Target Math</strong>
            <span class="badge badge-rose" style="font-size:0.72rem;">Safety Headroom</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#ea4335; border:1px solid var(--border-subtle); line-height:1.6;">
            HPA_Target = ( Total_60m_Soak_Safe_RPS / 4_Pods ) * Safety_Factor<br>
            Safety_Factor = 0.80 to 0.93 (Knee Point &amp; Latency Calibrated)
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Job Calibration Matrix:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li><code>Pseudonymise</code> (350 RPS/pod): Knee point @ 2.0k (+500 RPS headroom).</li>
              <li><code>Reconstruct</code> (320 RPS/pod): Knee point @ 1.7k (+200 RPS headroom) &amp; higher latency (53.6ms). Triggers autoscaling earlier.</li>
            </ul>
          </div>
        </div>

        <!-- Card 6: Capacity Bottleneck Determination -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #00b0ff; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">6. Capacity Ceiling &amp; Bottleneck Logic</strong>
            <span class="badge badge-sky" style="font-size:0.72rem;">Constraint Solver</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#00b0ff; border:1px solid var(--border-subtle); line-height:1.6;">
            Test (A_max + 1) Pod Requirements:<br>
            If CPU_next &gt; Defined_CPU AND RAM_next &lt;= Defined_RAM &rarr; CPU Constrained<br>
            If RAM_next &gt; Defined_RAM AND CPU_next &lt;= Defined_CPU &rarr; RAM Constrained
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Status Indicators:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li><code>Balanced Load</code>: CPU and RAM ceiling reached simultaneously.</li>
              <li><code>Insufficient Hardware</code>: Defined host resources lower than minimum 1 pod footprint (2.2 vCPU, 6.0 GiB RAM).</li>
            </ul>
          </div>
        </div>

        <!-- Card 7: JVM Java Options -->
        <div style="background:var(--bg-card); padding:22px; border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #34a853; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1.0rem; color:var(--text-main); font-weight:800;">7. JVM Java Runtime Options (s390x)</strong>
            <span class="badge badge-emerald" style="font-size:0.72rem;">JVM Tuning</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#34a853; border:1px solid var(--border-subtle); line-height:1.6;">
            -Xgcpolicy:gencon -XX:MaxRAMPercentage=75.0
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
            <strong>Runtime Specifications:</strong>
            <ul style="padding-left:18px; margin-top:6px; margin-bottom:0;">
              <li><code>-Xgcpolicy:gencon</code>: IBM Semeru / OpenJ9 Generational Concurrent Garbage Collection policy optimized for low-latency memory management on s390x hardware.</li>
              <li><code>-XX:MaxRAMPercentage=75.0</code>: Dynamically bounds max JVM heap memory to 75% of container RAM limits.</li>
            </ul>
          </div>
        </div>

      </div>

      <!-- Microservices Resource Allocation Reference Table -->
      <div style="background:var(--bg-card); padding:24px; border-radius:12px; border:1px solid var(--border-color);">
        <div style="font-size:1.0rem; font-weight:800; color:var(--text-main); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="layers" style="width:18px; color:#1a73e8;"></i> Complete Microservices Baseline &amp; Scaling Allocation Matrix
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.86rem;">
            <thead>
              <tr style="border-bottom:2px solid var(--border-color); text-align:left; color:var(--text-muted);">
                <th style="padding:10px;">Microservice</th>
                <th style="padding:10px;">Scaling Mode</th>
                <th style="padding:10px;">Baseline Pod Count</th>
                <th style="padding:10px;">vCPU Formula / Request</th>
                <th style="padding:10px;">Memory Formula / Request</th>
                <th style="padding:10px;">Scaling Trigger &amp; Dependency</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:12px 10px;"><strong style="color:#1a73e8;">APIgator Gateway</strong></td>
                <td style="padding:12px 10px;"><span class="badge badge-sky">Horizontal (HPA)</span></td>
                <td style="padding:12px 10px;">4 Pods (Benchmark)</td>
                <td style="padding:12px 10px;"><code>1.20 vCPU (1200m) / pod</code></td>
                <td style="padding:12px 10px;"><code>1.00 GiB / pod</code></td>
                <td style="padding:12px 10px;">Scales with Target RPS / HPA Target</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:12px 10px;"><strong style="color:#c58af9;">Meta Data Worker</strong></td>
                <td style="padding:12px 10px;"><span class="badge badge-purple">Vertical Resource</span></td>
                <td style="padding:12px 10px;"><strong>1 Pod (Fixed)</strong></td>
                <td style="padding:12px 10px;"><code>max(0.25, A/4 * 0.25) vCPU</code></td>
                <td style="padding:12px 10px;"><code>max(0.50, A/4 * 0.50) GiB</code></td>
                <td style="padding:12px 10px;">CPU &amp; RAM scale vertically 1:4 with APIgator</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:12px 10px;"><strong style="color:#fbbc04;">Redis Cache</strong></td>
                <td style="padding:12px 10px;"><span class="badge badge-amber">Static Baseline</span></td>
                <td style="padding:12px 10px;">1 Pod (Fixed)</td>
                <td style="padding:12px 10px;"><code>0.50 vCPU (Fixed)</code></td>
                <td style="padding:12px 10px;"><code>4.00 GiB (Fixed)</code></td>
                <td style="padding:12px 10px;">Shared cache layer (Unchanged baseline)</td>
              </tr>
              <tr>
                <td style="padding:12px 10px;"><strong style="color:#34a853;">HashiCorp Vault</strong></td>
                <td style="padding:12px 10px;"><span class="badge badge-emerald">Static Baseline</span></td>
                <td style="padding:12px 10px;">1 Pod (Fixed)</td>
                <td style="padding:12px 10px;"><code>0.25 vCPU (Fixed)</code></td>
                <td style="padding:12px 10px;"><code>0.50 GiB (Fixed)</code></td>
                <td style="padding:12px 10px;">Secrets &amp; key store (Unchanged baseline)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>
  `;

  lucide.createIcons();
}

function setCapacityModelerMode(mode) {
  MODELER_CALC_MODE = mode;
  renderCapacityModeler();
}

function renderModelerInputs() {
  const container = document.getElementById('modelerInputsContainer');
  if (!container || !PORTAL_DATA) return;

  const jobs = PORTAL_DATA.jobs || {};
  const jobOptions = Object.keys(jobs).map(jk => {
    const cfg = jobs[jk].config || {};
    return `<option value="${jk}">${jk} (${cfg.hpa_target_per_pod_rps || 400} RPS / pod HPA target)</option>`;
  }).join('');

  if (MODELER_CALC_MODE === 'throughput') {
    container.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <label style="font-size:0.9rem; font-weight:700; color:var(--text-main);">Target Throughput (RPS):</label>
          <strong style="font-size:1.1rem; color:#1a73e8;" id="modelRpsVal">5,000 RPS</strong>
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
          <input type="range" id="modelRpsSlider" min="500" max="20000" step="500" value="5000" style="flex:1; accent-color:#1a73e8; cursor:pointer;" oninput="syncRpsFromSlider()">
          <input type="number" id="modelRpsNum" min="500" max="50000" step="100" value="5000" style="width:100px; padding:8px 10px; border-radius:6px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); font-weight:700; text-align:right;" oninput="syncRpsFromNum()">
        </div>
      </div>
      <div>
        <label style="font-size:0.85rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">Target Workload Job Category:</label>
        <select id="modelJobSelect" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); font-size:0.88rem; font-weight:600;" onchange="updateCapacityModeler()">
          ${jobOptions}
        </select>
      </div>
    `;
  } else {
    // Mode 2: Defined Hardware Mode - Compute for ALL job types simultaneously
    container.innerHTML = `
      <div style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:24px;">
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <label style="font-size:0.88rem; font-weight:700; color:var(--text-main);">Defined Host CPU Cores:</label>
            <strong style="font-size:1.1rem; color:#34a853;" id="modelCpuInputVal">6.0 Cores</strong>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="range" id="modelCpuSlider" min="1.0" max="64.0" step="0.5" value="6.0" style="flex:1; accent-color:#34a853; cursor:pointer;" oninput="syncCpuFromSlider()">
            <input type="number" id="modelCpuNum" min="1.0" max="128.0" step="0.5" value="6.0" style="width:90px; padding:6px 10px; border-radius:6px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); font-weight:700; text-align:right;" oninput="syncCpuFromNum()">
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <label style="font-size:0.88rem; font-weight:700; color:var(--text-main);">Defined Host Memory (RAM GiB):</label>
            <strong style="font-size:1.1rem; color:#c58af9;" id="modelRamInputVal">9.0 GiB</strong>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="range" id="modelRamSlider" min="2.0" max="128.0" step="1.0" value="9.0" style="flex:1; accent-color:#c58af9; cursor:pointer;" oninput="syncRamFromSlider()">
            <input type="number" id="modelRamNum" min="2.0" max="256.0" step="1.0" value="9.0" style="width:90px; padding:6px 10px; border-radius:6px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); font-weight:700; text-align:right;" oninput="syncRamFromNum()">
          </div>
        </div>
      </div>
    `;
  }
}

function syncRpsFromSlider() {
  const slider = document.getElementById('modelRpsSlider');
  const num = document.getElementById('modelRpsNum');
  const val = document.getElementById('modelRpsVal');
  if (!slider) return;
  if (num) num.value = slider.value;
  if (val) val.innerText = parseInt(slider.value, 10).toLocaleString() + ' RPS';
  updateCapacityModeler();
}

function syncRpsFromNum() {
  const slider = document.getElementById('modelRpsSlider');
  const num = document.getElementById('modelRpsNum');
  const val = document.getElementById('modelRpsVal');
  if (!num) return;
  let v = parseInt(num.value, 10);
  if (isNaN(v) || v < 500) v = 500;
  if (slider) slider.value = Math.min(v, 50000);
  if (val) val.innerText = v.toLocaleString() + ' RPS';
  updateCapacityModeler();
}

function syncCpuFromSlider() {
  const slider = document.getElementById('modelCpuSlider');
  const num = document.getElementById('modelCpuNum');
  const val = document.getElementById('modelCpuInputVal');
  if (!slider) return;
  if (num) num.value = slider.value;
  if (val) val.innerText = parseFloat(slider.value).toFixed(1) + ' Cores';
  updateCapacityModeler();
}

function syncCpuFromNum() {
  const slider = document.getElementById('modelCpuSlider');
  const num = document.getElementById('modelCpuNum');
  const val = document.getElementById('modelCpuInputVal');
  if (!num) return;
  let v = parseFloat(num.value);
  if (isNaN(v) || v < 1.0) v = 1.0;
  if (slider) slider.value = Math.min(v, 128.0);
  if (val) val.innerText = v.toFixed(1) + ' Cores';
  updateCapacityModeler();
}

function syncRamFromSlider() {
  const slider = document.getElementById('modelRamSlider');
  const num = document.getElementById('modelRamNum');
  const val = document.getElementById('modelRamInputVal');
  if (!slider) return;
  if (num) num.value = slider.value;
  if (val) val.innerText = parseFloat(slider.value).toFixed(1) + ' GiB';
  updateCapacityModeler();
}

function syncRamFromNum() {
  const slider = document.getElementById('modelRamSlider');
  const num = document.getElementById('modelRamNum');
  const val = document.getElementById('modelRamInputVal');
  if (!num) return;
  let v = parseFloat(num.value);
  if (isNaN(v) || v < 2.0) v = 2.0;
  if (slider) slider.value = Math.min(v, 256.0);
  if (val) val.innerText = v.toFixed(1) + ' GiB';
  updateCapacityModeler();
}

function updateCapacityModeler() {
  if (!PORTAL_DATA || !PORTAL_DATA.jobs) return;

  const jobs = PORTAL_DATA.jobs || {};
  const jobKeys = Object.keys(jobs);

  const APIGATOR_CPU_PER_POD = 1.2;
  const APIGATOR_RAM_PER_POD = 1.0;
  
  const METADATA_BASE_CPU = 0.25;
  const METADATA_BASE_RAM = 0.5;
  const APIGATOR_PER_METADATA_STEP = 4;

  const REDIS_CPU_FIXED = 0.50;
  const REDIS_RAM_FIXED = 4.0;
  
  const VAULT_CPU_FIXED = 0.25;
  const VAULT_RAM_FIXED = 0.5;

  let isHardwareMode = MODELER_CALC_MODE === 'hardware';

  if (!isHardwareMode) {
    // Mode 1: Target Throughput -> Required Hardware
    const select = document.getElementById('modelJobSelect');
    const slider = document.getElementById('modelRpsSlider');
    if (!select || !slider) return;

    const jobKey = select.value;
    const jobObj = jobs[jobKey] || {};
    const cfg = jobObj.config || {};
    const targetPerPod = cfg.hpa_target_per_pod_rps || 500;
    const targetRps = parseInt(slider.value, 10);

    const apigatorPods = Math.max(1, Math.ceil(targetRps / targetPerPod));
    
    // Meta Data Worker remains fixed at 1 Pod, scaling resources vertically
    const metaDataPods = 1;
    const metaDataCpuTotal = Math.max(METADATA_BASE_CPU, (apigatorPods / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_CPU);
    const metaDataRamTotal = Math.max(METADATA_BASE_RAM, (apigatorPods / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_RAM);

    const apigatorCpuTotal = apigatorPods * APIGATOR_CPU_PER_POD;
    const apigatorRamTotal = apigatorPods * APIGATOR_RAM_PER_POD;

    const totalCpuCores = apigatorCpuTotal + metaDataCpuTotal + REDIS_CPU_FIXED + VAULT_CPU_FIXED;
    const totalRamGiB = apigatorRamTotal + metaDataRamTotal + REDIS_RAM_FIXED + VAULT_RAM_FIXED;

    const kpiCardsEl = document.getElementById('modelerKpiCards');
    if (kpiCardsEl) {
      kpiCardsEl.innerHTML = `
        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Target Throughput</div>
          <div style="font-size:1.4rem; font-weight:800; color:#1a73e8; margin-top:4px;">${targetRps.toLocaleString()} RPS</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${jobKey} category</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">APIgator Gateway Pods</div>
          <div style="font-size:1.4rem; font-weight:800; color:#1a73e8; margin-top:4px;">${apigatorPods} Pods</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">~${targetPerPod} RPS / pod HPA target</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Meta-Data Worker Instance</div>
          <div style="font-size:1.4rem; font-weight:800; color:#c58af9; margin-top:4px;">1 Pod</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">Vertically scaled (${metaDataCpuTotal.toFixed(2)} vCPU / ${metaDataRamTotal.toFixed(1)} GiB)</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Total System Hardware Required</div>
          <div style="font-size:1.25rem; font-weight:800; color:#34a853; margin-top:4px;">${totalCpuCores.toFixed(2)} vCPU / ${totalRamGiB.toFixed(1)} GiB</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">
            ~${Math.ceil(totalCpuCores)} Physical Cores across ${apigatorPods + 3} total system pods
          </div>
        </div>
      `;
    }

    const servicesGridEl = document.getElementById('modelerServicesGrid');
    if (servicesGridEl) {
      servicesGridEl.innerHTML = `
        <!-- APIgator Gateway Card -->
        <div style="background:var(--bg-card); padding:14px; border-radius:8px; border:1px solid var(--border-color); border-left:4px solid #1a73e8;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.9rem; color:var(--text-main);">APIgator Gateway</strong>
            <span class="badge badge-sky" style="font-size:0.7rem;">Primary HPA</span>
          </div>
          <div style="font-size:1.1rem; font-weight:800; color:#1a73e8; margin-bottom:4px;">${apigatorPods} Pods</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">CPU: <strong style="color:var(--text-main);">${apigatorCpuTotal.toFixed(2)} Cores</strong> (${APIGATOR_CPU_PER_POD} Core/pod)</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">RAM: <strong style="color:var(--text-main);">${apigatorRamTotal.toFixed(1)} GiB</strong> (${APIGATOR_RAM_PER_POD} GiB/pod)</div>
          <div style="font-size:0.7rem; color:#38bdf8; margin-top:6px; font-weight:600;"><i data-lucide="trending-up" style="width:11px;"></i> Horizontal scaling with Target RPS</div>
        </div>

        <!-- Meta Data Worker Card -->
        <div style="background:var(--bg-card); padding:14px; border-radius:8px; border:1px solid var(--border-color); border-left:4px solid #c58af9;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.9rem; color:var(--text-main);">Meta Data Worker</strong>
            <span class="badge badge-purple" style="font-size:0.7rem;">Vertical Resource Scaling</span>
          </div>
          <div style="font-size:1.1rem; font-weight:800; color:#c58af9; margin-bottom:4px;">1 Pod</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">CPU: <strong style="color:var(--text-main);">${metaDataCpuTotal.toFixed(2)} Cores</strong> (Vertically scaled)</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">RAM: <strong style="color:var(--text-main);">${metaDataRamTotal.toFixed(1)} GiB</strong> (Vertically scaled)</div>
          <div style="font-size:0.7rem; color:#c58af9; margin-top:6px; font-weight:600;"><i data-lucide="arrow-up-circle" style="width:11px;"></i> CPU & RAM scale vertically with APIgator</div>
        </div>

        <!-- Redis Cache Card -->
        <div style="background:var(--bg-card); padding:14px; border-radius:8px; border:1px solid var(--border-color); border-left:4px solid #fbbc04;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.9rem; color:var(--text-main);">Redis Cache</strong>
            <span class="badge badge-amber" style="font-size:0.7rem;">Static Cache</span>
          </div>
          <div style="font-size:1.1rem; font-weight:800; color:#fbbc04; margin-bottom:4px;">1 Pod</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">CPU: <strong style="color:var(--text-main);">${REDIS_CPU_FIXED.toFixed(2)} Cores</strong> (Fixed)</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">RAM: <strong style="color:var(--text-main);">${REDIS_RAM_FIXED.toFixed(1)} GiB</strong> (Fixed)</div>
          <div style="font-size:0.7rem; color:#fbbc04; margin-top:6px; font-weight:600;"><i data-lucide="lock" style="width:11px;"></i> Unchanged Baseline</div>
        </div>

        <!-- HashiCorp Vault Card -->
        <div style="background:var(--bg-card); padding:14px; border-radius:8px; border:1px solid var(--border-color); border-left:4px solid #34a853;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.9rem; color:var(--text-main);">HashiCorp Vault</strong>
            <span class="badge badge-emerald" style="font-size:0.7rem;">Static Secrets</span>
          </div>
          <div style="font-size:1.1rem; font-weight:800; color:#34a853; margin-bottom:4px;">1 Pod</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">CPU: <strong style="color:var(--text-main);">${VAULT_CPU_FIXED.toFixed(2)} Cores</strong> (Fixed)</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">RAM: <strong style="color:var(--text-main);">${VAULT_RAM_FIXED.toFixed(1)} GiB</strong> (Fixed)</div>
          <div style="font-size:0.7rem; color:#34a853; margin-top:6px; font-weight:600;"><i data-lucide="lock" style="width:11px;"></i> Unchanged Baseline</div>
        </div>
      `;
    }

  } else {
    // Mode 2: Defined Hardware Mode - ALL JOB TYPES AT ONCE!
    const cpuSlider = document.getElementById('modelCpuSlider');
    const ramSlider = document.getElementById('modelRamSlider');
    let definedCpu = cpuSlider ? parseFloat(cpuSlider.value) : 6.0;
    let definedRam = ramSlider ? parseFloat(ramSlider.value) : 9.0;

    const allJobResults = jobKeys.map(jk => {
      const cfg = jobs[jk].config || {};
      const targetPerPod = cfg.hpa_target_per_pod_rps || 500;

      let maxA = 0;
      for (let a = 1; a <= 200; a++) {
        let metaCpu = Math.max(METADATA_BASE_CPU, (a / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_CPU);
        let metaRam = Math.max(METADATA_BASE_RAM, (a / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_RAM);

        let cpuNeeded = (a * APIGATOR_CPU_PER_POD) + metaCpu + REDIS_CPU_FIXED + VAULT_CPU_FIXED;
        let ramNeeded = (a * APIGATOR_RAM_PER_POD) + metaRam + REDIS_RAM_FIXED + VAULT_RAM_FIXED;
        
        if (cpuNeeded <= definedCpu + 0.001 && ramNeeded <= definedRam + 0.001) {
          maxA = a;
        } else {
          break;
        }
      }

      const apigatorPods = maxA;
      const achievedRps = apigatorPods * targetPerPod;

      const metaDataCpu = Math.max(METADATA_BASE_CPU, (apigatorPods / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_CPU);
      const metaDataRam = Math.max(METADATA_BASE_RAM, (apigatorPods / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_RAM);

      const cpuUsed = (apigatorPods * APIGATOR_CPU_PER_POD) + metaDataCpu + REDIS_CPU_FIXED + VAULT_CPU_FIXED;
      const ramUsed = (apigatorPods * APIGATOR_RAM_PER_POD) + metaDataRam + REDIS_RAM_FIXED + VAULT_RAM_FIXED;

      let bottleneckText = "Balanced Load";
      let bottleneckColor = "#34a853";

      if (apigatorPods === 0) {
        bottleneckText = "Insufficient Hardware";
        bottleneckColor = "#ea4335";
      } else {
        let nextA = apigatorPods + 1;
        let cpuNextMeta = Math.max(METADATA_BASE_CPU, (nextA / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_CPU);
        let ramNextMeta = Math.max(METADATA_BASE_RAM, (nextA / APIGATOR_PER_METADATA_STEP) * METADATA_BASE_RAM);

        let cpuNextA = (nextA * APIGATOR_CPU_PER_POD) + cpuNextMeta + REDIS_CPU_FIXED + VAULT_CPU_FIXED;
        let ramNextA = (nextA * APIGATOR_RAM_PER_POD) + ramNextMeta + REDIS_RAM_FIXED + VAULT_RAM_FIXED;
        
        if (cpuNextA > definedCpu && ramNextA <= definedRam) {
          bottleneckText = "CPU Constrained";
          bottleneckColor = "#fbbc04";
        } else if (ramNextA > definedRam && cpuNextA <= definedCpu) {
          bottleneckText = "RAM Constrained";
          bottleneckColor = "#c58af9";
        } else if (cpuNextA > definedCpu && ramNextA > definedRam) {
          bottleneckText = "CPU & RAM Constrained";
          bottleneckColor = "#ea4335";
        }
      }

      return {
        jobKey: jk,
        title: cfg.title || jk,
        category: cfg.category || '',
        targetPerPod: targetPerPod,
        apigatorPods: apigatorPods,
        metaDataCpu: metaDataCpu,
        metaDataRam: metaDataRam,
        achievedRps: achievedRps,
        cpuUsed: cpuUsed,
        ramUsed: ramUsed,
        cpuUtilPct: Math.min(100, Math.round((cpuUsed / definedCpu) * 100)),
        ramUtilPct: Math.min(100, Math.round((ramUsed / definedRam) * 100)),
        bottleneckText: bottleneckText,
        bottleneckColor: bottleneckColor
      };
    });

    const maxRpsValue = Math.max(...allJobResults.map(r => r.achievedRps));
    const minRpsValue = Math.min(...allJobResults.map(r => r.achievedRps));
    const firstRes = allJobResults[0] || {};

    const kpiCardsEl = document.getElementById('modelerKpiCards');
    if (kpiCardsEl) {
      kpiCardsEl.innerHTML = `
        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Defined Host Budget</div>
          <div style="font-size:1.35rem; font-weight:800; color:#34a853; margin-top:4px;">${definedCpu.toFixed(1)} vCPU / ${definedRam.toFixed(1)} GiB</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">Defined compute capacity</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Achievable RPS Range</div>
          <div style="font-size:1.35rem; font-weight:800; color:#1a73e8; margin-top:4px;">${minRpsValue.toLocaleString()} - ${maxRpsValue.toLocaleString()} RPS</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">Across all ${jobKeys.length} job categories</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Hardware Utilization</div>
          <div style="font-size:1.35rem; font-weight:800; color:#c58af9; margin-top:4px;">${firstRes.cpuUtilPct || 0}% CPU / ${firstRes.ramUtilPct || 0}% RAM</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${firstRes.cpuUsed ? firstRes.cpuUsed.toFixed(2) + ' vCPU used' : ''}</div>
        </div>

        <div style="background:rgba(128,134,139,0.06); padding:14px; border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Job Categories Calculated</div>
          <div style="font-size:1.35rem; font-weight:800; color:#fbbc04; margin-top:4px;">${jobKeys.length} Job Types</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">All job types computed at once</div>
        </div>
      `;
    }

    const servicesGridEl = document.getElementById('modelerServicesGrid');
    if (servicesGridEl) {
      const rowsHtml = allJobResults.map(res => `
        <tr>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);">
            <strong style="color:var(--text-main); font-size:0.92rem;">${res.jobKey}</strong>
            <br><span style="font-size:0.72rem; color:var(--text-muted);">${res.category}</span>
          </td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><strong style="color:#1a73e8;">${res.targetPerPod} RPS / pod</strong></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><strong>${res.apigatorPods} APIgator Pods</strong></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><span style="color:#c58af9; font-weight:700;">1 Pod (${res.metaDataCpu.toFixed(2)} CPU / ${res.metaDataRam.toFixed(1)} GiB)</span></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><strong style="font-size:1.1rem; color:#34a853;">${res.achievedRps.toLocaleString()} RPS</strong></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><code>${res.cpuUsed.toFixed(2)} CPU / ${res.ramUsed.toFixed(1)} GiB</code></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><span class="badge badge-sky" style="font-size:0.72rem;">${res.cpuUtilPct}% CPU</span></td>
          <td style="padding:12px 10px; border-bottom:1px solid var(--border-color);"><span class="status-badge" style="background:rgba(128,134,139,0.12); color:${res.bottleneckColor}; border:1px solid ${res.bottleneckColor}; font-weight:700;">${res.bottleneckText}</span></td>
        </tr>
      `).join('');

      servicesGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; overflow-x:auto;">
          <div style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="bar-chart-2" style="width:16px; color:#34a853;"></i> Achievable Throughput Comparison Matrix (All Job Types for ${definedCpu.toFixed(1)} CPU / ${definedRam.toFixed(1)} GiB RAM)
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:2px solid var(--border-color); text-align:left; color:var(--text-muted);">
                <th style="padding:10px;">Job Category</th>
                <th style="padding:10px;">HPA Target / Pod</th>
                <th style="padding:10px;">APIgator Gateway</th>
                <th style="padding:10px;">Meta-Data Worker</th>
                <th style="padding:10px;">Max Achievable Throughput</th>
                <th style="padding:10px;">System Resource Footprint</th>
                <th style="padding:10px;">CPU Utilization</th>
                <th style="padding:10px;">Capacity Ceiling Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  lucide.createIcons();
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
          <span>Peak Tested CPU Usage (APIgator Only)</span>
          <div class="kpi-icon" style="background: rgba(52, 168, 83, 0.15); color: #34a853;">
            <i data-lucide="zap"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #34a853;">${totals.peak_cpu_used_pct || 'N/A'}</div>
        <div class="kpi-subtext">APIgator Gateway CPU load (Observed benchmark peak)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span>Peak Tested RAM Footprint (APIgator Only)</span>
          <div class="kpi-icon" style="background: rgba(249, 171, 0, 0.15); color: #fbbc04;">
            <i data-lucide="database"></i>
          </div>
        </div>
        <div class="kpi-value" style="color: #fbbc04;">${totals.peak_memory_used_mb || 'N/A'}</div>
        <div class="kpi-subtext">APIgator Gateway pod RAM (Observed benchmark peak)</div>
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
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="box" style="color: #c58af9;"></i> Microservice Pod Resource Allocations (${services.length} Container Pods)
        </div>
        <span class="badge badge-emerald" style="font-size:0.75rem;">
          Kubernetes QOS: Guaranteed (Limits = Requests)
        </span>
      </div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:14px; line-height:1.5;">
        <strong>Quality of Service (QOS):</strong> Max CPU Limits and Max RAM Limits match Guaranteed CPU Requests and Guaranteed RAM Requests across all microservice pods to ensure strictly guaranteed host resource allocation.
      </p>
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
