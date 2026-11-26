/**
 * Offline-aware socket reconnect gating (#539).
 *
 * Socket.io keeps retrying on its own even when the browser has no network.
 * This gate gives providers a single place to pause those attempts while
 * offline and to resume with at most one attempt when connectivity returns.
 * It has no dependency on React or socket.io so the policy is directly
 * testable; the provider supplies the actual `disconnect`/`retry` calls.
 */

export type ConnectivityAction = 'pause' | 'resume-once' | 'none';

/** Network failures must never start a reconnect attempt. */
export function shouldAttemptReconnect(isOnline: boolean): boolean {
  return isOnline;
}

/** Only an offline → online transition is allowed to trigger a resume. */
export function connectivityAction(
  wasOnline: boolean,
  isOnline: boolean,
): ConnectivityAction {
  if (wasOnline === isOnline) return 'none';
  return isOnline ? 'resume-once' : 'pause';
}

export interface SocketReconnectGateOptions {
  /** Injected for deterministic tests; defaults to the browser connectivity signal. */
  isOnline?: () => boolean;
  onPause?: () => void;
  onResumeScheduled?: () => void;
}

export class SocketReconnectGate {
  private online: boolean;
  private pendingAttempts = 0;
  private readonly options: SocketReconnectGateOptions;

  constructor(options: SocketReconnectGateOptions = {}) {
    this.options = options;
    this.online = options.isOnline?.() ?? true;
  }

  get isOnline(): boolean {
    return this.online;
  }

  get hasPendingAttempt(): boolean {
    return this.pendingAttempts > 0;
  }

  handleOffline(): void {
    this.online = false;
    // Cancels any queued resume so a flapping connection cannot stack attempts.
    this.pendingAttempts = 0;
    this.options.onPause?.();
  }

  handleOnline(): void {
    const wasOnline = this.online;
    this.online = true;
    if (!wasOnline && this.pendingAttempts === 0) {
      this.pendingAttempts = 1;
      this.options.onResumeScheduled?.();
    }
  }

  /** Consume the single permitted resume attempt, if one is pending. */
  takeAttempt(): boolean {
    if (!shouldAttemptReconnect(this.online) || this.pendingAttempts === 0) {
      return false;
    }
    this.pendingAttempts = 0;
    return true;
  }

  /** Call when a reconnect settles, so a failed attempt is not silently retried. */
  attemptSettled(): void {
    this.pendingAttempts = 0;
  }
}
