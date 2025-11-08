import { readFileSync, readdirSync } from "fs";
import path from "path";

const env=readFileSync('.env','utf8');
const fileKey=(env.match(/FILE_KEY=\"?([^\r\n\"]+)/)||[])[1];
const token=(env.match(/PERSONAL_ACCESS_TOKEN=\"?([^\r\n\"]+)/)||[])[1];

function flattenTokens(obj, prefix="", out=new Set()){
  if (!obj || typeof obj !== 'object') return out;
  if (obj.$value !== undefined) { out.add(prefix); return out; }
  for (const [k,v] of Object.entries(obj)){
    if (k.startsWith('$')) continue;
    if (typeof v === 'object') flattenTokens(v, prefix ? `${prefix}/${k}` : k, out);
  }
  return out;
}

function readTokens(dir){
  const files = readdirSync(dir).filter(f=>f.endsWith('.json'));
  const byCollection = new Map(); // name -> Set(tokenNames)
  for (const f of files){
    const base = path.basename(f);
    const [collectionName] = base.split('.');
    const json = JSON.parse(readFileSync(path.join(dir,f),'utf8'));
    const names = flattenTokens(json);
    const s = byCollection.get(collectionName) || new Set();
    names.forEach(n=>s.add(n));
    byCollection.set(collectionName, s);
  }
  return byCollection;
}

const tokensByCollection = readTokens(path.join(process.cwd(),'tokens'));

const r = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`,{headers:{'X-Figma-Token':token}});
const j = await r.json();
const collections = Object.values(j.meta?.variableCollections||{});
const variables = Object.values(j.meta?.variables||{});

const idToCollectionName = Object.fromEntries(collections.map(c=>[c.id,c.name]));

const remoteConflicts = [];
for (const v of variables){
  if (!v.remote) continue; // only remote blockers
  const collName = idToCollectionName[v.variableCollectionId];
  const tokenNames = tokensByCollection.get(collName);
  if (tokenNames && tokenNames.has(v.name)){
    remoteConflicts.push({collection: collName, name: v.name});
  }
}

console.log(JSON.stringify({remoteConflicts}, null, 2));
