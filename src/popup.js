import { parseTextResume, parsePdfFile } from "./resumeParser.js";

const resumeTextEl = document.getElementById("resumeText");
const resumeFileEl = document.getElementById("resumeFile");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const scrapeTabBtn = document.getElementById("scrapeTabBtn");
const getSummaryBtn = document.getElementById("getSummaryBtn");
const jobsList = document.getElementById("jobsList");

saveProfileBtn.addEventListener("click", async () => {
  const f = resumeFileEl.files && resumeFileEl.files[0];
  let profile;
  try {
    if (f) profile = await parsePdfFile(f);
    else profile = parseTextResume(resumeTextEl.value || "");
  } catch (err) {
    console.error("Error parsing resume:", err);
    alert("Error parsing resume: " + err.message);
    return;
  }
  chrome.runtime.sendMessage({ cmd: "SAVE_PROFILE", profile }, (res) => {
    // show friendly feedback
    const skillsMsg = (profile.skills && profile.skills.length) ? profile.skills.join(", ") : "(none detected)";
    alert("Profile saved. Skills: " + skillsMsg + "\nYears exp: " + (profile.yearsExperience || "unknown"));
  });
});

scrapeTabBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return alert("No active tab detected.");

  // Inject content script into the active tab first (handles pages loaded before extension)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"]
    });
  } catch (err) {
    console.error("Injection error:", err);
    // fallback: advise user to refresh the page
    return alert("Could not inject content script automatically. Try refreshing the page and try again.\nError: " + (err.message || err));
  }

  // After injection, send message to content script to scrape
  chrome.tabs.sendMessage(tab.id, { cmd: "SCRAPE_JOBS_ON_PAGE" }, (resp) => {
    if (chrome.runtime.lastError) {
      console.warn("sendMessage error:", chrome.runtime.lastError);
      return alert("Content script not present on this page. Try refreshing the page or check the page domain (see manifest).");
    }
    alert("Scrape requested. Found " + (resp.count || 0) + " items (sent to storage).");
  });
});

getSummaryBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ cmd: "GET_JOBS_SUMMARY" }, (res) => {
    const jobs = (res && res.jobs) || [];
    jobsList.innerHTML = jobs.length ? jobs.slice(0,50).map(j => `<div class="job"><strong>${escapeHtml(j.title)}</strong> [${j.score}%]<br/>${escapeHtml(j.company)} • ${escapeHtml(j.location||"")} ${j.salary? "• "+escapeHtml(j.salary): ""}<br/><a href="${escapeAttr(j.url)}" target="_blank">Open</a></div>`).join("") : "<i>No jobs</i>";
  });
});

function escapeHtml(s){ if(!s) return ""; return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return s ? s.replace(/"/g,'&quot;') : ''; }
