type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Single-process window. A second API instance needs a shared store; Redis stays out until then. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
