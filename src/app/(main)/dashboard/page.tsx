import { Flame, Library } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DeckWithDue {
	id: string;
	name: string;
	totalCards: number;
	dueCards: number;
}

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const userId = session.user.id;

	const [dueCount, streak, decks, totalReviews, learnedCount] =
		await Promise.all([
			prisma.cardState.count({
				where: { user_id: userId, due: { lte: new Date() } },
			}),
			prisma.streak.findUnique({ where: { user_id: userId } }),
			prisma.deck.findMany({
				where: { user_id: userId },
				include: {
					_count: { select: { cards: true } },
					cards: {
						include: {
							states: {
								where: { user_id: userId, due: { lte: new Date() } },
								select: { id: true },
							},
						},
					},
				},
				orderBy: { created_at: "desc" },
			}),
			prisma.reviewLog.count({ where: { user_id: userId } }),
			prisma.cardState.count({
				where: { user_id: userId, reps: { gt: 0 } },
			}),
		]);

	const decksWithDue: DeckWithDue[] = decks.map((d) => ({
		id: d.id,
		name: d.name,
		totalCards: d._count.cards,
		dueCards: d.cards.filter((c) => c.states.length > 0).length,
	}));

	return (
		<div className="space-y-6">
			{/* Streak */}
			<Card>
				<CardContent className="flex items-center gap-3 pt-6">
					<Flame className="h-8 w-8 text-amber-500" />
					<div>
						<p className="text-2xl font-bold">
							{streak?.current_streak ?? 0} day streak
						</p>
						<p className="text-sm text-muted-foreground">
							Longest: {streak?.longest_streak ?? 0} days
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Due today */}
			<Card>
				<CardContent className="pt-6 text-center">
					<p className="text-4xl font-bold">{dueCount}</p>
					<p className="text-muted-foreground">cards due today</p>
					{dueCount > 0 && (
						<Link
							href="/review"
							className={buttonVariants({ className: "mt-4 w-full" })}
						>
							Start Review
						</Link>
					)}
				</CardContent>
			</Card>

			{/* Stats row */}
			<div className="grid grid-cols-2 gap-3">
				<Card>
					<CardContent className="pt-4 text-center">
						<p className="text-2xl font-bold">{totalReviews}</p>
						<p className="text-xs text-muted-foreground">total reviews</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 text-center">
						<p className="text-2xl font-bold">{learnedCount}</p>
						<p className="text-xs text-muted-foreground">cards learned</p>
					</CardContent>
				</Card>
			</div>

			{/* Decks */}
			<div>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="flex items-center gap-2 text-lg font-semibold">
						<Library className="h-5 w-5" />
						Your Decks
					</h2>
					<Link
						href="/decks"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						View all
					</Link>
				</div>
				{decksWithDue.length === 0 ? (
					<Card>
						<CardContent className="pt-6 text-center text-muted-foreground">
							No decks yet.{" "}
							<Link href="/decks" className="text-primary underline">
								Create one
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-2 gap-3">
						{decksWithDue.map((deck) => (
							<Link key={deck.id} href={`/decks/${deck.id}`}>
								<Card className="h-full transition-colors hover:bg-accent">
									<CardHeader className="p-4 pb-2">
										<CardTitle className="text-sm">{deck.name}</CardTitle>
									</CardHeader>
									<CardContent className="p-4 pt-0">
										<p className="text-xs text-muted-foreground">
											{deck.totalCards} cards
										</p>
										{deck.dueCards > 0 && (
											<p className="text-xs font-medium text-amber-500">
												{deck.dueCards} due
											</p>
										)}
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
