import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BundleDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/services/${id}`);
}
