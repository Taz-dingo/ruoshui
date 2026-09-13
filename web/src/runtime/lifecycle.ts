export function createLoopController(app: any) {
  const originalTick = app.tick.bind(app);
  let sleeping = false;

  return {
    get isSleeping() {
      return sleeping;
    },
    sleep() {
      if (sleeping) {
        return;
      }

      sleeping = true;
      app.tick = () => {};
    },
    wake() {
      if (!sleeping) {
        return;
      }

      sleeping = false;
      app.tick = originalTick;
      window.requestAnimationFrame((timestamp) => {
        originalTick(timestamp);
      });
    }
  };
}
