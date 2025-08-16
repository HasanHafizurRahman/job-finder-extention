export function parseTextResume(text){
  const skills = [];
  const SKILLS = ["javascript","react","node","css","html","typescript"];
  const lower = (text||"").toLowerCase();
  SKILLS.forEach(s => { if(lower.includes(s)) skills.push(s); });
  const yearsMatch = lower.match(/(\d+)\s+years?/);
  return { rawText: text, skills, yearsExperience: yearsMatch ? parseInt(yearsMatch[1],10) : null, probableTitle: (lower.match(/frontend|developer|engineer/)||[""])[0] };
}
export async function parsePdfFile(file){ // very simple: return empty text if user doesn't want pdfjs yet
  // if you later want PDF parsing, we can add pdfjs-dist and full parser
  const text = "PDF upload: filename "+file.name;
  return parseTextResume(text);
}
