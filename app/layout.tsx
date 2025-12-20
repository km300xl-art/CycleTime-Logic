import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import FooterDebugToggle from './FooterDebugToggle';

export const metadata: Metadata = {
  title: 'CycleTime Logic',
  description: 'CycleTime Logic static site',
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/calculator', label: 'Calculator' },
  { href: '/docs', label: 'Docs' },
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-content">
            <div className="brand">CycleTime Logic</div>
            <nav className="nav">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">
            © {new Date().getFullYear()} CycleTime Logic
            <FooterDebugToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
