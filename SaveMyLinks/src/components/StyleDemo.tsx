const styleData = [
  {
    element: 'Primary Button',
    style: 'btn btn-primary',
    usage: 'All main actions, e.g. Save Link, Sign In',
    example: <button className="btn btn-primary">Primary Button</button>,
  },
  {
    element: 'Secondary Button',
    style: 'btn btn-secondary',
    usage: 'Secondary actions, e.g. Cancel, Close',
    example: <button className="btn btn-secondary">Secondary Button</button>,
  },
  {
    element: 'Input (Search/Add Link)',
    style: 'bg-input border border-input-border text-main placeholder-muted text-base',
    usage: 'Search box, Add Link form, AuthModal inputs',
    example: <input className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base" placeholder="Input Example" />,
  },
  {
    element: 'Card',
    style: 'card',
    usage: 'Feature cards, modals, containers, LinkCard, search/filter bar',
    example: <div className="card">Card Example</div>,
  },
  {
    element: 'Heading 1',
    style: 'heading-1',
    usage: 'Main page titles',
    example: <h1 className="heading-1">Heading 1 Example</h1>,
  },
  {
    element: 'Heading 2',
    style: 'heading-2',
    usage: 'Section titles, modal titles',
    example: <h2 className="heading-2">Heading 2 Example</h2>,
  },
  {
    element: 'Heading 3',
    style: 'heading-3',
    usage: 'Card titles, smaller section titles',
    example: <h3 className="heading-3">Heading 3 Example</h3>,
  },
  {
    element: 'Heading 4',
    style: 'heading-4',
    usage: 'LinkCard title, Add Link form',
    example: <h4 className="heading-4">Heading 4 Example</h4>,
  },
  {
    element: 'Body Text',
    style: 'body',
    usage: 'Paragraphs, card content',
    example: <p className="body">Body text example</p>,
  },
  {
    element: 'Body Small',
    style: 'body-sm',
    usage: 'Muted text, URLs, notes',
    example: <p className="body-sm">Body small example</p>,
  },
  {
    element: 'Tag/Chip',
    style: 'bg-chip text-chip',
    usage: 'Link tags, filter chips',
    example: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-chip text-chip">Tag Example</span>,
  },
  {
    element: 'Input Label',
    style: 'block text-base font-bold font-sans text-main mb-2',
    usage: 'Form labels, AuthModal labels',
    example: <label className="block text-base font-bold font-sans text-main mb-2">Label Example</label>,
  },
  {
    element: 'Modal Overlay',
    style: 'bg-black/40',
    usage: 'All modals',
    example: <div className="w-32 h-8 bg-black/40 rounded text-center text-white flex items-center justify-center">Overlay</div>,
  },
  {
    element: 'Modal Card',
    style: 'card p-8 max-w-md',
    usage: 'AuthModal, EditLinkModal, ExportImportModal',
    example: <div className="card p-8 max-w-md">Modal Example</div>,
  },
  {
    element: 'Empty State',
    style: 'flex flex-col items-center justify-center text-main',
    usage: 'EmptyState component',
    example: <div className="flex flex-col items-center justify-center text-main"><span className="heading-2">No Links</span><span className="body-sm">Add your first link to get started!</span></div>,
  },
  {
    element: 'Cloud Sync Status',
    style: 'flex items-center gap-2 text-main',
    usage: 'CloudSyncStatus component',
    example: <div className="flex items-center gap-2 text-main"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Synced</div>,
  },
  {
    element: 'Sidebar Menu',
    style: 'bg-[#232946] border-r border-[#334155] text-main',
    usage: 'Header sidebar',
    example: <div className="bg-[#232946] border-r border-[#334155] text-main p-4 rounded">Sidebar Example</div>,
  },
  {
    element: 'Table (Demo)',
    style: 'rounded-xl shadow bg-[rgba(30,41,59,0.85)] border border-[#232946]',
    usage: 'StyleDemo table',
    example: <div className="rounded-xl shadow p-4" style={{background:'rgba(30,41,59,0.85)',border:'1px solid #232946'}}>Table Example</div>,
  },
  {
    element: 'Overlay Action Button Padding',
    style: 'pr-12 (or matching button width)',
    usage: 'Add to content containers (e.g., title row) when using absolutely positioned overlay buttons (like three dots menu) to prevent text overlap.',
    example: (
      <div className="relative bg-input p-4 rounded-lg">
        <div className="absolute top-2 right-2">
          <button className="p-2 rounded-lg bg-card-hover">⋮</button>
        </div>
        <div className="pr-12">
          <span className="heading-4">This is a long title that will not go under the menu button</span>
        </div>
      </div>
    ),
  },
  {
    element: 'Section Anchor Offset',
    style: 'section-anchor',
    usage: 'Add to anchor sections (e.g., <section id="features" className="section-anchor">) to offset scroll position for fixed headers. Ensures correct anchor navigation on both desktop and mobile. Used in welcome.html and any page with fixed headers.',
    example: (
      <section id="demo-section" className="section-anchor" style={{border: '1px dashed #38bdf8', padding: '1rem', background: '#1e293b'}}>
        <h3 className="heading-3 text-main">Section Anchor Example</h3>
        <p className="body-sm text-main">This section will be correctly positioned below a fixed header when navigated to via anchor link.</p>
      </section>
    ),
  },
];

const images = [
  { name: 'logo.png', src: '/images/logo.png' },
  { name: 'sml_whitelogo.png', src: '/images/sml_whitelogo.png' },
  { name: 'sml_darklogo.png', src: '/images/sml_darklogo.png' },
];

function StyleDemoHeader() {
  return (
    <header className="sticky top-0 z-50 welcome-gradient-bg border-b border-[#232946] shadow">
      <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
        <img src="/images/logo.png" alt="SaveMyLinks logo" className="w-10 h-10 rounded-xl bg-[#181C2A] object-contain" />
        <h1 className="text-2xl font-bold text-white tracking-tight">SaveMyLinks Style Reference</h1>
      </div>
    </header>
  );
}

function BestPracticeNotes() {
  return (
    <section className="mb-8 p-6 rounded-xl card-dark border border-[#334155] shadow">
      <h2 className="heading-3 mb-2">Best Practice Notes</h2>
      <ul className="list-disc pl-6 text-main space-y-1">
        <li>Use <b>Tailwind utilities</b> for all layout, spacing, and most styling.</li>
        <li>Use <b>custom utilities/components</b> from <code>index.css</code> for project-wide patterns (e.g., <code>card-dark</code>, <code>welcome-gradient-bg</code>).</li>
        <li><b>Never use <code>!important</code></b> in your styles.</li>
        <li>Do <b>not</b> use light mode classes or <code>dark:</code> prefixes. This app is dark mode only.</li>
        <li>If a style isn’t applying, <b>check specificity and order</b> in your CSS and JSX.</li>
        <li>Add new styles to <code>index.css</code> and document them here.</li>
        <li>Reference this page before creating new styles or utilities.</li>
        <li>When using absolutely positioned overlay action buttons (like the three dots menu), always add right padding (e.g., <code>pr-12</code>) to the content container to prevent text overlap.</li>
      </ul>
    </section>
  );
}

function StyleChecklist() {
  return (
    <section className="mt-12 p-6 rounded-xl card-dark border border-[#334155] shadow">
      <h2 className="heading-3 mb-2">Style Review Checklist</h2>
      <ul className="list-disc pl-6 text-main space-y-1">
        <li>Are only dark mode classes/utilities used?</li>
        <li>Are all custom utilities/components from <code>index.css</code>?</li>
        <li>Is there any use of <code>!important</code>? (Should be <b>none</b>)</li>
        <li>Are all headings, buttons, cards, and inputs consistent with this reference?</li>
        <li>Are all new styles documented in this page?</li>
        <li>Is the style cascade and specificity correct?</li>
        <li>Is the UI visually consistent across all pages and modals?</li>
      </ul>
    </section>
  );
}

export default function StyleDemo() {
  return (
    <div className="min-h-screen welcome-gradient-bg">
      <StyleDemoHeader />
      <div className="max-w-4xl mx-auto p-8">
        <BestPracticeNotes />
        <h2 className="heading-2 mb-8">Style Reference Demo</h2>
        <table className="w-full border-collapse rounded-xl shadow" style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid #232946' }}>
          <thead>
            <tr>
              <th className="text-left p-4 border-b border-[#334155] text-[#cbd5e1]">Element</th>
              <th className="text-left p-4 border-b border-[#334155] text-[#cbd5e1]">Defined Style</th>
              <th className="text-left p-4 border-b border-[#334155] text-[#cbd5e1]">Where Used</th>
              <th className="text-left p-4 border-b border-[#334155] text-[#cbd5e1]">Example</th>
            </tr>
          </thead>
          <tbody>
            {styleData.map((row, i) => (
              <tr key={i} className="border-b border-[#232946]">
                <td className="p-4 align-top font-semibold text-[#cbd5e1]">{row.element}</td>
                <td className="p-4 align-top font-mono text-xs whitespace-pre-wrap text-[#cbd5e1]">{row.style}</td>
                <td className="p-4 align-top text-sm text-[#cbd5e1]">{row.usage}</td>
                <td className="p-4 align-top">{row.example}</td>
              </tr>
            ))}
            {/* Images row */}
            <tr className="border-b border-[#232946]">
              <td className="p-4 align-top font-semibold text-[#cbd5e1]">App Images</td>
              <td className="p-4 align-top font-mono text-xs whitespace-pre-wrap text-[#cbd5e1]">public/images/*.png</td>
              <td className="p-4 align-top text-sm text-[#cbd5e1]">Header, branding, backgrounds</td>
              <td className="p-4 align-top flex gap-4">
                {images.map(img => (
                  <img key={img.name} src={img.src} alt={img.name} className="w-16 h-16 object-contain bg-[#232946] rounded shadow" />
                ))}
              </td>
            </tr>
          </tbody>
        </table>
        <StyleChecklist />
      </div>
    </div>
  );
} 