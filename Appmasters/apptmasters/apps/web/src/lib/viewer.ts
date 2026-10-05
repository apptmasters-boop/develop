import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Viewer } from "@/components/marketplace/SiteHeader";

// Public pages: returns null when signed out instead of redirecting
export async function getViewer(): Promise<Viewer> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return {
    name: session.user?.name ?? session.user?.email ?? "",
    token: (session as { token?: string }).token ?? "",
  };
}
