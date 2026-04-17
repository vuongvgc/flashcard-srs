"use client";

import { useCallback, useRef, useState } from "react";

type RecordingState = "idle" | "recording" | "recorded";

export function useRecorder() {
	const [state, setState] = useState<RecordingState>("idle");
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [supported, setSupported] = useState(true);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setSupported(false);
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Determine supported mime type
			const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
				? "audio/webm;codecs=opus"
				: MediaRecorder.isTypeSupported("audio/mp4")
					? "audio/mp4"
					: "audio/webm";

			const recorder = new MediaRecorder(stream, { mimeType });
			mediaRecorderRef.current = recorder;
			chunksRef.current = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};

			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: mimeType });
				const url = URL.createObjectURL(blob);
				setAudioUrl(url);
				setState("recorded");

				// Stop all tracks
				stream.getTracks().forEach((t) => t.stop());
			};

			recorder.start();
			setState("recording");
		} catch {
			setSupported(false);
		}
	}, []);

	const stopRecording = useCallback(() => {
		if (mediaRecorderRef.current?.state === "recording") {
			mediaRecorderRef.current.stop();
		}
	}, []);

	const reset = useCallback(() => {
		if (audioUrl) URL.revokeObjectURL(audioUrl);
		setAudioUrl(null);
		setState("idle");
	}, [audioUrl]);

	return {
		state,
		audioUrl,
		supported,
		startRecording,
		stopRecording,
		reset,
	};
}
