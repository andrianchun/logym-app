import { registerPlugin } from '@capacitor/core';

const RawWorkoutTimerPlugin = registerPlugin('WorkoutTimer');
let timerStarted = false;

export const WorkoutTimerPlugin = {
  async startTimer(options) {
    timerStarted = true;
    try {
      return await RawWorkoutTimerPlugin.startTimer(options);
    } catch (err) {
      timerStarted = false;
      throw err;
    }
  },
  async stopTimer() {
    timerStarted = false;
    return RawWorkoutTimerPlugin.stopTimer();
  },
  async updateTimer(options) {
    if (!timerStarted) return;
    return RawWorkoutTimerPlugin.updateTimer(options);
  },
  setAppState(options) {
    if (!timerStarted) return Promise.resolve();
    return RawWorkoutTimerPlugin.setAppState(options);
  },
  requestOverlayPermission() {
    return RawWorkoutTimerPlugin.requestOverlayPermission();
  },
};
