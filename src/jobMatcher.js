export function scoreJobAgainstProfile(job, profile){
  const pskills = new Set((profile.skills||[]).map(s=>s.toLowerCase()));
  const req = (job.summary || job.requirements || "").toLowerCase();
  const matched = Array.from(pskills).filter(s => req.includes(s)).length;
  const skillScore = pskills.size ? matched/pskills.size : 0;
  let expScore = 0.5;
  if(profile.yearsExperience && req){
    const m = req.match(/(\d+)\+?\s*years?/i);
    if(m) expScore = profile.yearsExperience >= parseInt(m[1],10) ? 1 : 0.3;
  }
  const titleScore = profile.probableTitle && job.title && job.title.toLowerCase().includes(profile.probableTitle) ? 1 : 0;
  const score = Math.round(((skillScore*0.6)+(expScore*0.3)+(titleScore*0.1))*100);
  return score;
}
