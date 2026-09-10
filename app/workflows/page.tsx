import AgentFlowShell from "../../components/agentflow/AgentFlowShell";
import AIWebsiteShortcut from "../../components/agentflow/AIWebsiteShortcut";
import AIWebsiteWorkflowPanel from "../../components/agentflow/AIWebsiteWorkflowPanel";

export default function WorkflowsPage() {
  return (
    <>
      <AgentFlowShell view="workflows" />
      <AIWebsiteShortcut />
      <AIWebsiteWorkflowPanel />
    </>
  );
}
