export const pendingQueue: any[] = [];
export function enqueueReceipt(payload: any) { pendingQueue.push(payload); }
export function drainQueue(): any[] { return pendingQueue.splice(0); }
