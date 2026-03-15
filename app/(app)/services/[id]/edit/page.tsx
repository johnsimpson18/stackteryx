import { redirect } from "next/navigation";

interface EditServiceRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function EditServiceRedirect({ params }: EditServiceRedirectProps) {
  const { id } = await params;
  redirect(`/services/${id}`);
}
