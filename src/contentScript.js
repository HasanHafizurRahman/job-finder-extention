import { safeText } from "./utils.js";

function extractFromLinkedInJobs() {
  const jobs = [];
  // list-view cards
  const cards = document.querySelectorAll(
    ".jobs-search-results__list-item, .job-card-container--clickable, .jobs-search-results__result-item"
  );

  cards.forEach(card => {
    try {
      // LinkedIn job card title selectors (varies by layout)
      const titleEl =
        card.querySelector(".job-card-list__title") ||
        card.querySelector(".job-card-container__link .job-card-list__title") ||
        card.querySelector("a.job-card-list__title") ||
        card.querySelector(".jobs-search-results__result-item__title");

      const companyEl =
        card.querySelector(".job-card-container__company-name") ||
        card.querySelector(".job-card__company-name") ||
        card.querySelector(".job-card-list__company-name");

      const locationEl =
        card.querySelector(".job-card-container__metadata-item") ||
        card.querySelector(".job-card__location") ||
        card.querySelector(".job-card-list__meta");

      // link
      const linkEl = card.querySelector("a.job-card-list__title, a.job-card-container__link, a[href*='/jobs/view/']");
      let url = "";
      if (linkEl) url = linkEl.href;
      else {
        // try data-job-id attribute fallback
        const jobId = card.getAttribute("data-job-id") || card.dataset.jobId;
        if (jobId) url = `https://www.linkedin.com/jobs/view/${jobId}`;
      }

      // snippet/summary if present
      const summaryEl =
        card.querySelector(".job-card-list__snippet") ||
        card.querySelector(".job-card-list__insight") ||
        card.querySelector(".job-result-card__snippet");

      const title = safeText(titleEl) || safeText(card.querySelector("a"));
      const company = safeText(companyEl);
      const location = safeText(locationEl);
      const summary = safeText(summaryEl);

      if (title) {
        jobs.push({
          title,
          company,
          location,
          summary,
          salary: "", // LinkedIn rarely exposes salary in list view
          url: url || location.href
        });
      }
    } catch (e) {
      // ignore card parse errors
    }
  });

  // If no cards found, try single job detail page extractor (when user opens a job)
  if (jobs.length === 0) {
    const detailTitle = document.querySelector(".jobs-unified-top-card__job-title, .topcard__title, h1.jobs-unified-top-card__job-title");
    if (detailTitle) {
      const title = safeText(detailTitle);
      const company = safeText(document.querySelector(".jobs-unified-top-card__company-name, .topcard__org-name-link"));
      const loc = safeText(document.querySelector(".jobs-unified-top-card__bullet, .topcard__flavor--bullet"));
      // job description
      const desc = safeText(document.querySelector(".jobs-description__container, .description__text"));
      const url = location.href;
      jobs.push({ title, company, location: loc, summary: desc, salary: "", url });
    }
  }

  return jobs;
}

function extractGeneric() {
  const out = [];
  document.querySelectorAll("a").forEach(a => {
    const t = safeText(a);
    if (t && /engineer|developer|frontend|react|node|software/i.test(t)) {
      out.push({ title: t.split("\n")[0], company: "", location: "", summary: t, url: a.href });
    }
  });
  return out;
}

function collectJobs() {
  const host = location.hostname;
  // Use LinkedIn job scrapers only on linkedin jobs/search or /jobs/
  if (host.includes("linkedin.com") && (location.pathname.includes("/jobs") || location.pathname.includes("/jobs/search") || location.pathname.includes("/jobs/view"))) {
    return extractFromLinkedInJobs();
  }
  // other known host-specific scrapers (indeed/glassdoor) can be added here...
  return extractGeneric();
}

// Listen to popup/background request to scrape on demand
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.cmd === "SCRAPE_JOBS_ON_PAGE") {
    const jobs = collectJobs();
    // send to background for storage & scoring
    chrome.runtime.sendMessage({ cmd: "JOBS_FROM_PAGE", jobs, url: location.href, title: document.title });
    sendResponse({ status: "ok", count: jobs.length });
  }
});
