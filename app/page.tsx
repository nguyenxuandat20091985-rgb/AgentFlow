import CommandOverview from "../components/agentflow/CommandOverview";

export default function Home() {
  return (
    <>
      <style>{`
        /* AI Website is managed from Workflows only. */
        a[href="/website"] {
          display: none !important;
        }
      `}</style>
      <CommandOverview />
    </>
  );
}
