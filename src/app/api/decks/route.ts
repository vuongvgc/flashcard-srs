import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/decks - List user's decks
export async function GET() {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const decks = await prisma.deck.findMany({
		where: { user_id: userId },
		include: { _count: { select: { cards: true } } },
		orderBy: { created_at: "desc" },
	});

	return NextResponse.json(decks);
}

// POST /api/decks - Create a new deck
export async function POST(req: Request) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { name, description } = await req.json();

	if (!name?.trim()) {
		return NextResponse.json({ error: "Name is required" }, { status: 400 });
	}

	const deck = await prisma.deck.create({
		data: {
			user_id: userId,
			name: name.trim(),
			description: description?.trim() || null,
		},
	});

	return NextResponse.json(deck, { status: 201 });
}
