-- Migration Helper Function
-- This function needs to be created first in Supabase Studio, then we can call it via RPC

-- Step 1: Create a function that can execute arbitrary SQL (admin only)
create or replace function execute_migration_sql(sql_text text)
returns text
language plpgsql
security definer
as $$
begin
  execute sql_text;
  return 'Migration executed successfully';
exception
  when others then
    return 'Error: ' || SQLERRM;
end;
$$;

-- Grant execute permission only to authenticated users (or restrict further)
revoke all on function execute_migration_sql(text) from public;
grant execute on function execute_migration_sql(text) to service_role;

comment on function execute_migration_sql is 'Helper function to execute migration SQL. Only accessible via service role.';
