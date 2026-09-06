import { NextResponse } from "next/server";

const agents = [
  { id:"planner", name:"Planner", role:"Decomposes goals into executable steps", model:"gpt-5", status:"ready" },
  { id:"researcher", name:"Researcher", role:"Collects and synthesizes evidence", model:"gpt-5", status:"ready" },
  { id:"builder", name:"Builder", role:"Executes implementation tasks", model:"gpt-5", status:"ready" },
  { id:"reviewer", name:"Reviewer", role:"Validates outputs and quality gates", model:"gpt-5", status:"ready" }
];

export function GET(){ return NextResponse.json(agents, { headers:{"cache-control":"no-store"} }); }
