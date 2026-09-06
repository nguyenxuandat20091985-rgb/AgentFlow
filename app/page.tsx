"use client";

import { useEffect, useState } from "react";

type Agent={id:string;name:string;role:string;model:string;status:string};
type Run={id:string;workflow:string;agent:string;status:string;startedAt:string};

const seedAgents:Agent[]=[
 {id:"planner",name:"Planner",role:"Decomposes goals into executable steps",model:"gpt-5",status:"ready"},
 {id:"researcher",name:"Researcher",role:"Collects and synthesizes evidence",model:"gpt-5",status:"ready"},
 {id:"builder",name:"Builder",role:"Executes implementation tasks",model:"gpt-5",status:"ready"},
 {id:"reviewer",name:"Reviewer",role:"Validates outputs and quality gates",model:"gpt-5",status:"ready"}
];
const seedRuns:Run[]=[
 {id:"run-1042",workflow:"Product research",agent:"Researcher",status:"running",startedAt:"2 min ago"},
 {id:"run-1041",workflow:"Repository audit",agent:"Reviewer",status:"ready",startedAt:"18 min ago"},
 {id:"run-1040",workflow:"Feature implementation",agent:"Builder",status:"ready",startedAt:"41 min ago"}
];

export default function Home(){
 const [agents,setAgents]=useState<Agent[]>(seedAgents); const [runs,setRuns]=useState<Run[]>(seedRuns); const [busy,setBusy]=useState(false);
 useEffect(()=>{Promise.all([fetch('/api/agents'),fetch('/api/runs')]).then(async([a,r])=>{if(a.ok)setAgents(await a.json());if(r.ok)setRuns(await r.json())}).catch(()=>{});},[]);
 async function startRun(){setBusy(true);try{const res=await fetch('/api/runs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workflow:'New AgentFlow run',agent:'Planner'})});if(res.ok)setRuns([await res.json(),...runs]);}finally{setBusy(false)}}
 return <div className="shell"><aside className="side"><div className="brand">AgentFlow</div><nav className="nav"><span className="active">Overview</span><span>Agents</span><span>Workflows</span><span>Runs</span><span>Settings</span></nav></aside><main className="main"><header className="top"><div><div className="eyebrow">Control center</div><h1 className="title">Agent orchestration</h1><p className="sub">Monitor agents, launch workflows, and inspect execution state.</p></div><button className="primary" onClick={startRun} disabled={busy}>{busy?'Starting…':'Start run'}</button></header><section className="grid"><Metric label="Active agents" value={agents.filter(a=>a.status==='ready').length}/><Metric label="Running runs" value={runs.filter(r=>r.status==='running').length}/><Metric label="Completed today" value="24"/><Metric label="Success rate" value="96.4%"/></section><section className="panel"><div className="panelhead"><strong>Recent runs</strong><span className="label">Live control plane</span></div><table className="table"><thead><tr><th>Workflow</th><th>Agent</th><th>Status</th><th>Started</th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td><strong>{r.workflow}</strong><div className="label">{r.id}</div></td><td>{r.agent}</td><td><span className={`status ${r.status==='running'?'running':r.status==='paused'?'paused':'ready'}`}>{r.status}</span></td><td>{r.startedAt}</td></tr>)}</tbody></table></section><div style={{height:18}}/><section className="panel"><div className="panelhead"><strong>Agent registry</strong><span className="label">{agents.length} configured</span></div><table className="table"><thead><tr><th>Agent</th><th>Role</th><th>Model</th><th>Status</th></tr></thead><tbody>{agents.map(a=><tr key={a.id}><td><strong>{a.name}</strong></td><td>{a.role}</td><td>{a.model}</td><td><span className="status ready">{a.status}</span></td></tr>)}</tbody></table></section></main></div>
}
function Metric({label,value}:{label:string;value:string|number}){return <div className="card"><div className="label">{label}</div><div className="metric">{value}</div><div className="delta">Healthy</div></div>}
