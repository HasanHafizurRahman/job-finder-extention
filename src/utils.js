export function safeText(node){ if(!node) return ""; return node.innerText ? node.innerText.trim() : (node.textContent||"").trim(); }
