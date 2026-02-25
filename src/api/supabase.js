import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qmexsjjulbptrlznpfir.supabase.co'; 
const supabaseKey = 'sb_publishable_R3gpFe_5Q3g2maIxxKXS-Q_pTo_z7NS';

export const supabase = createClient(supabaseUrl, supabaseKey);