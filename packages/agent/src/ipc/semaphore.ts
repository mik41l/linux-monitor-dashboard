export class Semaphore {
  public constructor(private readonly state: Int32Array) {}

  public tryAcquire() {
    const current = Atomics.load(this.state, 0);

    if (current <= 0) {
      return false;
    }

    return Atomics.compareExchange(this.state, 0, current, current - 1) === current;
  }

  public release() {
    Atomics.add(this.state, 0, 1);
    Atomics.notify(this.state, 0, 1);
  }
}

