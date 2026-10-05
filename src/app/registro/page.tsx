import type { Metadata } from "next";
import { RegisterForm } from "../components/forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <h1 className="text-center text-2xl font-bold">Crear cuenta</h1>
      <div className="card p-6">
        <RegisterForm />
      </div>
    </div>
  );
}
