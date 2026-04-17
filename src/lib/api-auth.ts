import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function getAuthUser() {
	const session = await auth();
	if (!session?.user?.id) {
		return {
			userId: null as never as string,
			error: NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			) as NextResponse,
		};
	}
	return { userId: session.user.id, error: null };
}
