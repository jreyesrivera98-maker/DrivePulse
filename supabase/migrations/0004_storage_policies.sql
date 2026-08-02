-- ==========================================================
-- 0004_storage_policies.sql
--
-- Requiere que ya hayas creado estos 5 buckets desde el Dashboard
-- (Storage → New bucket), tal como indica la guía de despliegue:
--   vehicle-photos   (público)
--   evidence-photos  (privado)
--   signatures       (privado)
--   fuel-vouchers    (privado)
--   branding         (público)
--
-- Sin estas políticas, cualquier subida de archivo desde la app
-- fallará con 403, aunque el bucket ya exista.
-- ==========================================================

-- ---------- vehicle-photos (público) ----------
create policy "lectura publica vehicle-photos"
  on storage.objects for select
  using (bucket_id = 'vehicle-photos');

create policy "admin sube vehicle-photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-photos' and auth_role() = 'administrador');

create policy "admin actualiza vehicle-photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-photos' and auth_role() = 'administrador');

-- ---------- branding (público) ----------
create policy "lectura publica branding"
  on storage.objects for select
  using (bucket_id = 'branding');

create policy "admin sube branding"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and auth_role() = 'administrador');

create policy "admin actualiza branding"
  on storage.objects for update to authenticated
  using (bucket_id = 'branding' and auth_role() = 'administrador');

-- ---------- evidence-photos (privado) ----------
-- Cualquier usuario autenticado puede subir evidencia de daños
-- durante su propia bitácora.
create policy "usuario autenticado sube evidencia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-photos');

-- Solo admin, o el propio usuario que la subió, puede verla.
create policy "admin o dueño lee evidencia"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence-photos' and (auth_role() = 'administrador' or owner = auth.uid()));

-- ---------- signatures (privado) ----------
create policy "usuario autenticado sube su firma"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures');

create policy "admin o dueño lee firmas"
  on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and (auth_role() = 'administrador' or owner = auth.uid()));

-- ---------- fuel-vouchers (privado, auditoría fiscal) ----------
create policy "usuario autenticado sube su voucher"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fuel-vouchers');

create policy "admin o dueño lee vouchers"
  on storage.objects for select to authenticated
  using (bucket_id = 'fuel-vouchers' and (auth_role() = 'administrador' or owner = auth.uid()));
