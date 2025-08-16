import { scoreJobAgainstProfile } from "./jobMatcher.js";
const JOB_STORE_KEY = "jf_jobs_store";
const PROFILE_KEY = "jf_profile";
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg) return;
  if(msg.cmd === "JOBS_FROM_PAGE"){
    chrome.storage.local.get([JOB_STORE_KEY], (res) => {
      const existing = res[JOB_STORE_KEY] || [];
      const merged = existing.concat(msg.jobs.map(j=>({...j, scrapedAt:new Date().toISOString()})));
      chrome.storage.local.set({ [JOB_STORE_KEY]: merged });
    });
  } else if(msg.cmd === "GET_JOBS_SUMMARY"){
    chrome.storage.local.get([JOB_STORE_KEY, PROFILE_KEY], (res) => {
      const jobs = res[JOB_STORE_KEY] || [];
      const profile = res[PROFILE_KEY] || { skills: [], yearsExperience:null, probableTitle:null };
      const scored = jobs.map(j => ({ ...j, score: scoreJobAgainstProfile(j, profile) })).sort((a,b)=>b.score-a.score);
      sendResponse({ jobs: scored });
    });
    return true;
  } else if(msg.cmd === "SAVE_PROFILE"){
    chrome.storage.local.set({ [PROFILE_KEY]: msg.profile });
    sendResponse({ ok: true });
  }
});
