import { redirect } from 'next/navigation';

// The Template Library is now the canonical templates page at /email/templates.
export default function TemplateLibraryRedirect() {
  redirect('/email/templates');
}
