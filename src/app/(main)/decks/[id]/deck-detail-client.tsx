"use client";

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CardItem {
	id: string;
	front: string;
	back: string;
	example: string | null;
	tags: string | null;
}

interface Deck {
	id: string;
	name: string;
	cards: CardItem[];
}

export function DeckDetailClient({ deck }: { deck: Deck }) {
	const router = useRouter();
	const [addOpen, setAddOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleAddCard(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const fd = new FormData(e.currentTarget);

		const res = await fetch(`/api/decks/${deck.id}/cards`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				front: fd.get("front"),
				back: fd.get("back"),
				example: fd.get("example"),
				tags: fd.get("tags"),
			}),
		});

		setLoading(false);
		if (res.ok) {
			setAddOpen(false);
			router.refresh();
			toast.success("Card added");
		} else {
			const data = await res.json();
			toast.error(data.error);
		}
	}

	async function handleDeleteCard(cardId: string) {
		if (!confirm("Delete this card?")) return;

		const res = await fetch(`/api/decks/${deck.id}/cards`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cardId }),
		});

		if (res.ok) {
			router.refresh();
			toast.success("Card deleted");
		} else {
			toast.error("Failed to delete");
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Link
					href="/decks"
					className={buttonVariants({ variant: "ghost", size: "icon" })}
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<h1 className="flex-1 text-xl font-bold">{deck.name}</h1>
				<Dialog open={addOpen} onOpenChange={setAddOpen}>
					<DialogTrigger className={buttonVariants({ size: "sm" })}>
						<Plus className="mr-1 h-4 w-4" />
						Add
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Card</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleAddCard} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="front">Front</Label>
								<Input
									id="front"
									name="front"
									required
									placeholder="Word or phrase"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="back">Back</Label>
								<Input
									id="back"
									name="back"
									required
									placeholder="Translation / definition"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="example">Example (optional)</Label>
								<Input
									id="example"
									name="example"
									placeholder="Example sentence"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="tags">Tags (optional)</Label>
								<Input
									id="tags"
									name="tags"
									placeholder="comma, separated, tags"
								/>
							</div>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? "Adding..." : "Add Card"}
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<p className="text-sm text-muted-foreground">{deck.cards.length} cards</p>

			{deck.cards.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-center text-muted-foreground">
						No cards yet. Add cards manually or import a CSV.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{deck.cards.map((card) => (
						<Card key={card.id}>
							<CardContent className="flex items-start justify-between gap-2 p-4">
								<div className="min-w-0 flex-1">
									<p className="font-medium">{card.front}</p>
									<p className="text-sm text-muted-foreground">{card.back}</p>
									{card.example && (
										<p className="mt-1 text-xs italic text-muted-foreground">
											{card.example}
										</p>
									)}
									{card.tags && (
										<div className="mt-1 flex flex-wrap gap-1">
											{card.tags.split(",").map((t) => (
												<Badge
													key={t}
													variant="secondary"
													className="text-[10px]"
												>
													{t.trim()}
												</Badge>
											))}
										</div>
									)}
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDeleteCard(card.id)}
									className="shrink-0 text-muted-foreground hover:text-destructive"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
