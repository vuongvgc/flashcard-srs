import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/decks/[id]
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { id } = await params;

	const deck = await prisma.deck.findFirst({
		where: { id, user_id: userId },
	});

	if (!deck) {
		return NextResponse.json({ error: "Deck not found" }, { status: 404 });
	}

	await prisma.deck.delete({ where: { id } });

	return NextResponse.json({ ok: true });
}

// GET /api/decks/[id] - Get deck with cards
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { id } = await params;

	const deck = await prisma.deck.findFirst({
		where: { id, user_id: userId },
		include: {
			cards: { orderBy: { created_at: "desc" } },
			_count: { select: { cards: true } },
		},
	});

	if (!deck) {
		return NextResponse.json({ error: "Deck not found" }, { status: 404 });
	}

	return NextResponse.json(deck);
}
