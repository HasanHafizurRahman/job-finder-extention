import { safeText } from "./utils.js";
function collectJobsGeneric(){
  const out = [];
  document.querySelectorAll("a").forEach(a=>{
    const t = safeText(a);
    if(t && /engineer|developer|frontend|react|node/i.test(t)){
      out.push({ title: t.split("\n")[0], company: "", location: "", summary: t, url: a.href });
    }
  });
  return out;
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(msg && msg.cmd === "SCRAPE_JOBS_ON_PAGE"){
    const jobs = collectJobsGeneric();
    chrome.runtime.sendMessage({ cmd: "JOBS_FROM_PAGE", jobs, url: location.href });
    sendResponse({ status: "ok", count: jobs.length });
  }
});
