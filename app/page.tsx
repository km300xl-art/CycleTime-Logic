const features = [
  {
    title: 'Static friendly',
    body: 'All pages are fully static so they can be hosted directly on GitHub Pages without a server.',
  },
  {
    title: 'Easy navigation',
    body: 'Shared navigation keeps every section just one click away.',
  },
  {
    title: 'Ready for docs',
    body: 'Placeholder routes are ready to publish documentation, FAQs, and policies.',
  },
];

export default function HomePage() {
  return (
    <section className="section">
      <h1>CycleTime Logic</h1>
      <p>
        This static Next.js site is configured to deploy to GitHub Pages with a project base
        path. Use the navigation above to explore the placeholder sections.
      </p>
      <div>
        {features.map((feature) => (
          <div key={feature.title} style={{ marginTop: '1rem' }}>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
