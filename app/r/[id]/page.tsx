import { RecordingView } from "@/components/recording-view";

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordingView id={id} />;
}
