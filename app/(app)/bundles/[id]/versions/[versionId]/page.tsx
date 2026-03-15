import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string; versionId: string }>;
}

export default async function VersionDetailPage({ params }: Props) {
  const { id, versionId } = await params;
  redirect(`/services/${id}/versions/${versionId}`);
}
