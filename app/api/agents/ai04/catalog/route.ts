import { NextResponse } from "next/server";
import { AI04_SEED_PRODUCTS } from "@/lib/agents/ai04/catalog";
export async function GET(){return NextResponse.json({agentId:"AI-04",products:AI04_SEED_PRODUCTS,total:AI04_SEED_PRODUCTS.length});}