// ไฟล์ที่ใช้เชื่อมต่อไปยัง Supabase และจัดการกับการเรียก API
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fuhyhggpafpawebiktoj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHloZ2dwYWZwYXdlYmlrdG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzY5NjYsImV4cCI6MjA5NDA1Mjk2Nn0.Bw5ejXhWWK82avF9S-p9FjrdHMgO4aNrHnWrxn0cpfk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
