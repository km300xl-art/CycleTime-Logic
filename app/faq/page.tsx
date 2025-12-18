const faqs = [
  {
    question: 'How is the site deployed?',
    answer: 'The GitHub Actions workflow builds the static export and publishes the out folder to GitHub Pages.',
  },
  {
    question: 'Does it work locally?',
    answer: 'Yes. Local development does not use a base path, but production builds automatically include /CycleTime-Logic.',
  },
  {
    question: 'Is image optimization enabled?',
    answer: 'Images are marked unoptimized so static exports succeed without a server.',
  },
];

export default function FaqPage() {
  return (
    <section className="section">
      <h1>Frequently Asked Questions</h1>
      <div>
        {faqs.map((item) => (
          <div key={item.question} style={{ marginTop: '1rem' }}>
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
