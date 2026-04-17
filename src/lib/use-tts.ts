"use client";

import { useCallback, useRef, useState } from "react";

interface UseTTSOptions {
	onError?: (msg: string) => void;
}

function browserSpeak(text: string, onError?: (msg: string) => void) {
	if (!("speechSynthesis" in window)) {
		onError?.("TTS not available");
		return;
	}
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = "en-US";
	utterance.rate = 0.9;
	window.speechSynthesis.speak(utterance);
}

export function useTTS({ onError }: UseTTSOptions = {}) {
	const [loading, setLoading] = useState(false);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const speak = useCallback(
		async (text: string) => {
			if (!text.trim()) return null;
			setLoading(true);

			try {
				const res = await fetch("/api/tts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text }),
				});

				const data = await res.json();

				if (res.ok && data.url) {
					setAudioUrl(data.url);
					const audio = new Audio(data.url);
					audioRef.current = audio;
					await audio.play();
					setLoading(false);
					return data.url as string;
				}

				// Fallback to Web Speech API
				browserSpeak(text, onError);
				setLoading(false);
				return null;
			} catch {
				browserSpeak(text, onError);
				setLoading(false);
				return null;
			}
		},
		[onError],
	);

	function playFromUrl(url: string) {
		const audio = new Audio(url);
		audioRef.current = audio;
		audio.play();
	}

	function stop() {
		audioRef.current?.pause();
		if ("speechSynthesis" in window) {
			window.speechSynthesis.cancel();
		}
	}

	return { speak, playFromUrl, stop, loading, audioUrl };
}
