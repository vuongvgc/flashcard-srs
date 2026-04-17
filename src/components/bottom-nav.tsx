"use client";

import { Home, Library, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
	{ href: "/dashboard", label: "Home", icon: Home },
	{ href: "/decks", label: "Decks", icon: Library },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex max-w-md items-center justify-around py-2">
				{tabs.map(({ href, label, icon: Icon }) => {
					const active = pathname.startsWith(href);
					return (
						<Link
							key={href}
							href={href}
							className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
								active
									? "text-primary font-medium"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Icon className="h-5 w-5" />
							{label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
