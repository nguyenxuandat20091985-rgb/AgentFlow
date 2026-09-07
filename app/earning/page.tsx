"use client";

import { useEffect, useState } from "react";

type Vertical={id:"commerce"|"crypto";name:string;description:string;automation:string[]};
type HistoryRow={id:string;transactionCode:string;amount:number;status:string;provider:string;createdAt:string};
type Snapshot={source:string;verticals:Vertical[];revenue:{commerce:number;crypto:number;total:number;currency:string};deals:Record<string,unknown>[];orders:Record<string,unknown>[];ledger:Record<string,unknown>[];payments:Record<string,unknown>[];history:HistoryRow[];affiliateCommissions:number;safety:string};

const money=(value:number,currency="VND")=>`${value.toLocaleString("vi-VN")} ${currency}`;

export default function EarningPage(){
 const [data,setData]=useState<Snapshot|null>(null); const [error,setError]=useState("");
 const load=()=>fetch('/api/earning',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||'Không tải được dữ liệu');return j}).then(j=>{setData(j);setError('')}).catch(e=>setError(e.message));
 useEffect(()=>{load();const id=setInterval(load,10000);return()=>clearInterval(id)},[]);
 if(error&&!data)return <main className="main"><div className="error">{error}</div></main>;
 if(!data)return <main className="main"><div className="card">Đang tải dữ liệu thực tế từ Supabase…</div></main>;
 return <main className="main"><header className="top"><div><div className="eyebrow">OWNER DASHBOARD · REALTIME</div><h1 className="title">Revenue Center</h1><p className="sub">Doanh thu và giao dịch thành công lấy trực tiếp từ Supabase. Tự động làm mới mỗi 10 giây.</p></div><a className="primary" href="/payments">Inbound Payments</a></header><nav className="earning-nav"><a href="/earning">Revenue</a><a href="/payments">Inbound Payment</a><a href="/autopilot">CEO Agent</a></nav>
 <section className="grid"><Metric label="Total Revenue" value={money(data.revenue.total,data.revenue.currency)} highlight/><Metric label="Verified payment events" value={String(data.history.length)}/><Metric label="Affiliate commissions" value={money(data.affiliateCommissions,data.revenue.currency)}/><Metric label="Safety firewall" value={data.safety}/></section>
 <section className="panel" style={{marginTop:18}}><div className="panelhead"><div><strong>Lịch sử giao dịch thành công</strong><div className="sub">Chỉ hiển thị các khoản đã có trong revenue_ledger</div></div><span className="label">LIVE · {data.source}</span></div><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Mã giao dịch</th><th>Số tiền</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>{data.history.map(row=><tr key={row.id}><td><strong>{row.transactionCode}</strong><div className="label">{row.provider.toUpperCase()}</div></td><td><strong>{money(row.amount,data.revenue.currency)}</strong></td><td>{row.createdAt?new Date(row.createdAt).toLocaleString('vi-VN'):'—'}</td><td><span className="status ready">{row.status.toUpperCase()}</span></td></tr>)}{data.history.length===0&&<tr><td colSpan={4}><div style={{padding:'18px 0'}}>Chưa có giao dịch thành công được xác thực.</div></td></tr>}</tbody></table></div></section>
 <div className="verticals">{data.verticals.map(v=><section className="card" key={v.id}><div className="eyebrow">{v.id==='commerce'?'COMMERCE / AFFILIATE':'CRYPTO'}</div><h2>{v.name}</h2><p className="sub">{v.description}</p><ul>{v.automation.map(x=><li key={x}>{x}</li>)}</ul><div className="status ready">DATABASE CONNECTED</div></section>)}</div>
 {error&&<div className="error" style={{marginTop:12}}>{error}</div>}<section className="card firewall" style={{marginTop:18}}><h2>🛡️ Compliance & Safety Firewall</h2><p className="sub">Doanh thu chỉ được hiển thị khi có bản ghi ledger được xác thực. AgentFlow không có quyền rút/chuyển tiền từ tài khoản ngân hàng.</p></section></main>
}
function Metric({label,value,highlight=false}:{label:string;value:string;highlight?:boolean}){return <div className="card"><div className="label">{label}</div><div className={highlight?"metric metric-primary":"metric"}>{value}</div></div>}
