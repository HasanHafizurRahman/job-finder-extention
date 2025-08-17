const SENTENCE_SPLIT = /(?<=\b[.?!])\s+/;

function normalizeText(t){
  return (t || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text){
  if(!text) return [];
  return normalizeText(text).split(SENTENCE_SPLIT).map(s => s.trim()).filter(Boolean);
}

function findLinesByHeader(text, headers = ["responsib", "require", "qualif", "skill", "what you'll", "you will"]){
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  for(const l of lines){
    const low = l.toLowerCase();
    for(const h of headers){
      if(low.includes(h)){
        out.push(l);
        break;
      }
    }
  }
  return out;
}

function extractBulletLists(text){
  const bullets = [];
  (text.split(/\r?\n/)).forEach(l => {
    const trimmed = l.trim();
    if(/^[-•*]\s+/.test(trimmed) || /^[0-9]+\.\s+/.test(trimmed)){
      bullets.push(trimmed.replace(/^[-•*0-9.\s]+/, '').trim());
    }
  });
  return bullets;
}

function detectSalary(text){
  if(!text) return "";
  const m = text.match(/(\$|usd)?\s?(\d{1,3}(?:[0-9,]*)(k)?)(\s?-\s?\$?\d{1,3}(?:[0-9,]*)(k)?)?/i);
  if(m) return m[0].trim();
  const perYr = text.match(/per\s+year|\/yr|annually/i);
  return perYr ? (m ? m[0].trim() : "salary mentioned") : "";
}

function scoreSentence(sentence, profile){
  const s = sentence.toLowerCase();
  let score = 0;
  if(profile && profile.skills && profile.skills.length){
    for(const sk of profile.skills){
      if(!sk) continue;
      const low = sk.toLowerCase();
      if(low.length < 2) continue;
      if(s.includes(low)) score += 3;
    }
  }
  // title match
  if(profile && profile.probableTitle){
    const title = profile.probableTitle.toLowerCase();
    if(title && s.includes(title)) score += 4;
  }
  // length preference (avoid very short/test noise)
  if(sentence.length > 40 && sentence.length < 320) score += 1;
  return score;
}

export function generateJobSummary(job = {}, profile = {}){
  const text = (job.summary || job.description || (job.title||"") + " " + (job.company||""));
  const plain = typeof text === "string" ? text : JSON.stringify(text);
  const sentences = splitSentences(plain);
  const scored = sentences.map(s => ({ s, sc: scoreSentence(s, profile) }));
  scored.sort((a,b) => b.sc - a.sc);

  // pick up to 3 highest scoring sentences (dedupe)
  const chosen = [];
  const used = new Set();
  for(const it of scored){
    const t = it.s;
    const token = t.slice(0, 60);
    if(!used.has(token)){
      chosen.push(t);
      used.add(token);
    }
    if(chosen.length >= 3) break;
  }

  // fallback: if no sentences, use short snippet
  let short = "";
  if(chosen.length) short = chosen.join(" ");
  else short = plain.slice(0, 400) + (plain.length > 400 ? "…" : "");

  // extract bullets and named sections
  const bullets = extractBulletLists(plain);
  const importantLines = findLinesByHeader(plain);
  const salary = detectSalary(plain);

  // matched skills list
  const lower = (plain || "").toLowerCase();
  const matchedSkills = (profile && profile.skills || []).filter(s => s && lower.includes(s.toLowerCase()));

  // seniority detection
  const seniority = (function detectSen(){
    const low = (job.title || "" + " " + plain).toLowerCase();
    if(/\bsenior\b|\bsr\b|\blead\b|\bprincipal\b/.test(low)) return "senior";
    if(/\bjunior\b|\bjr\b|\bentry\b|\bgraduate\b/.test(low)) return "junior";
    if(/\bmid[-\s]*level\b|\bmid\b/.test(low)) return "mid";
    return "unspecified";
  })();

  // compose a concise plain-text summary
  const reasons = [];
  if(matchedSkills.length) reasons.push(`Matches skills: ${matchedSkills.join(", ")}`);
  if(job.location) reasons.push(`Location: ${job.location}`);
  if(salary) reasons.push(`Salary: ${salary}`);
  if(seniority && seniority !== "unspecified") reasons.push(`Seniority: ${seniority}`);
  if(job.company) reasons.push(`Company: ${job.company}`);

  return {
    shortSummary: short,
    bullets,
    importantLines,
    matchedSkills,
    salary,
    seniority,
    reasons,
    raw: plain
  };
}
