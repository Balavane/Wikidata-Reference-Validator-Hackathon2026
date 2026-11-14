/**************************************
 * SKELETON HELPERS
 **************************************/

/** Renders N skeleton suggestion rows into the suggestions dropdown */
function showSuggestionSkeletons(count = 3) {
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    li.className = "skeleton-suggestion";
    li.innerHTML = `
      <div class="skeleton skeleton-line w80 mb-1"></div>
      <div class="skeleton skeleton-line w60" style="height:11px;opacity:0.7"></div>
    `;
    suggestions.appendChild(li);
  }
}

/** Renders a full results skeleton (card + N list rows) */
function showResultsSkeleton(rowCount = 5) {
  const resultDiv = document.getElementById("result");
  let rows = "";
  for (let i = 0; i < rowCount; i++) {
    rows += `
      <div class="skeleton-row">
        <div class="skeleton skeleton-row-url"></div>
        <div class="d-flex gap-2">
          <div class="skeleton skeleton-row-badge"></div>
          <div class="skeleton skeleton-row-btn"></div>
        </div>
      </div>`;
  }
  resultDiv.innerHTML = `
    <div class="skeleton-card">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex gap-2">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
        <div class="skeleton skeleton-line w60" style="height:20px;width:200px"></div>
      </div>
      <div class="mb-3">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-badge"></div>
      </div>
      ${rows}
    </div>`;
}

/** Format timestamp helper (e.g. 20210412153000 -> 2021-04-12 15:30:00) */
function formatTimestamp(ts) {
  if (!ts) return "";
  const s = String(ts);
  if (s.length >= 8) {
    const y = s.substring(0, 4);
    const m = s.substring(4, 6);
    const d = s.substring(6, 8);
    if (s.length >= 14) {
      const hh = s.substring(8, 10);
      const mm = s.substring(10, 12);
      const ss = s.substring(12, 14);
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    }
    return `${y}-${m}-${d}`;
  }
  return s;
}

/** Fade-in helper: wraps real HTML then applies the CSS animation */
function fadeIn(element, html) {
  element.innerHTML = html;
  element.querySelectorAll(".fade-in-content").forEach(el => {
    el.style.animation = "none";
    el.getBoundingClientRect();
    el.style.animation = "";
  });
}

/**************************************
 * AUTOCOMPLETE SEARCH (CENTRALIZED VIA FLASK /search)
 **************************************/
document.getElementById("search").addEventListener("input", async function () {
  const query = this.value.trim();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

/**************************************
 * AUTOCOMPLETE
 **************************************/
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

  // Show skeleton suggestions immediately while fetching
  showSuggestionSkeletons(3);

  try {
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la recherche.");
    }

    const items = await response.json();

    // Clear skeletons and populate with real data
    suggestions.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "list-group-item text-muted small p-3";
      emptyLi.innerHTML = `<i class="bi bi-info-circle me-1"></i> Aucun résultat trouvé pour "<strong>${query}</strong>"`;
      suggestions.appendChild(emptyLi);
      return;
    }

    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action fade-in-content";

      li.innerHTML = `
        <div>
          <strong>${item.label || item.id}</strong>
          ${item.id ? `<span class="badge bg-secondary ms-1 small">${item.id}</span>` : ""}
          <div class="small text-muted">${item.description || ""}</div>
        </div>
      `;

      li.onclick = () => {
        const input = document.getElementById("search");
        input.value = item.label || item.id;
        input.setAttribute("data-qid", item.id);
        input.setAttribute("data-label", item.label || item.id);
        suggestions.innerHTML = "";
      };

      suggestions.appendChild(li);
    });
  } catch (err) {
    suggestions.innerHTML = `
      <li class="list-group-item list-group-item-danger p-2 small">
        <i class="bi bi-exclamation-triangle me-1"></i> ${err.message || "Impossible de contacter le serveur pour la recherche."}
      </li>
    `;
  }
});

els.input.addEventListener("keydown", e => {
  const open = !els.suggestions.hidden && state.suggestions.length > 0;

  if (e.key === "ArrowDown" && open) {
    e.preventDefault();
    state.activeIndex = (state.activeIndex + 1) % state.suggestions.length;
    renderSuggestions();
  } else if (e.key === "ArrowUp" && open) {
    e.preventDefault();
    state.activeIndex = state.activeIndex <= 0 ? state.suggestions.length - 1 : state.activeIndex - 1;
    renderSuggestions();
  } else if (e.key === "Enter" && open && state.activeIndex >= 0) {
    e.preventDefault();
    selectSuggestion(state.activeIndex);
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

els.suggestions.addEventListener("mousedown", e => {
  // mousedown (not click) so the input doesn't lose focus first
  const li = e.target.closest("[data-index]");
  if (!li) return;
  e.preventDefault();
  selectSuggestion(Number(li.dataset.index));
});

document.addEventListener("click", e => {
  if (!els.form.contains(e.target)) closeSuggestions();
});

els.clear.addEventListener("click", () => {
  els.input.value = "";
  els.clear.hidden = true;
  state.selected = null;
  closeSuggestions();
  els.input.focus();
});

els.form.addEventListener("submit", e => {
  e.preventDefault();
  const typed = els.input.value.trim();
  if (!typed) {
    els.input.focus();
    els.form.classList.add("is-invalid");
    setTimeout(() => els.form.classList.remove("is-invalid"), 600);
    return;
  }
  closeSuggestions();
  if (state.selected) {
    validate(state.selected.qid, state.selected.label);
  } else if (QID_PATTERN.test(typed)) {
    validate(typed.toUpperCase(), typed.toUpperCase());
  } else {
    validate(null, typed);
  }
});

document.querySelectorAll("[data-example-qid]").forEach(btn => {
  btn.addEventListener("click", () => {
    els.input.value = btn.dataset.exampleLabel;
    els.clear.hidden = false;
    state.selected = { qid: btn.dataset.exampleQid, label: btn.dataset.exampleLabel };
    validate(state.selected.qid, state.selected.label);
  });
});

/**************************************
 * VALIDATE REFERENCES
 **************************************/
async function validate() {
  const input = document.getElementById("search");
  let qid = input.getAttribute("data-qid");
  const val = input.value.trim();
  if (!qid && /^Q\d+$/i.test(val)) {
    qid = val.toUpperCase();
  }

  const label = input.getAttribute("data-label") || input.value;
  const resultDiv = document.getElementById("result");
  const searchSection = document.getElementById("searchSection");

  if (!qid) {
    searchSection.style.display = "none";
    resultDiv.innerHTML = `
      <div class="card p-4 text-center fade-in-content">
        <div class="alert alert-warning mb-3">
          <i class="bi bi-exclamation-triangle"></i>
          Veuillez sélectionner un élément dans la liste des suggestions (ou saisir un identifiant Wikidata comme <strong>Q42</strong> ou <strong>Q937</strong>).
        </div>
        <button class="btn btn-lg btn-glass-action" onclick="resetSearch()">🔄 Réessayer</button>
      </div>`;
    return;
  }

  searchSection.style.display = "none";

  // ── Show skeleton immediately ──
  showResultsSkeleton(6);

async function validate(qid, label, { updateHistory = true } = {}) {
  showLoading(label || qid);
  const start = Date.now();

  try {
    const response = await fetch("/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid, query: qid ? "" : label }),
    });

    const data = await response.json();
    const duration = Math.floor((Date.now() - start) / 1000);

    if (data.error) {
      fadeIn(resultDiv, `
        <div class="card p-4 text-center fade-in-content">
          <div class="alert alert-danger">
            <i class="bi bi-x-circle"></i> ${data.error}
          </div>
          <p class="small text-muted">Completed in ${duration}s</p>
          <button class="btn btn-lg btn-glass-action mt-3"
                  onclick="resetSearch()">🔄 Search Another Item</button>
        </div>`);
      return;
    }

    if (updateHistory && data.qid) {
      const url = `${window.location.pathname}?item=${encodeURIComponent(data.qid)}`;
      history.pushState({ qid: data.qid, label: data.label }, "", url);
    }
    if (data.label) {
      document.title = `${data.label} – Wikidata Reference Validator`;
      els.input.value = data.label;
      els.clear.hidden = false;
      state.selected = { qid: data.qid, label: data.label };
    }

    if (data.message) {
      fadeIn(resultDiv, `
        <div class="card p-4 text-center fade-in-content">
          <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> ${data.message}
          </div>
          <p class="small text-muted">Completed in ${duration}s</p>
          <button class="btn btn-lg btn-glass-action mt-3"
                  onclick="resetSearch()">🔄 Search Another Item</button>
        </div>`);
      return;
    }

    const aliveCount = data.filter(r => r.status === "alive").length;
    const deadCount  = data.filter(r => r.status === "dead").length;

    window.currentResults = data;

function saveReport(report) {
  const refs = report.references;
  try {
    localStorage.setItem("reportData", JSON.stringify({
      qid: report.qid,
      label: report.label,
      description: report.description,
      aliveCount: refs.filter(r => r.status === "alive").length,
      deadCount: refs.filter(r => r.status === "dead").length,
      references: refs,
      duration: report.duration,
      checkedAt: new Date().toISOString(),
    }));
  } catch { /* storage unavailable: report page will show its empty state */ }
}

    let html = `
      <div class="card p-4 fade-in-content">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="d-flex gap-2">
            <button id="viewReportBtn" class="btn btn-info btn-sm">
              📊 View Report
            </button>
            <a href="https://www.wikidata.org/wiki/${qid}"
               target="_blank"
               class="btn btn-glass-warning btn-sm">
              ✏️ Edit Item
            </a>
          </div>
          <h3 class="mb-0 text-light">
            <i class="bi bi-list-check"></i>
            Results for ${label} (${qid})
          </h3>
        </div>

        <p>
          <span class="badge bg-success" id="aliveCountBadge">
            <i class="bi bi-check-circle"></i> Alive: ${aliveCount}
          </span>
          <span class="badge bg-danger ms-2" id="deadCountBadge">
            <i class="bi bi-x-octagon"></i> Dead: ${deadCount}
          </span>
        </p>

function matchesFilters(ref) {
  const { status, category, text } = state.filters;
  if (status === "dead" && ref.status !== "dead") return false;
  if (status === "alive" && ref.status !== "alive") return false;
  if (status === "archived" && !(ref.status === "dead" && ref.suggestedArchive)) return false;
  if (category !== "all" && (ref.sourceCategory || "other") !== category) return false;
  if (text) {
    const haystack = `${ref.url} ${ref.propertyLabel} ${ref.statementValue} ${ref.domain}`.toLowerCase();
    if (!haystack.includes(text)) return false;
  }
  return true;
}

    data.forEach((ref, i) => {
      const badge      = ref.status === "alive" ? "success" : "danger";
      const icon       = ref.status === "alive" ? "check-circle" : "x-octagon";
      const collapseId = `collapseRef${i}`;
      const hasArchive = ref.status === "dead" && ref.suggestedArchive;

      html += `
        <li class="list-group-item p-3 rounded shadow-sm mb-2" id="ref-item-${i}">
          <div class="d-flex justify-content-between align-items-center gap-2">
            <a href="${ref.url}" target="_blank" class="ref-link text-break" id="ref-link-${i}">
              ${ref.url}
            </a>
            <div class="d-flex align-items-center gap-2">
              ${hasArchive ? `<span class="badge bg-warning text-dark" id="archive-pill-${i}"><i class="bi bi-clock-history"></i> Archive</span>` : ""}
              <span class="badge bg-${badge}" id="ref-badge-${i}">
                <i class="bi bi-${icon} me-1"></i> ${ref.status}
              </span>
              <button class="btn btn-sm btn-outline-secondary"
                      data-bs-toggle="collapse"
                      data-bs-target="#${collapseId}">
                Details
              </button>
            </div>
          </div>
          <div class="summary__cell summary__cell--alive">
            <div class="summary__label">Alive</div>
            <div class="summary__value">${counts.alive}<small>/ ${counts.total}</small></div>
          </div>
          <div class="summary__cell summary__cell--dead">
            <div class="summary__label">Unreachable</div>
            <div class="summary__value">${counts.dead}</div>
          </div>
          <div class="summary__cell summary__cell--archive">
            <div class="summary__label">Archived</div>
            <div class="summary__value">${counts.archived}</div>
          </div>
        </div>

          <div class="collapse mt-2" id="${collapseId}">
            <div class="p-2 border rounded bg-light">
              <div class="fw-bold">Statement:</div>
              <div>
                <strong>${ref.propertyLabel}</strong>
                ${ref.statementValue ? `: <em>${ref.statementValue}</em>` : ""}
              </div>

              ${
                ref.status === "dead" && !hasArchive
                  ? `<div class="mt-2 alert alert-warning p-2 mb-1">
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      <strong>Reference unavailable.</strong>
                      Please review or update this reference.
                    </div>
                    <div class="mt-2 small text-muted">
                      📭 No archived snapshot found on Wayback Machine.
                    </div>`
                  : ""
              }

              ${
                hasArchive
                  ? `<div class="mt-2 p-2 border border-warning rounded bg-white">
                      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div class="me-2 text-break" style="max-width: 70%;">
                          <span class="text-dark fw-bold"><i class="bi bi-archive-fill text-warning me-1"></i>Suggested archived version:</span><br>
                          <a href="${ref.suggestedArchive.archiveUrl}" target="_blank" rel="noopener noreferrer" class="fw-semibold link-primary" id="archive-link-${i}">
                            View on Wayback Machine <i class="bi bi-box-arrow-up-right small"></i>
                          </a>
                          ${
                            ref.suggestedArchive.timestamp
                              ? `<div class="small text-muted mt-1">📅 <strong>Snapshot Date:</strong> ${formatTimestamp(ref.suggestedArchive.timestamp)}</div>`
                              : ""
                          }
                        </div>
                        <div class="d-flex gap-2">
                          <button class="btn btn-sm btn-outline-primary" id="copy-btn-${i}" onclick="copyArchiveUrl(${i}, this)" title="Copier le lien archivé">
                            📋 Copier
                          </button>
                          <button class="btn btn-sm btn-success" id="replace-btn-${i}" onclick="replaceWithArchive(${i})" title="Remplacer par la version archivée">
                            🔄 Remplacer
                          </button>
                        </div>
                      </div>
                    </div>`
                  : ""
              }
            </div>
          </div>

          <div class="category-chips" role="radiogroup" aria-label="Source type">
            <button type="button" role="radio" class="chip chip--filter" data-category="all"
                    aria-checked="${state.filters.category === "all"}">All sources</button>
            ${categoryOrder.map(key => {
              const meta = sourceCategoryMeta(key);
              const c = categories[key];
              return `
                <button type="button" role="radio" class="chip chip--filter" data-category="${key}"
                        aria-checked="${state.filters.category === key}">
                  <i class="bi ${meta.icon}"></i> ${meta.label}<span class="count">${c.total}</span>${c.dead ? `<span class="count count--dead" title="${c.dead} unreachable">${c.dead}</span>` : ""}
                </button>`;
            }).join("")}
          </div>
        </section>

        <div id="sections"></div>

        <footer class="catlinks" id="categories">
          <span class="catlinks__label">Categories:</span>
          <ul class="catlinks__list">
            ${counts.dead ? `<li><button type="button" data-status-link="dead">Items with unreachable references</button></li>` : ""}
            ${counts.archived ? `<li><button type="button" data-status-link="archived">References with archived copies</button></li>` : ""}
            ${counts.dead && counts.archived < counts.dead ? `<li><span>Dead references without archives (${counts.dead - counts.archived})</span></li>` : ""}
            ${categoryOrder.map(key => `
              <li><button type="button" data-category-link="${key}">${sourceCategoryMeta(key).label} (${categories[key].total})</button></li>
            `).join("")}
          </ul>
        </footer>
      </article>
    </div>`;

  renderSections();
  bindReportEvents();
  els.result.querySelector(".article")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderReference(ref) {
  const qid = state.report.qid;
  const isDead = ref.status === "dead";
  const meta = sourceCategoryMeta(ref.sourceCategory);
  const statusLabel = isDead ? "Unreachable" : ref.status === "alive" ? "Alive" : ref.status;
  const http = ref.httpStatus ? `HTTP ${ref.httpStatus}` : isDead ? "No response" : "";
  const archive = ref.suggestedArchive;

  return `
    <li class="ref ${isDead ? "ref--dead" : "ref--alive"}">
      <span class="ref__status" title="${escapeHtml(statusLabel)}${http ? ` (${escapeHtml(http)})` : ""}">
        <i class="bi ${isDead ? "bi-x-circle-fill" : "bi-check-circle-fill"}" aria-hidden="true"></i>
        <span class="visually-hidden">${escapeHtml(statusLabel)}</span>
      </span>

      <div class="ref__body">
        <a class="ref__url" href="${escapeHtml(safeUrl(ref.url))}" target="_blank" rel="noopener noreferrer"
           title="${escapeHtml(ref.url)}">${escapeHtml(displayUrl(ref.url))}</a>
        <div class="ref__meta">
          <span class="tag"><i class="bi ${meta.icon}"></i> ${meta.label}</span>
          ${ref.statementValue ? `<span class="ref__value" title="Statement value">${escapeHtml(ref.statementValue)}</span>` : ""}
          ${http ? `<span class="ref__http ${isDead ? "text-dead" : ""}">${escapeHtml(http)}</span>` : ""}
        </div>

        ${isDead ? `
          <div class="ref__archive ${archive ? "" : "ref__archive--none"}">
            ${archive ? `
              <i class="bi bi-archive" aria-hidden="true"></i>
              <span>Archived copy${formatArchiveDate(archive.timestamp) ? ` from <strong>${escapeHtml(formatArchiveDate(archive.timestamp))}</strong>` : ""}</span>
              <a href="${escapeHtml(safeUrl(archive.archiveUrl))}" target="_blank" rel="noopener noreferrer">Open snapshot <i class="bi bi-box-arrow-up-right"></i></a>
              <button type="button" class="link-btn" data-copy="${escapeHtml(archive.archiveUrl)}">Copy archive URL</button>
            ` : `
              <i class="bi bi-inbox" aria-hidden="true"></i>
              <span>No snapshot found automatically.</span>
              <a href="https://web.archive.org/web/*/${escapeHtml(encodeURI(ref.url))}" target="_blank" rel="noopener noreferrer">Search the Wayback Machine</a>
            `}
          </div>` : ""}
      </div>

    // ── Fade in real content (replaces skeleton) ──
    fadeIn(resultDiv, html);

function renderSections() {
  const container = document.getElementById("sections");
  if (!container) return;

  } catch (err) {
    fadeIn(resultDiv, `
      <div class="card p-4 text-center fade-in-content">
        <div class="alert alert-danger">
          <i class="bi bi-bug"></i> Error: ${err}
        </div>
        <button class="btn btn-lg btn-glass-action mt-3"
                onclick="resetSearch()">🔄 Search Another Item</button>
      </div>`);
  }

  container.innerHTML = groups.map(g => {
    const refs = [...g.refs].sort((a, b) => (a.status === "dead" ? 0 : 1) - (b.status === "dead" ? 0 : 1));
    return `
      <section class="statement" id="sec-${escapeHtml(g.id)}">
        <h2 class="statement__title">
          <span>${escapeHtml(g.label)}</span>
          <a class="statement__pid" href="https://www.wikidata.org/wiki/Property:${encodeURIComponent(g.id)}"
             target="_blank" rel="noopener" title="View property on Wikidata">${escapeHtml(g.id)}</a>
          <span class="statement__count">
            ${refs.length} reference${refs.length === 1 ? "" : "s"}${g.dead ? ` &middot; <span class="text-dead">${g.dead} unreachable</span>` : ""}
          </span>
        </h2>
        <ul class="ref-list">${refs.map(renderReference).join("")}</ul>
      </section>`;
  }).join("");
  observeSections();
}

function setFilter(key, value) {
  state.filters[key] = value;
  els.result.querySelectorAll("[data-status]").forEach(b =>
    b.setAttribute("aria-checked", String(b.dataset.status === state.filters.status)));
  els.result.querySelectorAll("[data-category]").forEach(b =>
    b.setAttribute("aria-checked", String(b.dataset.category === state.filters.category)));
  renderSections();
}

function bindReportEvents() {
  const filterText = document.getElementById("filterText");
  filterText?.addEventListener("input", debounce(() => {
    setFilter("text", filterText.value.trim().toLowerCase());
  }, 150));
}

/** Highlight the table-of-contents entry for the section currently in view. */
let sectionObserver = null;
function observeSections() {
  sectionObserver?.disconnect();
  if (!("IntersectionObserver" in window)) return;
  const links = new Map(
    [...els.result.querySelectorAll(".toc__list a")].map(a => [a.getAttribute("href").slice(1), a])
  );
  sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.remove("is-current"));
      links.get(entry.target.id)?.classList.add("is-current");
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  els.result.querySelectorAll(".statement, #overview, #categories").forEach(el => sectionObserver.observe(el));
}

// "/" focuses the search box (like most search-first sites).
document.addEventListener("keydown", e => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
  e.preventDefault();
  els.input.focus();
  els.input.select();
});

/**************************************
 * DELEGATED ACTIONS (results area)
 **************************************/
els.result.addEventListener("click", e => {
  const target = e.target.closest("button, a");
  if (!target) return;

  if (target.dataset.status) return setFilter("status", target.dataset.status);
  if (target.dataset.category) return setFilter("category", target.dataset.category);

  if (target.dataset.statusLink || target.dataset.categoryLink) {
    if (target.dataset.statusLink) setFilter("status", target.dataset.statusLink);
    if (target.dataset.categoryLink) setFilter("category", target.dataset.categoryLink);
    document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (target.dataset.copy) return copyText(target.dataset.copy, "Copied to clipboard");

  switch (target.dataset.action) {
    case "new-search":
      resetSearch();
      break;
    case "share":
      copyText(window.location.href, "Link copied — share it to show this result");
      break;
    case "clear-filters": {
      const filterText = document.getElementById("filterText");
      if (filterText) filterText.value = "";
      state.filters = { status: "all", category: "all", text: "" };
      setFilter("status", "all");
      break;
    }
  }
});

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast("Couldn't copy — your browser blocked clipboard access");
  }
}

function toast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast-msg";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("is-visible"), 2200);
}

/**************************************
 * RESET, HISTORY & DEEP LINKS
 **************************************/
function resetSearch({ updateHistory = true } = {}) {
  clearInterval(elapsedTimer);
  state.report = null;
  state.selected = null;
  els.result.innerHTML = "";
  els.input.value = "";
  els.clear.hidden = true;
  document.body.classList.remove("has-results");
  document.title = "Wikidata Reference Validator";
  if (updateHistory) history.pushState({}, "", window.location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
  els.input.focus();
}

function itemFromUrl() {
  const item = new URLSearchParams(window.location.search).get("item");
  return item && QID_PATTERN.test(item) ? item.toUpperCase() : null;
}

/**************************************
 * ARCHIVE UTILITIES (COPY & REPLACE)
 **************************************/
window.copyArchiveUrl = function (index, btn) {
  const ref = window.currentResults && window.currentResults[index];
  if (!ref || !ref.suggestedArchive) return;
  const url = ref.suggestedArchive.archiveUrl;

  navigator.clipboard.writeText(url).then(() => {
    const origText = btn.innerHTML;
    btn.innerHTML = "✅ Copié !";
    btn.classList.remove("btn-outline-primary");
    btn.classList.add("btn-success");
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.classList.remove("btn-success");
      btn.classList.add("btn-outline-primary");
    }, 2000);
  }).catch(() => {
    prompt("Copiez l'URL archivée ci-dessous :", url);
  });
};

window.replaceWithArchive = function (index) {
  const ref = window.currentResults && window.currentResults[index];
  if (!ref || !ref.suggestedArchive) return;
  const archiveUrl = ref.suggestedArchive.archiveUrl;

  // Mettre à jour l'objet de données
  ref.originalUrl = ref.originalUrl || ref.url;
  ref.url = archiveUrl;
  ref.status = "alive";
  ref.isReplaced = true;

  // Mettre à jour le lien dans l'affichage
  const linkEl = document.getElementById(`ref-link-${index}`);
  if (linkEl) {
    linkEl.href = archiveUrl;
    linkEl.textContent = archiveUrl;
  }

  // Mettre à jour le badge de statut
  const badgeEl = document.getElementById(`ref-badge-${index}`);
  if (badgeEl) {
    badgeEl.className = "badge bg-success";
    badgeEl.innerHTML = `<i class="bi bi-check-circle me-1"></i> alive (archivé)`;
  }

  // Mettre à jour le pillule d'archive
  const pillEl = document.getElementById(`archive-pill-${index}`);
  if (pillEl) {
    pillEl.className = "badge bg-info text-dark";
    pillEl.innerHTML = `<i class="bi bi-shield-check"></i> Remplacé`;
  }

  // Mettre à jour le bouton de remplacement
  const replaceBtn = document.getElementById(`replace-btn-${index}`);
  if (replaceBtn) {
    replaceBtn.disabled = true;
    replaceBtn.className = "btn btn-sm btn-secondary";
    replaceBtn.innerHTML = "✅ Remplacé";
  }

  // Mettre à jour localStorage pour que la page de rapport / export prenne en compte le lien archivé
  const raw = localStorage.getItem("reportData");
  if (raw) {
    const report = JSON.parse(raw);
    report.references = window.currentResults;
    report.aliveCount = window.currentResults.filter(r => r.status === "alive").length;
    report.deadCount  = window.currentResults.filter(r => r.status === "dead").length;
    localStorage.setItem("reportData", JSON.stringify(report));

    const aliveCountEl = document.getElementById("aliveCountBadge");
    const deadCountEl  = document.getElementById("deadCountBadge");
    if (aliveCountEl) aliveCountEl.innerHTML = `<i class="bi bi-check-circle"></i> Alive: ${report.aliveCount}`;
    if (deadCountEl)  deadCountEl.innerHTML  = `<i class="bi bi-x-octagon"></i> Dead: ${report.deadCount}`;
  }
};
