"use client";

import { useEffect, useState } from "react";

type Agent={id:string;name:string;role:string;model:string;status:string};
export default function Manage(){
 const [agents,setAgents]=useState<Agent[]>([]); const [installed,setInstalled]=useState(false); const [prompt,setPrompt]=useState(""); const [deferred,setDeferred]=useState<any>(null);
 useEffect(()=>{fetch('/api/agents').then(r=>r.json()).then(setAgents).catch(()=>{}); const h=()=>setInstalled(true); window.addEventListener('appinstalled',h); const p=(e:any)=>{e.preventDefault();setDeferred(e)}; window.addEventListener('beforeinstallprompt',p); return()=>{window.removeEventListener('appinstalled',h);window.removeEventListener('beforeinstallprompt',p)}},[]);
 async function install(){if(deferred){deferred.prompt();await deferred.userChoice;setDeferred(null)}else setInstalled(true)}
 return <main className="mobile-main"><div className="mobile-header"><a href="/" className="back">← Dashboard</a><span className="pill">AgentFlow</span></div><section className="hero-card"><div className="eyebrow">Management Center</div><h1>AgentFlow on your phone</h1><p>Manage agents and launch the workspace quickly from a mobile-first control center.</p><button className="primary install" onClick={install}>{installed?'App installed':'Tải app về điện thoại'}</button><small>Android: trình duyệt có thể hiện cài đặt tự động. iPhone/iPad: dùng Safari → Chia sẻ → Thêm vào Màn hình chính.</small></section><section className="manage-card"><div className="section-title"><strong>Agent registry</strong><span>{agents.length} agents</span></div>{agents.map(a=><div className="agent-row" key={a.id}><div><strong>{a.name}</strong><p>{a.role}</p></div><span className="status ready">{a.status}</span></div>)}</section><section className="manage-card"><div className="section-title"><strong>Quick task</strong><span>AI console</span></div><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Bạn muốn AgentFlow làm gì?"/><a className={`primary task-btn ${!prompt.trim()?'disabled':''}`} href={prompt.trim()?`/?goal=${encodeURIComponent(prompt)}`:'/manage'}>Mở Agent Console →</a></section></main>
}
