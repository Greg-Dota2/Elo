-- Rename Aurora → Aurora Gaming and fix slug
UPDATE teams
SET name = 'Aurora Gaming',
    slug = 'aurora-gaming'
WHERE slug = 'aurora' OR name = 'Aurora';
