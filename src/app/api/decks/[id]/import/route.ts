import { NextResponse } from "next/server";
import Papa from "papaparse";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CsvRow {
	front?: string;
	back?: string;
	example?: string;
	tags?: string;
	audio_url?: string;
}

// POST /api/decks/[id]/import - Import CSV
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

	const formData = await req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 });
	}

	if (file.size > MAX_FILE_SIZE) {
		return NextResponse.json(
			{ error: "File too large (max 5MB)" },
			{ status: 400 },
		);
	}

	const text = await file.text();
	const { data, errors } = Papa.parse<CsvRow>(text, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h: string) => h.trim().toLowerCase(),
	});

	if (errors.length > 0) {
		return NextResponse.json(
			{ error: "CSV parse error", details: errors.slice(0, 5) },
			{ status: 400 },
		);
	}

	// Validate required columns
	const valid = data.filter((row) => row.front?.trim() && row.back?.trim());

	if (valid.length === 0) {
		return NextResponse.json(
			{
				error: "No valid rows found. CSV must have 'front' and 'back' columns.",
			},
			{ status: 400 },
		);
	}

	// Bulk create cards + card states
	const cards = await prisma.$transaction(
		valid.map((row) =>
			prisma.card.create({
				data: {
					deck_id: id,
					front: row.front!.trim(),
					back: row.back!.trim(),
					example: row.example?.trim() || null,
					tags: row.tags?.trim() || null,
					audio_url: row.audio_url?.trim() || null,
				},
			}),
		),
	);

	// Create CardStates for both directions
	await prisma.cardState.createMany({
		data: cards.flatMap((c) => [
			{ card_id: c.id, user_id: userId, direction: "normal" },
			{ card_id: c.id, user_id: userId, direction: "reverse" },
		]),
	});

	return NextResponse.json(
		{ imported: cards.length, skipped: data.length - valid.length },
		{ status: 201 },
	);
}
