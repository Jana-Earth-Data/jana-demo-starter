import { DemoPageClient } from "@/components/demo/page-client";
import { getNepalDemoData } from "@/lib/api/demo";

export default async function HomePage() {
  const data = await getNepalDemoData();

  return <DemoPageClient initialData={data} />;
}
