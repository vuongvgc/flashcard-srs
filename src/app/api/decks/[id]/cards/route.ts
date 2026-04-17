import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/decks/[id]/cards - Add a single card
export async function POST(
	req: Request,
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

	const { front, back, example, tags, audio_url } = await req.json();

	if (!front?.trim() || !back?.trim()) {
		return NextResponse.json(
			{ error: "Front and back are required" },
			{ status: 400 },
		);
	}

	const card = await prisma.card.create({
		data: {
			deck_id: id,
			front: front.trim(),
			back: back.trim(),
			example: example?.trim() || null,
			tags: tags?.trim() || null,
			audio_url: audio_url?.trim() || null,
		},
	});

	// Create initial CardState for the user
	await prisma.cardState.create({
		data: { card_id: card.id, user_id: userId },
	});

	return NextResponse.json(card, { status: 201 });
}

// DELETE /api/decks/[id]/cards - Delete a card (body: { cardId })
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId, error } = await getAuthUser();
	if (error) return error;

	const { id } = await params;
	const { cardId } = await req.json();

	const card = await prisma.card.findFirst({
		where: { id: cardId, deck_id: id, deck: { user_id: userId } },
	});

	if (!card) {
		return NextResponse.json({ error: "Card not found" }, { status: 404 });
	}

	await prisma.card.delete({ where: { id: cardId } });

	return NextResponse.json({ ok: true });
}
