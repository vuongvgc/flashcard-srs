"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useHydrated() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function DarkModeToggle() {
	const { theme, setTheme } = useTheme();
	const hydrated = useHydrated();

	if (!hydrated) return null;

	return (
		<div className="flex items-center gap-2">
			<Switch
				id="dark-mode"
				checked={theme === "dark"}
				onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
			/>
			<Label htmlFor="dark-mode">Dark mode</Label>
		</div>
	);
}
