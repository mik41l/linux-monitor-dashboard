export class Mutex {
  public constructor(private readonly lock: Int32Array) {}

  public acquire() {
    while (Atomics.compareExchange(this.lock, 0, 0, 1) !== 0) {
      Atomics.wait(this.lock, 0, 1, 50);
    }
  }

  public release() {
    Atomics.store(this.lock, 0, 0);
    Atomics.notify(this.lock, 0, 1);
  }

  public runExclusive<TValue>(callback: () => TValue) {
    this.acquire();

    try {
      return callback();
    } finally {
      this.release();
    }
  }
}

