import { NextResponse } from "next/server";
import { type Card as FSRSCard, fsrs } from "ts-fsrs";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const f = fsrs();

// GET /api/review?deckId=xxx - Get due cards for review
export async function GET(req: Request) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { searchParams } = new URL(req.url);
	const deckId = searchParams.get("deckId");

	const where: Record<string, unknown> = {
		user_id: userId,
		due: { lte: new Date() },
	};

	if (deckId) {
		where.card = { deck_id: deckId };
	}

	const states = await prisma.cardState.findMany({
		where,
		include: {
			card: { include: { deck: { select: { name: true } } } },
		},
		orderBy: { due: "asc" },
		take: 50,
	});

	return NextResponse.json(states);
}

// POST /api/review - Submit a rating
export async function POST(req: Request) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { cardStateId, rating } = await req.json();

	if (!cardStateId || !rating || ![1, 2, 3, 4].includes(rating)) {
		return NextResponse.json(
			{ error: "cardStateId and rating (1-4) are required" },
			{ status: 400 },
		);
	}

	const state = await prisma.cardState.findFirst({
		where: { id: cardStateId, user_id: userId },
	});

	if (!state) {
		return NextResponse.json(
			{ error: "Card state not found" },
			{ status: 404 },
		);
	}

	// Build FSRS card from DB state
	const fsrsCard: FSRSCard = {
		due: state.due,
		stability: state.stability,
		difficulty: state.difficulty,
		elapsed_days: state.elapsed_days,
		scheduled_days: state.scheduled_days,
		reps: state.reps,
		lapses: state.lapses,
		state: state.state,
		learning_steps: 0,
		last_review: state.last_review ?? undefined,
	};

	// Calculate next state
	const now = new Date();
	const result = f.repeat(fsrsCard, now);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const next = (result as any)[rating].card;

	// Update card state
	await prisma.cardState.update({
		where: { id: cardStateId },
		data: {
			stability: next.stability,
			difficulty: next.difficulty,
			elapsed_days: next.elapsed_days,
			scheduled_days: next.scheduled_days,
			reps: next.reps,
			lapses: next.lapses,
			state: next.state,
			due: next.due,
			last_review: now,
		},
	});

	// Create review log
	await prisma.reviewLog.create({
		data: {
			card_id: state.card_id,
			user_id: userId,
			rating,
		},
	});

	// Update streak
	await updateStreak(userId);

	return NextResponse.json({ due: next.due, state: next.state });
}

async function updateStreak(userId: string) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const streak = await prisma.streak.findUnique({ where: { user_id: userId } });

	if (!streak) {
		await prisma.streak.create({
			data: {
				user_id: userId,
				current_streak: 1,
				longest_streak: 1,
				last_review_date: today,
			},
		});
		return;
	}

	const lastDate = streak.last_review_date;
	if (!lastDate) {
		await prisma.streak.update({
			where: { user_id: userId },
			data: {
				current_streak: 1,
				longest_streak: Math.max(1, streak.longest_streak),
				last_review_date: today,
			},
		});
		return;
	}

	const last = new Date(lastDate);
	last.setHours(0, 0, 0, 0);
	const diffDays = Math.floor(
		(today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays === 0) return; // Already reviewed today
	if (diffDays === 1) {
		const newStreak = streak.current_streak + 1;
		await prisma.streak.update({
			where: { user_id: userId },
			data: {
				current_streak: newStreak,
				longest_streak: Math.max(newStreak, streak.longest_streak),
				last_review_date: today,
			},
		});
	} else {
		// Streak broken
		await prisma.streak.update({
			where: { user_id: userId },
			data: {
				current_streak: 1,
				longest_streak: Math.max(1, streak.longest_streak),
				last_review_date: today,
			},
		});
	}
}
