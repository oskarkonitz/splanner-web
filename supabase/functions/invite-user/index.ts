import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Obsługa CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Sprawdź czy użytkownik wywołujący funkcję jest adminem
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Nieautoryzowany')

    const { data: adminData } = await supabaseClient
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminData) throw new Error('Brak uprawnień administratora')

    // 2. Inicjalizacja admina (z kluczem SERVICE ROLE) do wysłania zaproszenia
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email } = await req.json()

    // 3. Wysłanie oficjalnego zaproszenia
    // Link w mailu przekieruje do Twojej strony z parametrem invite=true
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(req.headers.get('origin') || '').origin}?invite=true`
    })

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Zaproszenie wysłane', data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Sprawdzamy czy to standardowy obiekt błędu
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})