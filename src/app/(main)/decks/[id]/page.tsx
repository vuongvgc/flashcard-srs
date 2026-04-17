import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeckDetailClient } from "./deck-detail-client";

export default async function DeckDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const { id } = await params;

	const deck = await prisma.deck.findFirst({
		where: { id, user_id: session.user.id },
		include: {
			cards: { orderBy: { created_at: "desc" } },
		},
	});

	if (!deck) notFound();

	return <DeckDetailClient deck={deck} />;
}
