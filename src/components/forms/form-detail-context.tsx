'use client';

import * as React from 'react';
import type { FormDetail } from '@/lib/services/forms';

interface FormDetailContextValue {
  form: FormDetail;
  setForm: React.Dispatch<React.SetStateAction<FormDetail>>;
}

const FormDetailContext = React.createContext<FormDetailContextValue | null>(null);

export function FormDetailProvider({
  initialForm,
  children,
}: {
  initialForm: FormDetail;
  children: React.ReactNode;
}) {
  const [form, setForm] = React.useState<FormDetail>(initialForm);
  return (
    <FormDetailContext.Provider value={{ form, setForm }}>
      {children}
    </FormDetailContext.Provider>
  );
}

export function useFormDetail(): FormDetailContextValue {
  const ctx = React.useContext(FormDetailContext);
  if (!ctx) throw new Error('useFormDetail must be used inside FormDetailProvider');
  return ctx;
}
