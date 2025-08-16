// popup.js — robust version (replace your existing popup.js with this)
import { parseTextResume, parsePdfFile } from "./resumeParser.js";

document.addEventListener("DOMContentLoaded", () => {
  // grab elements — be defensive (may be null if HTML differs)
  const resumeTextEl = document.getElementById("resumeText");
  const resumeFileEl = document.getElementById("resumeFile");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const scrapeTabBtn = document.getElementById("scrapeTabBtn");
  const getSummaryBtn = document.getElementById("getSummaryBtn");
  const jobsList = document.getElementById("jobsList");
  const loader = document.getElementById("loader");
  const jobCount = document.getElementById("jobCount");
  const profilePreview = document.getElementById("profilePreview");
  const fileNameEl = document.getElementById("fileName");

  // safe no-op if element missing
  function elDisabled(el, v) { if (el) el.disabled = v; }
  function elHidden(el, v) { if (!el) return; el.hidden = v; }
  function setLoading(on){
    elHidden(loader, !on);
    elDisabled(saveProfileBtn, on);
    elDisabled(scrapeTabBtn, on);
    elDisabled(getSummaryBtn, on);
  }

  function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return s ? String(s).replace(/"/g,'&quot;') : ''; }

  // file chooser display (if present)
  if (resumeFileEl && fileNameEl) {
    resumeFileEl.addEventListener("change", () => {
      const f = resumeFileEl.files && resumeFileEl.files[0];
      fileNameEl.textContent = f ? f.name : "No file selected";
    });
  }

  // SAVE PROFILE
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      const f = resumeFileEl && resumeFileEl.files && resumeFileEl.files[0];
      let profile;
      try {
        if (f) profile = await parsePdfFile(f);
        else profile = parseTextResume((resumeTextEl && resumeTextEl.value) || "");
      } catch (err) {
        console.error("Error parsing resume:", err);
        return alert("Error parsing resume: " + (err && err.message ? err.message : err));
      }

      setLoading(true);
      chrome.runtime.sendMessage({ cmd: "SAVE_PROFILE", profile }, (res) => {
        setLoading(false);
        const skillsMsg = (profile.skills && profile.skills.length) ? profile.skills.join(", ") : "(none detected)";
        const years = profile.yearsExperience || "unknown";
        if (profilePreview) {
          profilePreview.innerHTML = `<strong style="color:#fff">${escapeHtml(profile.probableTitle || '—')}</strong>` +
            `<div style="font-size:11px;color:var(--muted)">${escapeHtml(skillsMsg)} • ${years} yrs</div>`;
        } else {
          // fallback alert if preview not available
          alert("Profile saved. Skills: " + skillsMsg + "\nYears exp: " + years);
        }
        try { navigator.vibrate?.(10); } catch(e){}
      });
    });
  }

  // SCRAPE CURRENT TAB
  if (scrapeTabBtn) {
    scrapeTabBtn.addEventListener("click", async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs && tabs[0];
      if (!tab) return alert("No active tab detected.");

      setLoading(true);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["contentScript.js"]
        });
      } catch (err) {
        console.error("Injection error:", err);
        setLoading(false);
        return alert("Could not inject content script automatically. Try refreshing the page and try again.\nError: " + (err && err.message ? err.message : err));
      }

      chrome.tabs.sendMessage(tab.id, { cmd: "SCRAPE_JOBS_ON_PAGE" }, (resp) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
          console.warn("sendMessage error:", chrome.runtime.lastError);
          return alert("Content script not present on this page. Try refreshing the page or check the page domain (see manifest).");
        }
        alert("Scrape requested. Found " + (resp.count || 0) + " items (sent to storage).");
      });
    });
  }

  // SHOW SUMMARY -> renders interactive cards with animated score bars
  if (getSummaryBtn) {
    getSummaryBtn.addEventListener("click", () => {
      setLoading(true);
      chrome.runtime.sendMessage({ cmd: "GET_JOBS_SUMMARY" }, (res) => {
        setLoading(false);
        const jobs = (res && res.jobs) || [];
        if (jobCount) jobCount.textContent = String(jobs.length || "0");

        if (!jobs.length) {
          if (jobsList) jobsList.innerHTML = `<div class="empty">No jobs found — try scanning a jobs page first.</div>`;
          return;
        }

        if (jobsList) jobsList.innerHTML = "";

        jobs.slice(0, 50).forEach(j => {
          const card = document.createElement("div");
          card.className = "job-card";
          card.innerHTML = `
            <div class="job-top">
              <div>
                <div class="job-title">${escapeHtml(j.title)}</div>
                <div class="job-meta">${escapeHtml(j.company)} • ${escapeHtml(j.location||"")}${j.salary ? " • " + escapeHtml(j.salary) : ""}</div>
              </div>
              <div style="text-align:right">
                <div class="score-pill">${j.score}%</div>
              </div>
            </div>
            <div class="score-row">
              <div class="progress"><div class="progress-fill" data-score="${j.score}"></div></div>
            </div>
            <div class="job-links">
              <a class="open-link" href="${escapeAttr(j.url)}" target="_blank" rel="noopener">Open</a>
              <a class="view-summary" href="#" data-summary>Summary</a>
            </div>
          `;

          const viewSummary = card.querySelector("[data-summary]");
          if (viewSummary) {
            viewSummary.addEventListener("click", (e) => {
              e.preventDefault();
              if (!j.summary) return alert("No summary available for this job.");
              alert(j.summary.length > 1000 ? j.summary.slice(0,1000) + "…" : j.summary);
            });
          }

          card.addEventListener("click", (e) => {
            if (e.target && (e.target.matches("a") || e.target.closest("a"))) return;
            if (j.url) {
              try { window.open(j.url, "_blank"); } catch(e){ chrome.tabs.create({ url: j.url }); }
            }
          });

          jobsList.appendChild(card);
        });

        // animate bars after insertion
        requestAnimationFrame(() => {
          document.querySelectorAll(".progress-fill").forEach(el => {
            const sc = Math.max(0, Math.min(100, parseInt(el.dataset.score || "0", 10)));
            const target = (sc * 0.9) + Math.round(Math.random()*6);
            setTimeout(()=> el.style.width = `${target}%`, 60 + Math.random()*220);
          });
        });
      });
    });
  }
});
