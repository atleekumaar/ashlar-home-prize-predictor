import { createFileRoute } from "@tanstack/react-router";
import { AshlarApp } from "@/components/ashlar-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <AshlarApp />;
}
