import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DecksClient } from "./decks-client";

export default async function DecksPage() {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const decks = await prisma.deck.findMany({
		where: { user_id: session.user.id },
		include: { _count: { select: { cards: true } } },
		orderBy: { created_at: "desc" },
	});

	return <DecksClient initialDecks={decks} />;
}
