import type { Metadata } from "next";
import { PlannerLoader } from "@/components/planner/PlannerLoader";

export const metadata: Metadata = { title: "This week" };

export default function PlannerPage() {
  return <PlannerLoader />;
}
