import { readFileSync } from "fs";
const env=readFileSync('.env','utf8');
const key=(env.match(/FILE_KEY=\"?([^\r\n\"]+)/)||[])[1];
const token=(env.match(/PERSONAL_ACCESS_TOKEN=\"?([^\r\n\"]+)/)||[])[1];
const r= await fetch(`https://api.figma.com/v1/files/${key}/variables/local`,{headers:{'X-Figma-Token':token}});
const j= await r.json();
const cols=Object.values(j.meta?.variableCollections||{}).map(c=>({name:c.name,id:c.id}));
console.log(JSON.stringify({collections:cols},null,2));
