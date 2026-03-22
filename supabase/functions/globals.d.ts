declare const Deno: any;

declare module 'https://esm.sh/@supabase/supabase-js@2' {
    export const createClient: any;
}

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
    export function serve(...args: any[]): any;
}
