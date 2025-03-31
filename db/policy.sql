create policy "storage_insert_policy"
ON storage.objects
for insert with check (
  true
);
create policy "storage_update_policy"
ON storage.objects
for update with check (
  true
);
create policy "storage_select_policy"
ON storage.objects
for select using (
  true
);
create policy "storage_delete_policy"
ON storage.objects
for delete using (
  true
);