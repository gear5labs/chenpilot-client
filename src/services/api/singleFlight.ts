/**
 * Narrowly-scoped single-flight guard for keyed asynchronous work.
 *
 * While a key is in flight, additional calls for the same key reuse the pending
 * promise instead of issuing a duplicate request. The entry is released on both
 * success and failure, so a failed attempt never blocks a later retry.
 */
export class SingleFlight {
  private inFlight = new Map<string, Promise<unknown>>();

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = task().finally(() => {
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export const singleFlight = new SingleFlight();
