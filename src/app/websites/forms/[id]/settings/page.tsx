'use client';

import { AdminOnly } from '@/components/route-guard';
import { FormSettingsForm } from '@/components/forms/form-settings-form';

export default function FormSettingsPage() {
  return (
    <AdminOnly>
      <FormSettingsForm />
    </AdminOnly>
  );
}
