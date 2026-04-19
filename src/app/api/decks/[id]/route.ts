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

// PATCH /api/decks/[id] - Update deck settings
export async function PATCH(
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

	const body = await req.json();
	const data: Record<string, unknown> = {};

	if (typeof body.review_enabled === "boolean") {
		data.review_enabled = body.review_enabled;
	}
	if (typeof body.name === "string" && body.name.trim()) {
		data.name = body.name.trim();
	}
	if (typeof body.description === "string") {
		data.description = body.description.trim() || null;
	}

	if (Object.keys(data).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const updated = await prisma.deck.update({ where: { id }, data });
	return NextResponse.json(updated);
}
