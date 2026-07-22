#!/usr/bin/env node
/* Render-Smoke-Test — bündelt jede Default-Export-Komponente unter src/ und rendert sie
   einmal mit einem Mini-React (echte Funktionsaufrufe). Fängt die Fehlerklasse, die esbuild
   NICHT sieht: use-before-define / ReferenceError im Render (schwarzer Bildschirm), kaputte
   Cross-File-Importe und Abstürze auf Modul-Ebene.
   Nutzung:  node scripts/smoke.mjs           (alle Komponenten)
             node scripts/smoke.mjs Rundwege  (nur passende Dateinamen)
   Exit 1 bei ReferenceError/TDZ oder Bundle-/Export-Fehler → als CI-Gate gedacht.
   Grenze: rendert mit synthetischen Props, prüft die Initialansicht. TypeError o. Ä. werden
   als WARN gemeldet (können Prop-bedingt sein), nur harte Fehler brechen den Build ab. */
import { build } from "esbuild";
import { readdirSync, statSync, readFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");
const TMP = mkdtempSync(join(tmpdir(), "smoke-"));
const only = process.argv.slice(2);

const REACT_SHIM = `
function useState(i){return[(typeof i==='function'?i():i),function(){}];}
function useRef(i){return{current:i===undefined?null:i};}
function useMemo(f){return f();} function useCallback(f){return f;}
function useEffect(){} function useLayoutEffect(){} function useContext(){return{};}
function useReducer(r,i){return[(typeof i==='function'?i():i),function(){}];} function useId(){return'id';}
const Fragment={__frag:true};
function createElement(type,props){var c=Array.prototype.slice.call(arguments,2);var p=Object.assign({},props);if(c.length)p.children=c.length===1?c[0]:c;return{__el:true,type:type,props:p};}
function render(node){
  if(node==null||typeof node!=='object')return;
  if(Array.isArray(node)){for(var i=0;i<node.length;i++)render(node[i]);return;}
  if(!node.__el)return;
  var t=node.type,p=node.props||{};
  if(typeof t==='function'){var o;try{o=t(p);}catch(e){if(!e.__comp)e.__comp=(t.name||'Anonymous');throw e;}render(o);return;}
  if(p.children!==undefined)render(p.children);
}
var R={createElement:createElement,Fragment:Fragment,useState:useState,useEffect:useEffect,useLayoutEffect:useLayoutEffect,useRef:useRef,useMemo:useMemo,useCallback:useCallback,useContext:useContext,useReducer:useReducer,useId:useId,
Suspense:function Suspense(p){return(p&&p.children)||null;},lazy:function(){return function Lazy(){return null;};},memo:function(c){return c;},forwardRef:function(c){return function Fwd(p){return c(p,{current:null});};},StrictMode:function StrictMode(p){return(p&&p.children)||null;},
Children:{map:function(c,f){return Array.isArray(c)?c.map(f):(c==null?c:[f(c,0)]);},toArray:function(c){return Array.isArray(c)?c:(c==null?[]:[c]);},count:function(c){return Array.isArray(c)?c.length:(c==null?0:1);},only:function(c){return c;}}};
R.__render=render; globalThis.__SMOKE_REACT=R; module.exports=R; module.exports.default=R;
`;
const PROXY = `var p=new Proxy(function(){},{get:function(t,k){if(k==='__esModule')return true;if(k==='default')return p;return p;},apply:function(){return null;},construct:function(){return{};}});module.exports=p;`;
const EMPTY = `module.exports={};`;
const PWA = `exports.useRegisterSW=function(){return{offlineReady:[false,function(){}],needRefresh:[false,function(){}],updateServiceWorker:function(){}};};exports.registerSW=function(){return function(){};};`;

const stubs = {
  name: "smoke-stubs",
  setup(b) {
    const to = (ns) => (a) => ({ path: a.path, namespace: ns });
    b.onResolve({ filter: /^react$/ }, to("shim"));
    b.onResolve({ filter: /^react-dom(\/.*)?$/ }, to("proxy"));
    b.onResolve({ filter: /^(lucide-react|maplibre-gl|dexie|recharts|three|d3|chart\.js|papaparse)$/ }, to("proxy"));
    b.onResolve({ filter: /^virtual:pwa-register\/react$/ }, to("pwa"));
    b.onResolve({ filter: /^virtual:/ }, to("proxy"));
    b.onResolve({ filter: /\.(css|scss|sass|less)$/ }, to("empty"));
    b.onLoad({ filter: /.*/, namespace: "shim" }, () => ({ contents: REACT_SHIM, loader: "js" }));
    b.onLoad({ filter: /.*/, namespace: "proxy" }, () => ({ contents: PROXY, loader: "js" }));
    b.onLoad({ filter: /.*/, namespace: "pwa" }, () => ({ contents: PWA, loader: "js" }));
    b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: EMPTY, loader: "js" }));
  },
};

function setupEnv() {
  const noop = () => {};
  const el = () => ({ style:{}, setAttribute:noop, appendChild:noop, removeChild:noop, remove:noop, addEventListener:noop, removeEventListener:noop, classList:{ add:noop, remove:noop, toggle:noop, contains:()=>false }, querySelector:()=>null, querySelectorAll:()=>[], getContext:()=>null, innerHTML:"" });
  const def = (name, value) => { try { Object.defineProperty(globalThis, name, { value, configurable:true, writable:true }); } catch { globalThis[name] = value; } };
  def("window", globalThis);
  def("document", { createElement: el, createElementNS: el, querySelector:()=>null, querySelectorAll:()=>[], getElementById:()=>null, head: el(), body: el(), documentElement: el(), addEventListener:noop, removeEventListener:noop });
  def("navigator", { geolocation:{ watchPosition:noop, clearWatch:noop, getCurrentPosition:noop }, clipboard:{ writeText: async()=>{} }, userAgent:"node", language:"de" });
  def("localStorage", { getItem:()=>null, setItem:noop, removeItem:noop, clear:noop });
  def("matchMedia", () => ({ matches:false, addEventListener:noop, removeEventListener:noop, addListener:noop, removeListener:noop }));
  def("IntersectionObserver", class { observe(){} unobserve(){} disconnect(){} });
  def("ResizeObserver", class { observe(){} unobserve(){} disconnect(){} });
  if (!globalThis.fetch) def("fetch", async () => ({ ok:false, status:0, json: async()=>({}), text: async()=>"" }));
}

const universal = new Proxy(function(){}, {
  get(t,k){
    if (k==="length") return 0;
    if (k===Symbol.iterator) return function*(){};
    if (["map","filter","forEach","find","findIndex","slice","sort","some","every","join","reduce","concat","flat","flatMap","includes","indexOf","keys","values","entries"].includes(k)) return () => [];
    if (k==="current") return null;
    if (k==="then") return undefined;
    return universal;
  },
  apply(){ return universal; },
  construct(){ return {}; },
});

function discover() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.jsx$/.test(name) && /export\s+default\s+function\s+[A-Z]/.test(readFileSync(full,"utf8"))) out.push(full);
    }
  };
  walk(SRC);
  return out;
}

let entries = discover();
if (only.length) entries = entries.filter((e) => only.some((a) => e.toLowerCase().includes(a.toLowerCase())));
setupEnv();

const results = [];
for (const full of entries) {
  const rel = full.slice(SRC.length + 1);
  const outfile = join(TMP, rel.replace(/[^\w]/g, "_") + ".cjs");
  let phase = "bundle";
  try {
    await build({ entryPoints:[full], bundle:true, format:"cjs", platform:"node", target:"node18",
      outfile, sourcemap:"inline", logLevel:"silent",
      loader:{ ".jsx":"jsx", ".js":"jsx", ".png":"empty", ".jpg":"empty", ".jpeg":"empty", ".gif":"empty", ".woff2":"empty", ".svg":"empty" },
      plugins:[stubs] });
    phase = "render";
    delete require.cache[outfile];
    const mod = require(outfile);
    const R = globalThis.__SMOKE_REACT;
    if (typeof mod.default !== "function") { results.push({ rel, ok:false, phase:"export", name:"", msg:"default export ist keine Komponente" }); continue; }
    R.__render(R.createElement(mod.default, universal));
    results.push({ rel, ok:true });
  } catch (e) {
    results.push({ rel, ok:false, phase, comp:e.__comp, name:e.name, msg:e.message });
  }
}

const pad = (s,n)=>(s+" ".repeat(n)).slice(0,n);
console.log("\nSmoke-Test — " + results.length + " Komponente(n)\n");
let fail = 0, hard = 0;
for (const r of results.sort((a,b)=>a.rel.localeCompare(b.rel))) {
  if (r.ok) { console.log("  OK    " + r.rel); continue; }
  fail++;
  const breaking = r.name === "ReferenceError" || r.phase === "bundle" || r.phase === "export";
  if (breaking) hard++;
  console.log("  " + (breaking ? "CRASH" : "WARN ") + " " + pad(r.rel,20) + " [" + (r.phase||"") + "] " + (r.comp?("<"+r.comp+"> "):"") + (r.name?r.name+": ":"") + (r.msg||""));
}
console.log("\n" + (fail ? (hard + " harte Fehler, " + (fail-hard) + " Warnung(en) zum Prüfen") : "alle Komponenten gerendert ✓") + "\n");
process.exit(results.some(r=>!r.ok && (r.name==="ReferenceError" || r.phase==="bundle" || r.phase==="export")) ? 1 : 0);
