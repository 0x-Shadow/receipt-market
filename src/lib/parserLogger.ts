type ParserEventType = "parse_start" | "parse_success" | "parse_failure" | "ocr_correction" | "low_confidence";

interface ParserEvent {
  event: ParserEventType;
  timestamp: string;
  store: string;
  itemCount: number;
  confidence: number;
  error?: string;
}

const logs: ParserEvent[] = [];

export function logParserEvent(
  event: ParserEventType,
  store: string,
  itemCount: number,
  confidence: number,
  error?: string
): void {
  const entry: ParserEvent = {
    event,
    timestamp: new Date().toISOString(),
    store,
    itemCount,
    confidence,
    error,
  };
  console.log(`[parser:${event}]`, entry);
  logs.push(entry);
}

export function getParserStats() {
  const total = logs.length;
  const successes = logs.filter((l) => l.event === "parse_success").length;
  const failures = logs.filter((l) => l.event === "parse_failure").length;
  const ocrCorrections = logs.filter((l) => l.event === "ocr_correction").length;
  const lowConfidence = logs.filter((l) => l.event === "low_confidence").length;
  const avgConfidence =
    total > 0 ? logs.reduce((sum, l) => sum + l.confidence, 0) / total : 0;
  return { total, successes, failures, ocrCorrections, lowConfidence, avgConfidence };
}
