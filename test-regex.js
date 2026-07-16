const str = "581P15ALEDG00-PCBA-RN 15C (4G)";
const matches = Array.from(str.matchAll(/\b([A-Z0-9]{8,15})\b/gi));
console.log(matches.map(m => m[1]));
