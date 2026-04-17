import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

export default function MainLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<main className="flex-1 pb-16">
				<div className="mx-auto max-w-md px-4 py-6">{children}</div>
			</main>
			<BottomNav />
		</div>
	);
}
