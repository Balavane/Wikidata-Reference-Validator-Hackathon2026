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
  const qid = input.getAttribute("data-qid");
  const label = input.getAttribute("data-label") || input.value;
  const resultDiv = document.getElementById("result");
  const searchSection = document.getElementById("searchSection");

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
          <span class="badge bg-success">
            <i class="bi bi-check-circle"></i> Alive: ${aliveCount}
          </span>
          <span class="badge bg-danger ms-2">
            <i class="bi bi-x-octagon"></i> Dead: ${deadCount}
          </span>
        </p>

        <ul class="list-group mt-3">
    `;

    data.forEach((ref, i) => {
      const badge      = ref.status === "alive" ? "success" : "danger";
      const icon       = ref.status === "alive" ? "check-circle" : "x-octagon";
      const collapseId = `collapseRef${i}`;

      html += `
        <li class="list-group-item p-3 rounded shadow-sm mb-2">
          <div class="d-flex justify-content-between align-items-center gap-2">
            <a href="${ref.url}" target="_blank" class="ref-link text-break">
              ${ref.url}
            </a>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-${badge}">
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
                ref.status === "dead"
                  ? `<div class="mt-2 alert alert-warning p-2 mb-1">
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      <strong>Reference unavailable.</strong>
                      Please review or update this reference.
                    </div>`
                  : ""
              }

              ${
                ref.status === "dead" && ref.suggestedArchive
                  ? `<div class="mt-2 small">
                      🔁 <strong>Suggested archived version:</strong>
                      <a href="${ref.suggestedArchive.archiveUrl}"
                         target="_blank"
                         class="fw-semibold link-primary">
                        View on Wayback Machine
                      </a>
                    </div>`
                  : ""
              }

              ${
                ref.status === "dead" && !ref.suggestedArchive
                  ? `<div class="mt-2 small text-muted">
                      📭 No archived snapshot found on Wayback Machine.
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
