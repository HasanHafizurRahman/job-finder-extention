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
  if(f) profile = await parsePdfFile(f);
  else profile = parseTextResume(resumeTextEl.value || "");
  chrome.runtime.sendMessage({ cmd: "SAVE_PROFILE", profile }, (res) => {
    alert("Profile saved. Skills: "+(profile.skills||[]).join(", "));
  });
});

scrapeTabBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  if(!tab) return alert("No active tab");
  chrome.tabs.sendMessage(tab.id, { cmd: "SCRAPE_JOBS_ON_PAGE" }, (resp) => {
    if(chrome.runtime.lastError) return alert("Content script not present on this page.");
    alert("Scrape requested: "+(resp.count||0)+" found.");
  });
});

getSummaryBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ cmd: "GET_JOBS_SUMMARY" }, (res) => {
    const jobs = (res && res.jobs) || [];
    jobsList.innerHTML = jobs.length ? jobs.slice(0,50).map(j => `<div class="job"><strong>${j.title}</strong> [${j.score}%]<br/>${j.summary||""}<br/><a href="${j.url}" target="_blank">Open</a></div>`).join("") : "<i>No jobs</i>";
  });
});
