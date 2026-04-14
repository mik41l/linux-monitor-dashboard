import { Mutex } from "../packages/agent/src/ipc/mutex.js";
import { Semaphore } from "../packages/agent/src/ipc/semaphore.js";

describe("ipc primitives", () => {
  it("runs mutex sections exclusively", () => {
    const mutex = new Mutex(new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)));
    const order: number[] = [];

    mutex.runExclusive(() => {
      order.push(1);
    });
    mutex.runExclusive(() => {
      order.push(2);
    });

    expect(order).toEqual([1, 2]);
  });

  it("tracks semaphore permits", () => {
    const state = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    state[0] = 1;
    const semaphore = new Semaphore(state);

    expect(semaphore.tryAcquire()).toBe(true);
    expect(semaphore.tryAcquire()).toBe(false);

    semaphore.release();

    expect(semaphore.tryAcquire()).toBe(true);
  });
});
