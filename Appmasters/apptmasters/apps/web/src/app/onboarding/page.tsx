import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.user?.name}!</h1>
          <p className="text-sm text-gray-500 mt-2">Get started by creating or joining an apartment.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/onboarding/create"
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-brand hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand text-xl shrink-0">
                🏠
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 group-hover:text-brand transition-colors">
                  Create an apartment
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  You&apos;ll be the admin. Share the invite code with your roommates.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/onboarding/join"
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-brand hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand text-xl shrink-0">
                🔑
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 group-hover:text-brand transition-colors">
                  Join an apartment
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the 8-character invite code from your roommate.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
