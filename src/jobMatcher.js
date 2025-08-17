export function scoreJobAgainstProfile(job, profile){
  const textFields = [
    job.summary || "",
    job.requirements || "",
    job.description || "",
    job.title || "",
    job.company || "",
    job.location || ""
  ].join(" ").toLowerCase();

  const pskills = new Set((profile.skills||[]).map(s=>s.toLowerCase()).filter(Boolean));
  // skill matching: count occurrences (frequency gives higher score)
  let matchedCount = 0;
  let freqSum = 0;
  pskills.forEach(s => {
    const regex = new RegExp(`\\b${escapeReg(s)}\\b`, "g");
    const matches = textFields.match(regex);
    if(matches && matches.length){
      matchedCount++;
      freqSum += Math.min(matches.length, 5); // cap frequency to avoid runaway
    }
  });
  const skillScore = pskills.size ? Math.min(1, (matchedCount + freqSum*0.25) / Math.max(1, pskills.size)) : 0;

  // seniority/title match
  const title = (job.title || "").toLowerCase();
  let titleScore = 0;
  if(profile.probableTitle){
    const pt = (profile.probableTitle || "").toLowerCase();
    if(pt && title.includes(pt)) titleScore = 1;
    else if(title.includes(pt.split(" ")[0])) titleScore = 0.6;
  }

  // experience match: if job asks for X years, compare to profile.yearsExperience
  let expScore = 0.5;
  if(profile.yearsExperience && textFields){
    const m = textFields.match(/(\d+)\+?\s*years?/i);
    if(m){
      const req = parseInt(m[1],10);
      expScore = profile.yearsExperience >= req ? 1 : Math.max(0.2, 1 - ((req - profile.yearsExperience) * 0.15));
    } else {
      expScore = 0.6;
    }
  }

  // salary hint (bump score if salary visible and seems competitive)
  let salaryBoost = 0;
  const salaryMatch = textFields.match(/(\$|usd)?\s?\d{2,3}(?:[0-9,]*)(k)?/i);
  if(salaryMatch) salaryBoost = 0.06;

  // location / remote match: boost if profile doesn't specify but remote present
  let locationBoost = 0;
  if(/remote|work from home|wfh/i.test(textFields)) locationBoost = 0.05;

  // aggregate
  const raw = ((skillScore * 0.62) + (expScore * 0.22) + (titleScore * 0.12)) + salaryBoost + locationBoost;
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  return score;
}

function escapeReg(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
