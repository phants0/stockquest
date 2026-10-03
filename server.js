const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {URL}=require("node:url");
const PORT=Number(process.env.PORT||8080);
const KEY=String(process.env.TWELVEDATA_API_KEY||"").trim();
const BASE="https://api.twelvedata.com";
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".ttf":"font/ttf",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml"};
function send(res,status,body,type,extra){res.writeHead(status,Object.assign({"Content-Type":type||"application/json; charset=utf-8","Cache-Control":"no-store"},extra||{}));res.end(typeof body==="string"?body:JSON.stringify(body));}
async function td(endpoint,params){
 if(!KEY)throw new Error("Server API key is not configured.");
 const u=new URL(endpoint,BASE);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));u.searchParams.set("apikey",KEY);
 const r=await fetch(u,{headers:{"Accept":"application/json"}});const d=await r.json().catch(()=>null);
 if(!r.ok||d?.status==="error"||d?.code)throw new Error(d?.message||d?.code||("Twelve Data HTTP "+r.status));return d;
}
async function api(res,u){
 try{
  if(u.pathname==="/api/health")return send(res,200,{ok:true,configured:Boolean(KEY)});
  if(u.pathname==="/api/price"){const s=u.searchParams.get("symbol")?.trim();if(!s)return send(res,400,{error:"Missing symbol."});const d=await td("/price",{symbol:s});const p=Number(d?.price);if(!Number.isFinite(p))throw new Error("No valid price returned.");return send(res,200,{price:p});}
  if(u.pathname==="/api/chart"){const s=u.searchParams.get("symbol")?.trim();if(!s)return send(res,400,{error:"Missing symbol."});const d=await td("/time_series",{symbol:s,interval:"5min",outputsize:24});const v=(Array.isArray(d?.values)?d.values:[]).slice().reverse().map(x=>Number(x?.close)).filter(x=>Number.isFinite(x)&&x>0);if(v.length<2)throw new Error("Not enough chart data.");return send(res,200,{values:v});}
  if(u.pathname==="/api/search"){const q=u.searchParams.get("q")?.trim();if(!q)return send(res,200,{data:[]});const d=await td("/symbol_search",{symbol:q,outputsize:10});const seen=new Set();const list=(Array.isArray(d?.data)?d.data:[]).filter(x=>{const s=String(x?.symbol||"").trim().toUpperCase();if(!s||seen.has(s))return false;seen.add(s);return true;}).map(x=>({symbol:String(x.symbol).trim().toUpperCase(),instrument_name:x.instrument_name||x.name||x.symbol,exchange:x.exchange||"",mic_code:x.mic_code||"",type:x.instrument_type||x.type||""}));return send(res,200,{data:list});}
  return send(res,404,{error:"API route not found."});
 }catch(e){console.error(e);return send(res,502,{error:e?.message||"Upstream request failed."});}
}
function staticFile(res,u){
 let p=decodeURIComponent(u.pathname);if(p==="/")p="/index.html";const root=process.cwd();const file=path.resolve(root,"."+p);
 if(!file.startsWith(root+path.sep))return send(res,403,{error:"Forbidden."});
 fs.stat(file,(err,st)=>{if(err||!st.isFile())return send(res,404,"Not found.","text/plain; charset=utf-8");const type=MIME[path.extname(file).toLowerCase()]||"application/octet-stream";res.writeHead(200,{"Content-Type":type,"Cache-Control":p.endsWith(".html")?"no-store":"public, max-age=3600"});fs.createReadStream(file).pipe(res);});
}
http.createServer(async(req,res)=>{const u=new URL(req.url||"/","http://localhost");if(req.method==="OPTIONS")return send(res,204,"","text/plain; charset=utf-8",{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type"});if(u.pathname.startsWith("/api/"))return api(res,u);if(req.method!=="GET")return send(res,405,{error:"Method not allowed."});staticFile(res,u);}).listen(PORT,"0.0.0.0",()=>console.log("StockQuest server listening on "+PORT));
