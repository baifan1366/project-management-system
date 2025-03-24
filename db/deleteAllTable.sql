DO $$ 
DECLARE 
    table_name TEXT;
BEGIN
    -- 遍历当前 schema 中的所有表
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- 删除表（注意会级联删除相关的数据）
        EXECUTE 'DROP TABLE IF EXISTS "' || table_name || '" CASCADE';
    END LOOP;
END $$;
