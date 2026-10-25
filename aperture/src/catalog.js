import demoManifest from '../solutions/demo-intake/manifest.json';
import { render as renderDemo } from '../solutions/demo-intake/page.js';

/** Client-visible solutions. After copying `_starter`, import it here and add to this list. */
export const solutions = [
  { ...demoManifest, render: renderDemo },
];
