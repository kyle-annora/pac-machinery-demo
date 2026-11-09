import * as THREE from 'three';
import {
  addRenderStudyPlaten,
  addRenderStudyCabinet,
  addRenderStudyDetails,
} from './render-study.js';

// Shared, original 35 Series geometry. Helpers own presentation and resource tracking;
// this factory preserves the full machine's shapes, material roles and inch coordinates.
// Camera, lighting, dimensions, texture loading and motion remain with the consumer.
export function create35SeriesGeometry({
  add,
  box,
  rod,
  tube,
  mat,
  track,
  geometries,
  study,
  machine,
}) {
  // Base: gusseted side plates, shown tapered in MPI's side view.
  const gusset = new THREE.Shape(
    [
      [-29, 0],
      [29, 0],
      [24, 18.5],
      [-24, 18.5],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  for (const x of [-22, 19]) {
    const plate = add(
      new THREE.ExtrudeGeometry(gusset, { depth: 3, bevelEnabled: false }),
      mat.paint,
      machine,
      [x, 0, 0],
    );
    plate.rotation.y = -Math.PI / 2;
    plate.position.x += 3;
  }
  box(machine, [0, 6.5, 22], [40, 13, 1.5], mat.shade);
  box(machine, [0, 6.5, -22], [40, 13, 1.5], mat.shade);
  box(machine, [0, 12, 0], [22, 13, 22], mat.black);
  box(machine, [0, 22, 0], [64, 7, 50]); // lower bolster
  const platen = study
    ? addRenderStudyPlaten({ add, box, mat }, machine)
    : box(machine, [0, 27.75, 0], [60, 4.5, 50], mat.shade); // fixed lower platen, top at 30 in
  if (!study)
    for (const x of [-16, 0, 16]) box(platen, [x, 2.26, 0], [1.1, 0.04, 48], mat.steel, false); // tee slots

  // Four posts, nuts on the crown, as drawn in both elevations.
  for (const x of [-27, 27])
    for (const z of [-19, 19]) {
      rod(machine, [x, 58, z], 2.7, 66, mat.chrome);
      rod(machine, [x, 95.8, z], 4, 3.6, mat.black, 'y', true);
    }
  box(machine, [0, 90, 0], [67, 8, 47.5]); // crown
  box(machine, [0, 85.6, 0], [58, 0.8, 42], mat.steel, false);
  for (const x of [-14, 14]) {
    const eye = add(
      new THREE.TorusGeometry(2.1, 0.55, 12, 28),
      mat.steel,
      machine,
      [x, 96.6, 0],
      false,
    );
    eye.rotation.y = Math.PI / 2;
  }

  // Moving platen: travel is bound to the published daylight, 6 in to 48 in.
  const moving = new THREE.Group();
  machine.add(moving);
  box(moving, [0, 3.25, 0], [64, 6.5, 50]);
  box(moving, [0, 0.45, 0], [58, 0.9, 46], mat.steel, false);

  // Clamp cylinder with its tie rods, on the crown.
  box(machine, [0, 96, 0], [24, 4, 22], mat.black);
  rod(machine, [0, 120, 0], 8, 47, mat.black);
  box(machine, [0, 100, 0], [19, 4, 19], mat.black);
  box(machine, [0, 146, 0], [19, 4, 19], mat.black);
  for (const x of [-8.4, 8.4])
    for (const z of [-8.4, 8.4]) rod(machine, [x, 123, z], 0.75, 46, mat.chrome);
  box(machine, [12, 100.5, 13], [16, 5.5, 9], mat.black); // valve manifold
  for (const x of [6, 10, 14, 18]) {
    rod(machine, [x, 105, 13], 1.1, 3.6, mat.brass);
    rod(machine, [x, 107.4, 13], 1.5, 1.6, mat.black);
  }
  tube(machine, [
    [5, 140, 9],
    [10, 141, 12],
    [25, 128, 14],
    [31, 112, 14],
    [18, 104, 13],
  ]);
  tube(machine, [
    [0, 137, 9.2],
    [12, 136, 11],
    [32, 122, 8],
    [42, 109, 3],
    [57, 103, 2],
  ]);
  tube(machine, [
    [-5, 134, 9],
    [-3, 118, 11.5],
    [2, 106, 13],
    [8, 104, 13],
  ]);

  // Guarding around the daylight: extrusion frame with clear panels, as photographed.
  const frameRails = [
    [-32.5, 24.8],
    [32.5, 24.8],
    [-32.5, -24.8],
    [32.5, -24.8],
    [0, 24.8],
  ];
  for (const [x, z] of frameRails) box(machine, [x, 56.5, z], [1.6, 53, 1.6], mat.alloy);
  for (const y of [30.8, 83]) {
    box(machine, [0, y, 24.8], [66.6, 1.6, 1.6], mat.alloy);
    for (const x of [-32.5, 32.5]) box(machine, [x, y, 0], [1.6, 1.6, 49.6], mat.alloy);
  }
  for (const x of [-16.2, 16.2]) box(machine, [x, 56.9, 24.8], [31, 50.6, 0.3], mat.glass, false);
  box(
    machine,
    [0, 56.9, -24.8],
    [64, 50.6, 0.3],
    track(
      new THREE.MeshStandardMaterial({
        color: 0xd9dcdb,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        roughness: 0.42,
      }),
    ),
    false,
  ); // rear guard
  for (const x of [-32.5, 32.5]) box(machine, [x, 56.9, 0], [0.3, 50.6, 48], mat.glass, false);

  // Shuttle tables run forward on a rail bed carried by a front portal.
  const tooling = new THREE.Group();
  machine.add(tooling);
  const toolingFaces = [
    box(tooling, [0, 28.4, 37.4], [52, 1.8, 23.4], mat.table),
    box(tooling, [0, 28.4, 63], [52, 1.8, 23.4], mat.table),
  ];
  box(machine, [0, 26, 50], [58, 3, 52], mat.alloy);
  for (const x of [-25, 25]) box(machine, [x, 12.2, 72], [8, 24.4, 6]);
  box(machine, [0, 4, 72], [58, 8, 6]);
  box(machine, [0, 22.4, 72], [58, 4, 6], mat.shade);

  // Cabinet: drawn beside the press in MPI's front view, 33 in to 100 in from its centre.
  const panel = new THREE.Group();
  machine.add(panel);
  let door;
  if (study) door = addRenderStudyCabinet({ add, box, mat }, machine, panel);
  else {
    box(machine, [66.5, 15.8, 1], [68, 28.4, 47.4]);
    box(machine, [66.5, 62, 1], [68, 64, 46]);
    box(machine, [71, 15.8, 24.9], [54, 22, 0.6], mat.shade);
    door = box(panel, [78.5, 59, 24.4], [37, 50, 0.8], mat.shade);
  }
  box(panel, [70, 67.4, 25.1], [15.6, 12.4, 1.2], mat.black);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 9.9),
    track(new THREE.MeshBasicMaterial({ color: 0x2b3a42 })),
  );
  geometries.add(screen.geometry);
  screen.position.set(70, 67.4, 25.75);
  panel.add(screen);
  box(panel, [66, 54.8, 25], [10, 9, 1], mat.black);
  [
    [63.6, 57, mat.go],
    [68.4, 57, mat.steel],
    [63.6, 52.8, mat.steel],
  ].forEach(([x, y, m]) => rod(panel, [x, y, 25.8], 1.1, 0.9, m, 'z'));
  rod(panel, [68.4, 52.8, 25.9], 1.5, 1.2, mat.stop, 'z');
  box(machine, [41, 64, 24.3], [5, 8.5, 0.7], mat.shade);
  box(machine, [62.5, 101.5, 1], [17, 15, 20], mat.alloy); // upper housing on the cabinet
  box(machine, [62.5, 96.2, 1], [17.4, 4.4, 20.4], mat.black);
  tube(
    machine,
    [
      [33.5, 92, -11],
      [33.5, 112, -11],
      [33.5, 126, -11],
      [36, 132, -11],
      [43, 133, -11],
      [47, 129, -11],
      [47, 123, -11],
    ],
    1,
    mat.alloy,
  );
  rod(machine, [109, 19, 0], 4, 18, mat.chrome, 'x');
  rod(machine, [121, 19, 0], 5.2, 8, mat.black, 'x');

  // Rear: the conditioned wax tank stands outside the frame, as in MPI's side view. The nozzle
  // carriage waits behind the rear guard, so the daylight stays clear.
  const rear = new THREE.Group();
  machine.add(rear);
  rod(rear, [0, 50, -46], 14, 42, mat.tank, 'y', true);
  rod(rear, [0, 72.6, -46], 14.6, 3.2, mat.black, 'y', true);
  box(rear, [0, 89, -46], [7, 30, 7], mat.alloy);
  rod(rear, [0, 107, -46], 4.2, 7, mat.black);
  box(rear, [0, 60, -29], [12, 4, 8], mat.alloy);
  box(rear, [0, 46, -33.5], [11, 7, 6], mat.alloy);
  rod(rear, [0, 46, -29], 1.9, 4, mat.chrome, 'z');
  const tip = add(new THREE.ConeGeometry(1.9, 3.2, 32), mat.brass, rear, [0, 46, -25.6], false);
  tip.rotation.x = Math.PI / 2;
  tube(rear, [
    [-3, 41, -35],
    [-5, 36, -36],
    [-6, 33, -38],
    [-5, 34, -41],
  ]);

  // Fasteners, louvres and handles: small parts that let the machine read at its true size.
  for (const x of [-30, -20, -10, 10, 20, 30]) {
    rod(machine, [x, 90, 23.95], 0.85, 0.6, mat.steel, 'z');
    rod(moving, [x, 3.25, 25.2], 0.8, 0.6, mat.steel, 'z');
  }
  for (const z of [-16, -8, 0, 8, 16]) rod(machine, [-33.6, 90, z], 0.85, 0.6, mat.steel, 'x');
  if (!study)
    for (const y of [34, 37, 40, 43, 46, 49])
      box(machine, [47, y, 24.2], [18, 0.7, 0.5], mat.shade, false);
  box(panel, [62.4, 59, 25], [0.9, 7, 0.9], mat.black);
  for (const y of [40, 78]) box(panel, [96.4, y, 25], [1, 4, 0.7], mat.steel, false);
  for (const x of [-1.8, 1.8]) box(machine, [x, 57, 25.9], [0.8, 14, 0.8], mat.alloy);
  for (const [x, z] of [
    [-21, -22],
    [21, -22],
    [-21, 22],
    [21, 22],
  ])
    rod(machine, [x, 0.7, z], 3.4, 1.4, mat.black, 'y', true);
  for (const x of [-25, 25]) rod(machine, [x, 0.7, 72], 3.2, 1.4, mat.black, 'y', true);

  if (study) addRenderStudyDetails({ box, mat }, machine, moving, toolingFaces);
  return { moving, tooling, toolingFaces, panel, rear, door, screen };
}
