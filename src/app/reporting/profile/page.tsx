import { UserCircleIcon } from '@heroicons/react/24/outline';
import { ReportingPageHeader } from '../_components/page-header';

export default function ReportingProfilePage() {
  return (
    <ReportingPageHeader
      icon={UserCircleIcon}
      title="Your profile"
      subtitle="Account details, password, and notification preferences land here."
    />
  );
}
