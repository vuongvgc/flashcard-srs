import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
	try {
		const { email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 },
			);
		}

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json(
				{ error: "Email already registered" },
				{ status: 409 },
			);
		}

		const password_hash = await hash(password, 12);
		const user = await prisma.user.create({
			data: { email, password_hash },
		});

		// Create initial streak record
		await prisma.streak.create({
			data: { user_id: user.id },
		});

		return NextResponse.json(
			{ id: user.id, email: user.email },
			{ status: 201 },
		);
	} catch {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
