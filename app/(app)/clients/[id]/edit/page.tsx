import { redirect } from "next/navigation";

interface EditClientRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientRedirect({ params }: EditClientRedirectProps) {
  const { id } = await params;
  redirect(`/clients/${id}`);
}
