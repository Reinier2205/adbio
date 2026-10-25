import demoManifest from '../solutions/demo-intake/manifest.json';
import demoPrompt from '../solutions/demo-intake/prompt.md?raw';
import demoSchema from '../solutions/demo-intake/schema.json';

/** Registered solutions the Worker can run. Copy `_starter` then add an import here. */
export const catalog = {
  [demoManifest.id]: {
    manifest: demoManifest,
    prompt: demoPrompt,
    schema: demoSchema,
  },
};

export function getSolution(id) {
  return catalog[id] || null;
}
