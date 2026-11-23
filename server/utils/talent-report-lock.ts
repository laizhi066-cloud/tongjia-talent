/** @description 串行化同一结果或报告的写操作。 @file server/utils/talent-report-lock.ts */
const locks = new Map<string, Promise<void>>();
export async function withTalentReportLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) || Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  locks.set(key, tail);
  await previous;
  try { return await action(); }
  finally { release(); if (locks.get(key) === tail) locks.delete(key); }
}
