const fs = require('fs');
let content = fs.readFileSync('lib/store.ts', 'utf8');

content = content.replace(
  '{ name: "propsim-store" }',
  `{
      name: "propsim-store",
      partialize: (state) => ({
        activeAccountId: state.activeAccountId,
        compareFirmIds: state.compareFirmIds,
        animationMode: state.animationMode,
        displayTimeMode: state.displayTimeMode,
        pnlDisplayMode: state.pnlDisplayMode,
        routineConfig: state.routineConfig,
        seeded: state.seeded,
      }),
    }`
);

fs.writeFileSync('lib/store.ts', content, 'utf8');
console.log('Optimized Zustand persistence.');
