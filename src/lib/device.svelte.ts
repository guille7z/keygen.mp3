export class DeviceStore {
  isComputer = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const desktopQuery = window.matchMedia('(min-width: 1024px) and (pointer: fine)');

      this.isComputer = desktopQuery.matches;

      desktopQuery.addEventListener('change', (e) => {
        this.isComputer = e.matches;
      });
    }
  }
}

export const device = new DeviceStore();
