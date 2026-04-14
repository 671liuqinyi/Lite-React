export type LiteIdleDeadline = {
  didTimeout: boolean;
  timeRemaining(): number;
};

export type LiteIdleWorkCallback = (deadline: LiteIdleDeadline) => void;

type ScheduleIdleWork = (callback: LiteIdleWorkCallback) => void;

function defaultScheduleIdleWork(callback: LiteIdleWorkCallback) {
  const host = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: LiteIdleWorkCallback) => number;
  };

  if (typeof host.requestIdleCallback === "function") {
    host.requestIdleCallback(callback);
    return;
  }

  // Fallback to a synchronous, infinite deadline outside browser idle APIs.
  callback({
    didTimeout: false,
    timeRemaining: () => Number.POSITIVE_INFINITY,
  });
}

let scheduleIdleWorkImpl: ScheduleIdleWork = defaultScheduleIdleWork;

export function scheduleIdleWork(callback: LiteIdleWorkCallback) {
  scheduleIdleWorkImpl(callback);
}

export function setScheduleIdleWorkForTest(schedule: ScheduleIdleWork | null) {
  scheduleIdleWorkImpl = schedule ?? defaultScheduleIdleWork;
}

export function shouldYield(deadline: LiteIdleDeadline) {
  return deadline.timeRemaining() <= 0;
}
