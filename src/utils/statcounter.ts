/**
 * Expontentially weighted moving average and standard deviation.
 * Can be used for measuring values like ping.
 */
export default class StatCounter {
  est_average: number;
  est_variance: number;
  initialized: boolean;

  constructor(private alpha: number) {
    this.est_average = 0;
    this.est_variance = 0;
    this.initialized = false;
  }

  update(measurement: number) {
    if (!this.initialized) {
      this.est_average = measurement;
      this.initialized = true;
    } else {
      let delta = measurement - this.est_average;
      let one_minus_alpha = 1 - this.alpha;
      this.est_variance = one_minus_alpha * (this.est_variance + this.alpha * delta * delta);
      this.est_average = this.alpha * measurement + one_minus_alpha * this.est_average;
    }
  }

  get average() {
    return this.est_average;
  }
  get variance() {
    return this.est_variance;
  }
  get stddev() {
    return Math.sqrt(this.est_variance);
  }
}
