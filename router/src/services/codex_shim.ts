// Minimal shims to satisfy the current CLI imports while we iterate the real services.
export async function codexReview(..._args: any[]): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function codexFix(..._args: any[]): Promise<{ ok: boolean }> {
  return { ok: true };
}
