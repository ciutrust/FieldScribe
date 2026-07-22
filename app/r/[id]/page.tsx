import { RecordingView } from "@/components/recording-view";
import { getNeighborIds } from "@/lib/queries";

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { prevId, nextId } = getNeighborIds(id);
  return <RecordingView id={id} prevId={prevId} nextId={nextId} />;
}
