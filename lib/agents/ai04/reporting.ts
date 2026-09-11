import { AI04_CONFIG } from "./config";
export type AI04Report = {
  generatedAt: string; agentId: string; storeUrl: string;
  catalogCount: number; verifiedOrders: number; verifiedRevenue: number;
  conversations: number; autoResolved: number; escalations: number;
};
export function emptyAI04Report(catalogCount: number): AI04Report {
  return {generatedAt:new Date().toISOString(),agentId:AI04_CONFIG.id,storeUrl:AI04_CONFIG.storeUrl,catalogCount,verifiedOrders:0,verifiedRevenue:0,conversations:0,autoResolved:0,escalations:0};
}