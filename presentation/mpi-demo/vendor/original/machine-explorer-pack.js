/** Presentation packages, never equipment configurations or engineering models. */
const SERIES_35 = Object.freeze({
  machineId: 'mpi-35-series-4-post',
  packageId: 'mpi-35-series-spatial-study',
  packageRevision: '2026-11-02.1',
  authority: 'illustrative-study',
  title: '35 Series spatial study',
  sourceImage: '/catalog/images/machines/mpi-35/mpi-35-series-4-Post-IVORY.webp',
  poster: '/assets/mpi-35-study.webp',
  sourceUrl: 'https://www.mpi-systems.com/machines/wax-injection-equipment/mpi-35-series-4-post/',
  notice: 'Illustrative 3D study · not MPI CAD',
  detail: 'Proportions follow the front and side views in MPI’s published brochure. Parts and movement are simplified.',
  capabilities: Object.freeze(['orbit', 'focus', 'opening-preview', 'save-view']),
  // Published overall dimensions set the study's proportions. The middle of each published range is not implied.
  proportions: Object.freeze({
    '35-100': Object.freeze({ height: 1, width: 1 }),
    '35-200': Object.freeze({ height: 154 / 148, width: 1 }),
    '35-300': Object.freeze({ height: 164 / 148, width: 180 / 157 }),
  }),
  focuses: Object.freeze([
    Object.freeze({ id: 'whole', label: 'Whole machine', title: 'See how much machine this is.',
      expand: 'Height and width follow MPI’s published figures for the model you pick. Check them against your floor, ceiling and die-handling access.',
      upgrade: 'Use the view to frame the discussion. Your installed machine’s identity, condition and available space still need to be checked.',
      question: 'Confirm the actual machine, tooling envelope and access requirements.' }),
    Object.freeze({ id: 'tooling', label: 'Tooling area', title: 'Look at the working area.',
      expand: 'MPI lists 6 in to 48 in of daylight. With two shuttle tables, the press can inject one die while the operator unloads the other.',
      upgrade: 'A tooling or removal change is only a candidate if observation locates the delay here. Cooling, injection and manual handling need separate evidence.',
      question: 'Which part of the observed cycle causes the delay, and what tooling is in use?' }),
    Object.freeze({ id: 'controls', label: 'Operator controls', title: 'Find the operator interface.',
      expand: 'Smart Controls monitor wax temperature, flow, pressure and injection time in real time against your baselines, from a touch-screen terminal beside the guarded working area.',
      upgrade: 'Record the installed control system and interfaces before discussing an upgrade. A new interface alone does not establish a remedy for the bottleneck.',
      question: 'Confirm the installed controls, interfaces and observed operating sequence.' }),
    Object.freeze({ id: 'injection', label: 'Wax supply', title: 'Follow the wax.',
      expand: 'A conditioned reservoir supplies the injection system. The motor-driven x-y-z nozzle lines up with the die for the most direct wax flow path.',
      upgrade: 'Wax supply and nozzle changes depend on the installed machine and the wax in use. Describe what you see at the die before discussing a change.',
      question: 'Confirm the reservoir, wax type and nozzle arrangement for this application.' }),
  ]),
});

/** Labels on the stage. Every value is read from the published specification. */
export function machineExplorerAnnotations(facts) {
  return [
    { focus: 'whole', anchor: [-46, 148, 26], side: 'above', text: `Overall height ${facts.height}` },
    { focus: 'whole', anchor: [46, 0.2, 90], side: 'below', text: `Overall width ${facts.width}` },
    { focus: 'tooling', anchor: [-38, 54, 28], side: 'left', live: 'daylight' },
    { focus: 'tooling', anchor: [0, 30.25, -6], side: 'right', text: `Clamping area ${facts.area}` },
    { focus: 'tooling', anchor: [0, 29.4, 58], side: 'right', text: 'Hydraulic shuttle tables' },
    { focus: 'controls', anchor: [62.2, 67.4, 25.8], side: 'left', text: 'Smart Controls touch screen' },
    { focus: 'controls', anchor: [61, 54.8, 25.6], side: 'left', text: 'Operator controls' },
    { focus: 'injection', anchor: [0, 46, -30], side: 'right', text: 'Horizontal FlexNoz®, 3-axis positioner' },
    { focus: 'injection', anchor: [-14, 56, -44], side: 'left', text: `Wax conditioning reservoir, ${facts.reservoir}` },
  ];
}

export function getMachineExplorerPack(machineId) { return machineId === SERIES_35.machineId ? SERIES_35 : null; }
export function hasMachineExplorer(machineId) { return Boolean(getMachineExplorerPack(machineId)); }
export const MACHINE_EXPLORER_DIRECTIONS = Object.freeze(['expand', 'upgrade']);
export const MACHINE_EXPLORER_FOCUSES = Object.freeze(['whole', 'tooling', 'controls', 'injection']);
