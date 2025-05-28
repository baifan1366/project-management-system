DO $$ 
DECLARE 
    table_name TEXT;
BEGIN
    -- iterate through all tables in the current schema
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- delete table (note that it will cascade delete related data)
        EXECUTE 'DROP TABLE IF EXISTS "' || table_name || '" CASCADE';
    END LOOP;
END $$;
