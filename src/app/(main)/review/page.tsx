"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
	ArrowLeft,
	CheckCircle2,
	Keyboard,
	Layers,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { ShadowPanel } from "@/components/shadow-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewCard {
	id: string;
	direction: string;
	card: {
		id: string;
		front: string;
		back: string;
		example: string | null;
		tags: string | null;
		deck: { name: string };
	};
}

type ReviewMode = "flashcard" | "quiz";

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

function normalizeAnswer(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.replace(/[.,!?;:'"()]/g, "");
}

function ReviewLoading() {
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

export default function ReviewPage() {
	return (
		<Suspense fallback={<ReviewLoading />}>
			<ReviewContent />
		</Suspense>
	);
}

function ReviewContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const deckId = searchParams.get("deckId");
	const tag = searchParams.get("tag");

	const [cards, setCards] = useState<ReviewCard[]>([]);
	const [current, setCurrent] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [total, setTotal] = useState(0);
	const [mode, setMode] = useState<ReviewMode>("flashcard");

	// Quiz mode state
	const [quizAnswer, setQuizAnswer] = useState("");
	const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(
		null,
	);
	const [mcOptions, setMcOptions] = useState<string[]>([]);
	const [mcSelected, setMcSelected] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const x = useMotionValue(0);
	const rotate = useTransform(x, [-200, 200], [-15, 15]);
	const opacity = useTransform(
		x,
		[-200, -100, 0, 100, 200],
		[0.5, 1, 1, 1, 0.5],
	);

	useEffect(() => {
		let cancelled = false;
		const params = new URLSearchParams();
		if (deckId) params.set("deckId", deckId);
		if (tag) params.set("tag", tag);
		const url = `/api/review${params.toString() ? `?${params}` : ""}`;

		fetch(url)
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
	}, [deckId, tag]);

	// Generate multiple choice options when card or mode changes
	const generateMcOptions = useCallback(
		(cardIndex: number, allCards: ReviewCard[]) => {
			if (allCards.length === 0) return;
			const c = allCards[cardIndex];
			const isRev = c.direction === "reverse";
			const correctAnswer = isRev ? c.card.front : c.card.back;

			// Gather other answers for distractors
			const others = allCards
				.filter((_, i) => i !== cardIndex)
				.map((o) => (isRev ? o.card.front : o.card.back))
				.filter((v, i, a) => a.indexOf(v) === i && v !== correctAnswer);

			// Shuffle and pick 3 distractors
			const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
			const options = [...shuffled, correctAnswer].sort(
				() => Math.random() - 0.5,
			);
			setMcOptions(options);
		},
		[],
	);

	useEffect(() => {
		if (mode === "quiz" && cards.length > 0) {
			generateMcOptions(current, cards);
		}
	}, [current, mode, cards, generateMcOptions]);

	// Derived values
	const card = cards[current] as ReviewCard | undefined;
	const isReverse = card?.direction === "reverse";
	const displayFront = card
		? isReverse
			? card.card.back
			: card.card.front
		: "";
	const displayBack = card
		? isReverse
			? card.card.front
			: card.card.back
		: "";

	// Active tag filters
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		cards.forEach((c) => {
			if (c.card.tags) {
				c.card.tags.split(",").forEach((t) => {
					const trimmed = t.trim();
					if (trimmed) tagSet.add(trimmed);
				});
			}
		});
		return Array.from(tagSet).sort();
	}, [cards]);

	async function handleRate(rating: number) {
		if (submitting || !card) return;

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

		goNext();
	}

	function goNext() {
		if (current + 1 < cards.length) {
			setFlipped(false);
			setQuizAnswer("");
			setQuizResult(null);
			setMcSelected(null);
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
		if (info.offset.x < -threshold || info.velocity.x < -500) handleRate(1);
		else if (info.offset.x > threshold || info.velocity.x > 500) handleRate(3);
		animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
	}

	function handleQuizSubmit() {
		if (!card) return;
		const correct =
			normalizeAnswer(quizAnswer) === normalizeAnswer(displayBack);
		setQuizResult(correct ? "correct" : "wrong");
		setFlipped(true);
	}

	function handleMcSelect(option: string) {
		if (mcSelected) return; // Already answered
		setMcSelected(option);
		const correct = normalizeAnswer(option) === normalizeAnswer(displayBack);
		setQuizResult(correct ? "correct" : "wrong");
		setFlipped(true);
	}

	// Loading
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

	// Empty state
	if (cards.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
				<p className="text-lg font-medium">No cards due for review</p>
				<p className="text-sm text-muted-foreground">
					{tag
						? `No cards with tag "${tag}" are due`
						: "Come back later or add more cards"}
				</p>
				<Link href="/dashboard" className={buttonVariants()}>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	if (!card) return null;

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
				<div className="ml-auto flex items-center gap-2">
					{/* Mode toggle */}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={() => {
							setMode((m) => (m === "flashcard" ? "quiz" : "flashcard"));
							setFlipped(false);
							setQuizAnswer("");
							setQuizResult(null);
							setMcSelected(null);
						}}
						title={
							mode === "flashcard" ? "Switch to Quiz" : "Switch to Flashcard"
						}
					>
						{mode === "flashcard" ? (
							<Keyboard className="h-4 w-4" />
						) : (
							<Layers className="h-4 w-4" />
						)}
					</Button>
					{isReverse && (
						<span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
							Reverse
						</span>
					)}
					<span className="text-xs text-muted-foreground">
						{card.card.deck.name}
					</span>
				</div>
			</div>

			{/* Tag filter (if tags exist) */}
			{allTags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					<Link
						href="/review"
						className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
							!tag
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						}`}
					>
						All
					</Link>
					{allTags.map((t) => (
						<Link
							key={t}
							href={`/review?tag=${encodeURIComponent(t)}`}
							className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
								tag === t
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:bg-muted/80"
							}`}
						>
							{t}
						</Link>
					))}
				</div>
			)}

			{/* Progress bar */}
			<div className="h-1 w-full rounded-full bg-muted">
				<div
					className="h-1 rounded-full bg-primary transition-all"
					style={{ width: `${((current + 1) / total) * 100}%` }}
				/>
			</div>

			{/* === FLASHCARD MODE === */}
			{mode === "flashcard" && (
				<>
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
										<p className="text-2xl font-bold">{displayFront}</p>
										<p className="text-xs text-muted-foreground">
											Tap to reveal
										</p>
									</>
								) : (
									<>
										<p className="text-lg text-muted-foreground">
											{displayFront}
										</p>
										<div className="w-12 border-t" />
										<p className="text-2xl font-bold">{displayBack}</p>
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

					{/* Shadow panel */}
					{flipped && (
						<div className="space-y-3">
							<ShadowPanel text={displayFront} label="Front" />
							<ShadowPanel text={displayBack} label="Back" />
						</div>
					)}

					{/* Rating buttons */}
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
				</>
			)}

			{/* === QUIZ MODE === */}
			{mode === "quiz" && (
				<>
					{/* Question card */}
					<Card className="min-h-[200px] flex flex-col items-center justify-center">
						<CardContent className="flex flex-col items-center gap-4 pt-6 text-center w-full">
							<p className="text-2xl font-bold">{displayFront}</p>
							{quizResult && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									className="space-y-2"
								>
									<div className="flex items-center justify-center gap-2">
										{quizResult === "correct" ? (
											<CheckCircle2 className="h-5 w-5 text-green-500" />
										) : (
											<XCircle className="h-5 w-5 text-red-500" />
										)}
										<span
											className={`font-medium ${quizResult === "correct" ? "text-green-600" : "text-red-600"}`}
										>
											{quizResult === "correct" ? "Correct!" : "Wrong"}
										</span>
									</div>
									<p className="text-lg font-bold">{displayBack}</p>
									{card.card.example && (
										<p className="text-sm italic text-muted-foreground">
											&ldquo;{card.card.example}&rdquo;
										</p>
									)}
								</motion.div>
							)}
						</CardContent>
					</Card>

					{/* Type answer */}
					{!quizResult && (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleQuizSubmit();
							}}
							className="flex gap-2"
						>
							<Input
								ref={inputRef}
								value={quizAnswer}
								onChange={(e) => setQuizAnswer(e.target.value)}
								placeholder="Type your answer..."
								autoFocus
							/>
							<Button type="submit" disabled={!quizAnswer.trim()}>
								Check
							</Button>
						</form>
					)}

					{/* Multiple choice */}
					{!quizResult && mcOptions.length >= 2 && (
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Or choose:</p>
							<div className="grid grid-cols-2 gap-2">
								{mcOptions.map((option) => (
									<button
										key={option}
										onClick={() => handleMcSelect(option)}
										className="rounded-lg border bg-card px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
									>
										{option}
									</button>
								))}
							</div>
						</div>
					)}

					{/* After answer: shadow + rating */}
					{quizResult && (
						<>
							<div className="space-y-3">
								<ShadowPanel text={displayFront} label="Front" />
								<ShadowPanel text={displayBack} label="Back" />
							</div>
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
						</>
					)}
				</>
			)}
		</div>
	);
}
