// Allowed: the API app may use the Supabase SDK and the database.
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
export const server = [createClient, drizzle];
