// Full-width chromeless layout for the snippet editor — matches the
// LP edit page layout so the editor canvas can stretch.
export default function SnippetEditLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
