// Supabase connection config — same shared project as FieldNotes. Both values
// are public by design: the publishable key ships to every browser; RLS + auth
// protect the data. Env vars override the committed fallbacks when set.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hnyjoixdfsawuhgdlbad.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Twy7zEQeUG1E7Z4rof8Zlg_eVqqS5T6";
