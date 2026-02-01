-- Allow pupils to read custom word banks assigned to their class
create policy "word_banks_pupil_assigned_read"
  on public.word_banks
  for select
  using (
    exists (
      select 1
      from public.assignments a
      join public.pupils p on p.class_id = a.class_id
      where p.id = current_pupil_id()
        and a.word_bank_ids @> array[word_banks.id]
    )
  );

create policy "word_bank_items_pupil_assigned_read"
  on public.word_bank_items
  for select
  using (
    exists (
      select 1
      from public.assignments a
      join public.pupils p on p.class_id = a.class_id
      where p.id = current_pupil_id()
        and a.word_bank_ids @> array[word_bank_items.bank_id]
    )
  );
