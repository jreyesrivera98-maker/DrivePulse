-- ==========================================================
-- seed_vehicles.sql
-- Datos de prueba para poder probar la app mientras se construye
-- la pantalla de alta de vehículos. Seguro de correr varias veces
-- (usa ON CONFLICT para no duplicar por placa).
-- ==========================================================

insert into vehicles (plate, brand, model, year, category, status, km, fuel, photo_url, project)
values
  ('NLE-4471', 'Nissan', 'Versa', 2023, 'Sedán', 'disponible', 18420, '3/4',
   'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=800&auto=format&fit=crop', null),
  ('NLE-2290', 'Toyota', 'Hilux', 2022, 'Pickup', 'disponible', 52310, '1/2',
   'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop', null),
  ('NLE-8813', 'Chevrolet', 'Suburban', 2021, 'SUV', 'disponible', 71040, 'Lleno',
   'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=800&auto=format&fit=crop', null),
  ('NLE-1157', 'Ford', 'Transit', 2020, 'Van', 'mantenimiento', 98230, '1/4',
   'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop', null)
on conflict (plate) do nothing;
