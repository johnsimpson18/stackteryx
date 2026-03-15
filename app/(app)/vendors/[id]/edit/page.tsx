import { redirect } from "next/navigation";

interface EditVendorRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorRedirect({ params }: EditVendorRedirectProps) {
  const { id } = await params;
  redirect(`/vendors/${id}`);
}
