"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { registerSchema, zodFieldErrors } from "@/lib/validation";

export default function RegisterPage() {
  const { register } = useAuth();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await register(parsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Tidak dapat terhubung ke server. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Buat akun
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Mulai kelola project dan task Anda.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Nama" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nama lengkap"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint="Minimal 8 karakter."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>

        <Field
          label="Konfirmasi Password"
          htmlFor="password_confirmation"
          error={errors.password_confirmation}
        >
          <Input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password_confirmation}
            onChange={(event) =>
              update("password_confirmation", event.target.value)
            }
          />
        </Field>

        <Button type="submit" className="w-full" loading={submitting}>
          Daftar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Masuk
        </Link>
      </p>
    </Card>
  );
}
