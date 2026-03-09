import { useEffect, useRef } from "react";

export function useAutoRefresh(
    callback: () => void,
    intervalMs: number = 15_000,
    enabled: boolean = true
) {
    const callbackRef = useRef(callback);

    // Garde toujours la dernière version du callback
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            callbackRef.current();
        }, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs, enabled]);
}