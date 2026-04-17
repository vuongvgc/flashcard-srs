"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
	const router = useRouter();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const confirm = formData.get("confirm") as string;

		if (password !== confirm) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		const res = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!res.ok) {
			const data = await res.json();
			setError(data.error || "Registration failed");
			setLoading(false);
			return;
		}

		// Auto sign in after register
		const signInRes = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setLoading(false);

		if (signInRes?.error) {
			setError("Registered but failed to sign in. Please login manually.");
		} else {
			router.push("/dashboard");
			router.refresh();
		}
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-2 text-3xl font-bold">🃏</div>
				<CardTitle className="text-xl">Create Account</CardTitle>
				<p className="text-sm text-muted-foreground">
					Start learning with spaced repetition
				</p>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<p className="text-sm text-destructive text-center">{error}</p>
					)}
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
							placeholder="you@example.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							required
							minLength={6}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm">Confirm Password</Label>
						<Input
							id="confirm"
							name="confirm"
							type="password"
							required
							minLength={6}
						/>
					</div>
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Creating account..." : "Register"}
					</Button>
				</form>
				<p className="mt-4 text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link href="/login" className="text-primary underline">
						Sign in
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
