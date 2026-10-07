import { useCallback, useEffect, useState } from "react";
import { fetchEvents } from "../services/votingService";
import type { ChainEvent } from "../types";
import { parseError } from "../utils/errors";

/** Loads contract events (VoteCast, VoterRegistered, ...) and refreshes them periodically. */
export function useChainEvents(pollMs = 8000) {
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
      setError(null);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  return { events, loading, error, reload: load };
}
