const SKILLS_DB = [
  "javascript","typescript","react","next.js","redux","tailwind","html","css",
  "node.js","express","graphql","git","jest","webpack","vite","sass","mongodb","postgresql"
];

export function parsePdfFile(file){
  // fallback: return a simple profile so uploads don't break the flow
  return Promise.resolve(parseTextResume("Uploaded file: " + (file.name || "file")));
}

export function parseTextResume(text){
  const lower = (text||"").toLowerCase();
  const skills = SKILLS_DB.filter(s => lower.includes(s.toLowerCase()));
  const yearsMatch = lower.match(/(\d+)\s+years?/);
  return {
    rawText: text,
    skills,
    yearsExperience: yearsMatch ? parseInt(yearsMatch[1],10) : null,
    probableTitle: (lower.match(/frontend|developer|engineer|full[-\s]*stack/)||[""])[0]
  };
}
