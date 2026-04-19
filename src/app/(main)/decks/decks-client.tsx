"use client";

import { MoreVertical, Pause, Play, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Deck {
	id: string;
	name: string;
	description: string | null;
	review_enabled: boolean;
	_count: { cards: number };
}

export function DecksClient({ initialDecks }: { initialDecks: Deck[] }) {
	const router = useRouter();
	const [createOpen, setCreateOpen] = useState(false);
	const [importDeckId, setImportDeckId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const fd = new FormData(e.currentTarget);

		const res = await fetch("/api/decks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: fd.get("name"),
				description: fd.get("description"),
			}),
		});

		setLoading(false);
		if (res.ok) {
			setCreateOpen(false);
			router.refresh();
			toast.success("Deck created");
		} else {
			const data = await res.json();
			toast.error(data.error);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm("Delete this deck and all its cards?")) return;

		const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
		if (res.ok) {
			router.refresh();
			toast.success("Deck deleted");
		} else {
			toast.error("Failed to delete");
		}
	}

	async function handleToggleReview(id: string, currentEnabled: boolean) {
		const res = await fetch(`/api/decks/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ review_enabled: !currentEnabled }),
		});
		if (res.ok) {
			router.refresh();
			toast.success(!currentEnabled ? "Review enabled" : "Review paused");
		} else {
			toast.error("Failed to update");
		}
	}

	async function handleImport(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!importDeckId) return;
		setLoading(true);

		const fd = new FormData(e.currentTarget);
		const res = await fetch(`/api/decks/${importDeckId}/import`, {
			method: "POST",
			body: fd,
		});

		setLoading(false);
		const data = await res.json();

		if (res.ok) {
			setImportDeckId(null);
			router.refresh();
			toast.success(
				`Imported ${data.imported} cards${data.skipped ? `, ${data.skipped} skipped` : ""}`,
			);
		} else {
			toast.error(data.error);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Decks</h1>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger className={buttonVariants({ size: "sm" })}>
						<Plus className="mr-1 h-4 w-4" />
						New Deck
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Deck</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									name="name"
									required
									placeholder="e.g. TOEIC Vocabulary"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Description (optional)</Label>
								<Input
									id="description"
									name="description"
									placeholder="What's this deck about?"
								/>
							</div>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? "Creating..." : "Create"}
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Import CSV Dialog */}
			<Dialog
				open={!!importDeckId}
				onOpenChange={(o) => !o && setImportDeckId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import CSV</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleImport} className="space-y-4">
						<p className="text-sm text-muted-foreground">
							CSV must have{" "}
							<code className="text-xs bg-muted px-1 rounded">front</code> and{" "}
							<code className="text-xs bg-muted px-1 rounded">back</code>{" "}
							columns. Optional:{" "}
							<code className="text-xs bg-muted px-1 rounded">example</code>,{" "}
							<code className="text-xs bg-muted px-1 rounded">tags</code>,{" "}
							<code className="text-xs bg-muted px-1 rounded">audio_url</code>
						</p>
						<Input type="file" name="file" accept=".csv" required />
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Importing..." : "Import"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>

			{initialDecks.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-center text-muted-foreground">
						No decks yet. Create your first deck to get started.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{initialDecks.map((deck) => (
						<Link key={deck.id} href={`/decks/${deck.id}`} className="block">
							<Card
								className={`transition-colors hover:bg-accent ${!deck.review_enabled ? "opacity-60" : ""}`}
							>
								<CardHeader className="flex flex-row items-center justify-between p-4">
									<div>
										<div className="flex items-center gap-2">
											<CardTitle className="text-base">{deck.name}</CardTitle>
											{!deck.review_enabled && (
												<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
													Paused
												</span>
											)}
										</div>
										{deck.description && (
											<p className="text-sm text-muted-foreground mt-0.5">
												{deck.description}
											</p>
										)}
										<p className="text-xs text-muted-foreground mt-1">
											{deck._count.cards} cards
										</p>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger
											className={buttonVariants({
												variant: "ghost",
												size: "icon",
											})}
											onClick={(e) => e.preventDefault()}
										>
											<MoreVertical className="h-4 w-4" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={(e) => {
													e.preventDefault();
													handleToggleReview(deck.id, deck.review_enabled);
												}}
											>
												{deck.review_enabled ? (
													<>
														<Pause className="mr-2 h-4 w-4" />
														Pause Review
													</>
												) : (
													<>
														<Play className="mr-2 h-4 w-4" />
														Enable Review
													</>
												)}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={(e) => {
													e.preventDefault();
													setImportDeckId(deck.id);
												}}
											>
												<Upload className="mr-2 h-4 w-4" />
												Import CSV
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={(e) => {
													e.preventDefault();
													handleDelete(deck.id);
												}}
												className="text-destructive"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
