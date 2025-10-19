import type { Chunk } from "./indexer";
let INDEX: Chunk[] = [];
export function loadIndex(chunks: Chunk[]) { INDEX = chunks; }
export function retrieve(query: string, k = 8): Chunk[] {
  const q = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  return [...INDEX].map(ch => {
    const score = ch.text.toLowerCase().split(/\W+/).reduce((a,w)=>a+(q.has(w)?1:0),0);
    return { ch, score };
  }).sort((a,b)=>b.score-a.score).slice(0,k).map(x=>x.ch);
}