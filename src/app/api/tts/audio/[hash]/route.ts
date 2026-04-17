import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/tts/audio/[hash] - Proxy private blob audio
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ hash: string }> },
) {
	const { error } = await getAuthUser();
	if (error) return error;

	const { hash } = await params;

	const cached = await prisma.audioCache.findUnique({
		where: { text_hash: hash },
	});

	if (!cached) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const result = await get(cached.blob_url, { access: "private" });
	if (!result) {
		return NextResponse.json({ error: "Blob not found" }, { status: 404 });
	}

	return new NextResponse(result.stream, {
		headers: {
			"Content-Type": "audio/mpeg",
			"Cache-Control": "public, max-age=86400",
		},
	});
}
