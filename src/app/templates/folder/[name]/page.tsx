import { redirect } from 'next/navigation';

// Legacy /templates/folder/<name> route — previously rendered the legacy
// emails folder page which fetched the OEM template library and the emails
// folder store, neither of which is correct for ESP templates. Redirect to
// the main templates page where folder navigation works via state. (A
// future enhancement could resolve <name> → folder ID and redirect to
// /templates?folder=<id> to preserve the folder context in the URL.)
export default function TemplatesFolderRedirect() {
  redirect('/email/templates');
}
