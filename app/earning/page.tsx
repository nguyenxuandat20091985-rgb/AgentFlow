"use client";

import { useEffect, useState } from "react";

type Vertical={id:"commerce"|"crypto";name:string;description:string;automation:string[]};
type Snapshot={verticals:Vertical[];revenue:{commerce:number;crypto:number;total:number;currency:string};opportunities:{id:string;vertical:string;title:string;status:string;estimatedValue:number;risk:string}[]};

export default function EarningPage(){
 const [data,setData]=useState<Snapshot|null>(null);
 useEffect(()=>{fetch('/api/earning').then(r=>r.json()).then(setData).catch(()=>null)},[]);
 if(!data)return <main className="main"><div className="card">Đang tải Earning Engine…</div></main>;
 return <main className="main"><header className="top"><div><div className="eyebrow">Owner Dashboard</div><h1 className="title">Multi-Vertical Earning Engine</h1><p className="sub">Hai nhánh độc lập dưới CEO Agent, có Safety Firewall ở trung tâm.</p></div></header><section className="grid"><Metric label="Commerce revenue" value={`${data.revenue.commerce.toLocaleString()} ${data.revenue.currency}`}/><Metric label="Crypto tracked" value={`${data.revenue.crypto.toLocaleString()} ${data.revenue.currency}`}/><Metric label="Total recorded" value={`${data.revenue.total.toLocaleString()} ${data.revenue.currency}`}/><Metric label="Safety mode" value="ON"/></section><div className="verticals">{data.verticals.map(v=><section className="card" key={v.id}><div className="eyebrow">{v.id==='commerce'?'NHÁNH 1':'NHÁNH 2'}</div><h2>{v.name}</h2><p className="sub">{v.description}</p><ul>{v.automation.map(x=><li key={x}>{x}</li>)}</ul><div className="status ready">AUTOMATION READY</div></section>)}</div><section className="panel"><div className="panelhead"><strong>Opportunity queue</strong><span className="label">{data.opportunities.length} tracked</span></div><table className="table"><thead><tr><th>Vertical</th><th>Opportunity</th><th>Status</th><th>Risk</th></tr></thead><tbody>{data.opportunities.map(o=><tr key={o.id}><td>{o.vertical==='commerce'?'Commerce':'Crypto'}</td><td><strong>{o.title}</strong><div className="label">{o.id}</div></td><td><span className="status ready">{o.status}</span></td><td>{o.risk}</td></tr>)}</tbody></table></section><section className="card" style={{marginTop:18}}><h2>🛡️ Compliance & Safety Firewall</h2><p className="sub">Chặn withdrawal, transfer, private keys/seed phrases, trading permissions và automated liquidity actions. Các hoạt động promotion phải tuân thủ quy định và điều khoản nền tảng.</p></section></main>
}
function Metric({label,value}:{label:string;value:string}){return <div className="card"><div className="label">{label}</div><div className="metric">{value}</div></div>}
