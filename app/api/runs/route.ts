import { NextResponse } from "next/server";

type Run={id:string;workflow:string;agent:string;status:string;startedAt:string};
const runs:Run[]=[
 {id:"run-1042",workflow:"Product research",agent:"Researcher",status:"running",startedAt:"2 min ago"},
 {id:"run-1041",workflow:"Repository audit",agent:"Reviewer",status:"ready",startedAt:"18 min ago"},
 {id:"run-1040",workflow:"Feature implementation",agent:"Builder",status:"ready",startedAt:"41 min ago"}
];

export function GET(){return NextResponse.json(runs,{headers:{"cache-control":"no-store"}})}
export async function POST(request:Request){
 let body:{workflow?:unknown;agent?:unknown}={};
 try{body=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const workflow=typeof body.workflow==='string'&&body.workflow.trim()?body.workflow.trim():"Untitled workflow";
 const agent=typeof body.agent==='string'&&body.agent.trim()?body.agent.trim():"Planner";
 const run={id:`run-${Date.now()}`,workflow,agent,status:"running",startedAt:"just now"};
 runs.unshift(run); if(runs.length>20)runs.pop();
 return NextResponse.json(run,{status:201});
}
