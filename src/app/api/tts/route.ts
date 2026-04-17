import { put } from "@vercel/blob";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"; // Roger (premade, free tier)
const DAILY_LIMIT = 100;

function hashText(text: string, voiceId: string): string {
	return createHash("sha256").update(`${text}:${voiceId}`).digest("hex");
}

// Rate limit check (simple per-user per-day)
async function checkRateLimit(): Promise<boolean> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const todayAudioCount = await prisma.audioCache.count({
		where: {
			created_at: { gte: today, lt: tomorrow },
		},
	});

	return todayAudioCount < DAILY_LIMIT;
}

// POST /api/tts - Generate or retrieve cached TTS audio
export async function POST(req: Request) {
	const { error } = await getAuthUser();
	if (error) return error;

	const { text, voiceId } = await req.json();

	if (!text?.trim()) {
		return NextResponse.json({ error: "Text is required" }, { status: 400 });
	}

	const voice = voiceId || DEFAULT_VOICE_ID;
	const textHash = hashText(text.trim(), voice);

	// Check cache first
	const cached = await prisma.audioCache.findUnique({
		where: { text_hash: textHash },
	});

	if (cached) {
		return NextResponse.json({
			url: `/api/tts/audio/${textHash}`,
			cached: true,
		});
	}

	// Rate limit check
	const allowed = await checkRateLimit();
	if (!allowed) {
		return NextResponse.json(
			{
				error: "Daily TTS limit reached. Use browser TTS as fallback.",
				fallback: true,
			},
			{ status: 429 },
		);
	}

	// Call ElevenLabs API
	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "TTS not configured", fallback: true },
			{ status: 503 },
		);
	}

	try {
		const response = await fetch(`${ELEVENLABS_API_URL}/${voice}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"xi-api-key": apiKey,
			},
			body: JSON.stringify({
				text: text.trim(),
				model_id: "eleven_multilingual_v2",
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75,
				},
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("ElevenLabs error:", response.status, errorText);
			return NextResponse.json(
				{ error: "TTS generation failed", fallback: true },
				{ status: 502 },
			);
		}

		const audioBuffer = await response.arrayBuffer();

		// Upload to Vercel Blob
		const blob = await put(`tts/${textHash}.mp3`, Buffer.from(audioBuffer), {
			access: "private",
			contentType: "audio/mpeg",
		});

		// Cache in DB
		await prisma.audioCache.create({
			data: {
				text_hash: textHash,
				text: text.trim(),
				voice_id: voice,
				blob_url: blob.url,
			},
		});

		return NextResponse.json({
			url: `/api/tts/audio/${textHash}`,
			cached: false,
		});
	} catch (err) {
		console.error("TTS error:", err);
		return NextResponse.json(
			{ error: "TTS generation failed", fallback: true },
			{ status: 500 },
		);
	}
}
