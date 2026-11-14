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
 * AUTOCOMPLETE SEARCH
 **************************************/
document.getElementById("search").addEventListener("input", async function () {
  const query = this.value;
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (query.length < 3) return;

  // Show skeleton suggestions immediately while fetching
  showSuggestionSkeletons(3);

  const response = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
      query
    )}&language=en&format=json&origin=*`
  );
  const data = await response.json();

  // Clear skeletons and populate with real data
  suggestions.innerHTML = "";
  data.search.forEach(item => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action fade-in-content";

    li.innerHTML = `
      <div>
        <strong>${item.label}</strong>
        <div class="small text-muted">${item.description || ""}</div>
      </div>
    `;

    li.onclick = () => {
      const input = document.getElementById("search");
      input.value = item.label;
      input.setAttribute("data-qid", item.id);
      input.setAttribute("data-label", item.label);
      suggestions.innerHTML = "";
    };

    suggestions.appendChild(li);
  });
});

/**************************************
 * PROPERTY LABEL CACHE (UNCHANGED)
 **************************************/
const propertyLabelCache = {};

async function getPropertyLabel(pid) {
  if (!pid) return "";
  if (propertyLabelCache[pid]) return propertyLabelCache[pid];

  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${pid}&format=json&languages=en&origin=*`
    );
    const data = await response.json();
    const label = data.entities[pid]?.labels?.en?.value || "";
    propertyLabelCache[pid] = label;
    return label;
  } catch {
    return "";
  }
}

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

  const start = Date.now();

  try {
    const response = await fetch("/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid })
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

    localStorage.setItem("reportData", JSON.stringify({
      qid: qid || label,
      label,
      aliveCount,
      deadCount,
      references: data,
      duration
    }));

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

        <ul class="list-group mt-3">
    `;

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
                          <span class="text-dark fw-bold"><i class="bi bi-archive-fill text-warning me-1"></i>URL Archivée suggérée :</span><br>
                          <a href="${ref.suggestedArchive.archiveUrl}" target="_blank" class="fw-semibold link-primary" id="archive-link-${i}">
                            ${ref.suggestedArchive.archiveUrl}
                          </a>
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
        </li>
      `;
    });

    html += `
        </ul>
        <p class="small text-muted mt-2">Completed in ${duration}s</p>
        <div class="text-center mt-3">
          <button class="btn btn-lg btn-glass-action"
                  onclick="resetSearch()">🔄 Search Another Item</button>
        </div>
      </div>
    `;

    // ── Fade in real content (replaces skeleton) ──
    fadeIn(resultDiv, html);

    document.getElementById("viewReportBtn").onclick = () => {
      window.open("/report", "_blank");
    };

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
}

/**************************************
 * GLOBAL COLLAPSE BUTTON TOGGLE (FIX)
 **************************************/
document.addEventListener("shown.bs.collapse", e => {
  const btn = document.querySelector(
    `[data-bs-target="#${e.target.id}"]`
  );
  if (btn) btn.textContent = "Hide";
});

document.addEventListener("hidden.bs.collapse", e => {
  const btn = document.querySelector(
    `[data-bs-target="#${e.target.id}"]`
  );
  if (btn) btn.textContent = "Details";
});

/**************************************
 * RESET SEARCH (UNCHANGED)
 **************************************/
function resetSearch() {
  const searchSection = document.getElementById("searchSection");
  document.getElementById("search").value = "";
  document.getElementById("search").removeAttribute("data-qid");
  document.getElementById("search").removeAttribute("data-label");
  document.getElementById("result").innerHTML = "";
  searchSection.style.display = "block";
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
