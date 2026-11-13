export function submittedEmail(form: FormData): string {
  const value = form.get("email");
  return typeof value === "string" ? value : "";
}
