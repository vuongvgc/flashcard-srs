import { redirect } from "next/navigation";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function SettingsPage() {
	const session = await auth();
	if (!session?.user) redirect("/login");

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Settings</h1>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Appearance</CardTitle>
				</CardHeader>
				<CardContent>
					<DarkModeToggle />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Account</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">{session.user.email}</p>
					<Separator />
					<SignOutButton />
				</CardContent>
			</Card>
		</div>
	);
}
