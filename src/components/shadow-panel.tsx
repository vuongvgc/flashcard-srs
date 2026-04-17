"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRecorder } from "@/lib/use-recorder";
import { useTTS } from "@/lib/use-tts";

interface ShadowPanelProps {
	text: string;
	cachedAudioUrl?: string | null;
}

export function ShadowPanel({ text, cachedAudioUrl }: ShadowPanelProps) {
	const [expanded, setExpanded] = useState(false);
	const tts = useTTS({ onError: (msg) => toast.error(msg) });
	const recorder = useRecorder();
	const [playingOriginal, setPlayingOriginal] = useState(false);
	const [playingRecording, setPlayingRecording] = useState(false);

	async function handlePlayOriginal() {
		setPlayingOriginal(true);
		if (cachedAudioUrl || tts.audioUrl) {
			const url = cachedAudioUrl || tts.audioUrl!;
			const audio = new Audio(url);
			audio.onended = () => setPlayingOriginal(false);
			audio.play();
		} else {
			await tts.speak(text);
			setPlayingOriginal(false);
		}
	}

	function handlePlayRecording() {
		if (!recorder.audioUrl) return;
		setPlayingRecording(true);
		const audio = new Audio(recorder.audioUrl);
		audio.onended = () => setPlayingRecording(false);
		audio.play();
	}

	if (!recorder.supported) return null;

	return (
		<div className="space-y-2">
			{/* Toggle + Listen button row */}
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={handlePlayOriginal}
					disabled={tts.loading || playingOriginal}
				>
					<Volume2 className="mr-1 h-4 w-4" />
					{tts.loading
						? "Loading..."
						: playingOriginal
							? "Playing..."
							: "Listen"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setExpanded((e) => !e)}
				>
					<Mic className="mr-1 h-4 w-4" />
					Shadow
				</Button>
			</div>

			{/* Expanded shadow panel */}
			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden"
					>
						<div className="rounded-lg border bg-muted/50 p-3 space-y-3">
							{/* Record controls */}
							<div className="flex items-center justify-center gap-3">
								{recorder.state === "idle" && (
									<Button
										size="sm"
										variant="destructive"
										onClick={recorder.startRecording}
									>
										<Mic className="mr-1 h-4 w-4" />
										Hold to Record
									</Button>
								)}

								{recorder.state === "recording" && (
									<Button
										size="sm"
										variant="destructive"
										onClick={recorder.stopRecording}
										className="animate-pulse"
									>
										<Square className="mr-1 h-4 w-4" />
										Stop Recording
									</Button>
								)}

								{recorder.state === "recorded" && (
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={handlePlayRecording}
											disabled={playingRecording}
										>
											<Play className="mr-1 h-4 w-4" />
											{playingRecording ? "Playing..." : "Your Recording"}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={handlePlayOriginal}
											disabled={playingOriginal}
										>
											<Volume2 className="mr-1 h-4 w-4" />
											{playingOriginal ? "Playing..." : "Original"}
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={recorder.reset}
										>
											<RotateCcw className="h-4 w-4" />
										</Button>
									</div>
								)}
							</div>

							<p className="text-center text-xs text-muted-foreground">
								{recorder.state === "idle" &&
									"Record yourself, then compare with the original"}
								{recorder.state === "recording" && "Recording... speak now"}
								{recorder.state === "recorded" &&
									"Listen to both and rate yourself below"}
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
