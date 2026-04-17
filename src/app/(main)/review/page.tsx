"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShadowPanel } from "@/components/shadow-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewCard {
	id: string;
	card: {
		id: string;
		front: string;
		back: string;
		example: string | null;
		deck: { name: string };
	};
}

const RATING_CONFIG = [
	{ value: 1, label: "Again", color: "bg-red-500 hover:bg-red-600 text-white" },
	{
		value: 2,
		label: "Hard",
		color: "bg-orange-500 hover:bg-orange-600 text-white",
	},
	{
		value: 3,
		label: "Good",
		color: "bg-green-500 hover:bg-green-600 text-white",
	},
	{
		value: 4,
		label: "Easy",
		color: "bg-blue-500 hover:bg-blue-600 text-white",
	},
];

export default function ReviewPage() {
	const router = useRouter();
	const [cards, setCards] = useState<ReviewCard[]>([]);
	const [current, setCurrent] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [total, setTotal] = useState(0);

	const x = useMotionValue(0);
	const rotate = useTransform(x, [-200, 200], [-15, 15]);
	const opacity = useTransform(
		x,
		[-200, -100, 0, 100, 200],
		[0.5, 1, 1, 1, 0.5],
	);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/review")
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				if (!cancelled) {
					setCards(data);
					setTotal(data.length);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function handleRate(rating: number) {
		if (submitting) return;
		const card = cards[current];
		if (!card) return;

		setSubmitting(true);
		const res = await fetch("/api/review", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cardStateId: card.id, rating }),
		});

		setSubmitting(false);

		if (!res.ok) {
			toast.error("Failed to submit rating");
			return;
		}

		// Next card
		if (current + 1 < cards.length) {
			setFlipped(false);
			setCurrent((c) => c + 1);
			animate(x, 0, { duration: 0 });
		} else {
			toast.success("Review session complete!");
			router.push("/dashboard");
			router.refresh();
		}
	}

	function handleDragEnd(
		_: unknown,
		info: { offset: { x: number }; velocity: { x: number } },
	) {
		const threshold = 100;
		if (info.offset.x < -threshold || info.velocity.x < -500) {
			handleRate(1); // Swipe left = Again
		} else if (info.offset.x > threshold || info.velocity.x > 500) {
			handleRate(3); // Swipe right = Good
		}
		animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-64 w-full rounded-xl" />
				<div className="flex gap-2">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-10 flex-1" />
					))}
				</div>
			</div>
		);
	}

	if (cards.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
				<p className="text-lg font-medium">No cards due for review</p>
				<p className="text-sm text-muted-foreground">
					Come back later or add more cards
				</p>
				<Link href="/dashboard" className={buttonVariants()}>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	const card = cards[current];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Link
					href="/dashboard"
					className={buttonVariants({ variant: "ghost", size: "icon" })}
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<span className="text-sm text-muted-foreground">
					{current + 1} / {total}
				</span>
				<div className="ml-auto text-xs text-muted-foreground">
					{card.card.deck.name}
				</div>
			</div>

			{/* Progress bar */}
			<div className="h-1 w-full rounded-full bg-muted">
				<div
					className="h-1 rounded-full bg-primary transition-all"
					style={{ width: `${((current + 1) / total) * 100}%` }}
				/>
			</div>

			{/* Card */}
			<motion.div
				style={{ x, rotate, opacity, touchAction: "pan-y" }}
				drag="x"
				dragConstraints={{ left: 0, right: 0 }}
				onDragEnd={handleDragEnd}
				className="cursor-grab active:cursor-grabbing"
			>
				<Card
					className="min-h-[280px] flex flex-col items-center justify-center cursor-pointer select-none"
					onClick={() => setFlipped((f) => !f)}
				>
					<CardContent className="flex flex-col items-center gap-4 pt-6 text-center w-full">
						{!flipped ? (
							<>
								<p className="text-2xl font-bold">{card.card.front}</p>
								<p className="text-xs text-muted-foreground">Tap to reveal</p>
							</>
						) : (
							<>
								<p className="text-lg text-muted-foreground">
									{card.card.front}
								</p>
								<div className="w-12 border-t" />
								<p className="text-2xl font-bold">{card.card.back}</p>
								{card.card.example && (
									<p className="text-sm italic text-muted-foreground">
										&ldquo;{card.card.example}&rdquo;
									</p>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</motion.div>

			{/* Swipe hints */}
			<div className="flex justify-between text-xs text-muted-foreground px-2">
				<span>&larr; Again</span>
				<span>Good &rarr;</span>
			</div>

			{/* Shadow panel (visible after flip) */}
			{flipped && (
				<div className="space-y-3">
					<ShadowPanel text={card.card.front} label="Front" />
					<ShadowPanel text={card.card.back} label="Back" />
				</div>
			)}

			{/* Rating buttons (visible after flip) */}
			{flipped && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="grid grid-cols-4 gap-2"
				>
					{RATING_CONFIG.map(({ value, label, color }) => (
						<button
							key={value}
							onClick={() => handleRate(value)}
							disabled={submitting}
							className={`rounded-lg px-2 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${color}`}
						>
							{label}
						</button>
					))}
				</motion.div>
			)}
		</div>
	);
}
