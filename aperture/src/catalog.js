import demoManifest from '../solutions/demo-intake/manifest.json';
import { render as renderDemo } from '../solutions/demo-intake/page.js';
import songManifest from '../solutions/song-creator/manifest.json';
import { render as renderSong } from '../solutions/song-creator/page.js';
import transposeManifest from '../solutions/image-transpose/manifest.json';
import { render as renderTranspose } from '../solutions/image-transpose/page.js';
import clinicManifest from '../solutions/whatsapp-clinic/manifest.json';
import { render as renderClinic } from '../solutions/whatsapp-clinic/page.js';

/** Client-visible solutions. After copying `_starter`, import it here and add to this list. */
export const solutions = [
  { ...demoManifest, render: renderDemo },
  { ...songManifest, render: renderSong },
  { ...transposeManifest, render: renderTranspose },
  { ...clinicManifest, render: renderClinic },
];
