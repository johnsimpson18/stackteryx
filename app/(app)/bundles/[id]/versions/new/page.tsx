import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewVersionPage({ params }: Props) {
  const { id } = await params;
  redirect(`/services/${id}/versions/new`);
}
