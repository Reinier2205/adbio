import demoManifest from '../solutions/demo-intake/manifest.json';
import demoPrompt from '../solutions/demo-intake/prompt.md?raw';
import demoSchema from '../solutions/demo-intake/schema.json';
import songManifest from '../solutions/song-creator/manifest.json';
import songPrompt from '../solutions/song-creator/prompt.md?raw';
import songSchema from '../solutions/song-creator/schema.json';
import transposeManifest from '../solutions/image-transpose/manifest.json';
import transposePrompt from '../solutions/image-transpose/prompt.md?raw';
import transposeSchema from '../solutions/image-transpose/schema.json';

/** Registered solutions the Worker can run. Copy `_starter` then add an import here. */
export const catalog = {
  [demoManifest.id]: {
    manifest: demoManifest,
    prompt: demoPrompt,
    schema: demoSchema,
  },
  [songManifest.id]: {
    manifest: songManifest,
    prompt: songPrompt,
    schema: songSchema,
  },
  [transposeManifest.id]: {
    manifest: transposeManifest,
    prompt: transposePrompt,
    schema: transposeSchema,
  },
};

export function getSolution(id) {
  return catalog[id] || null;
}
