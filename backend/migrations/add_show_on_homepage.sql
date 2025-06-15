-- Добавление колонки show_on_homepage в таблицу products
ALTER TABLE products ADD COLUMN show_on_homepage BOOLEAN DEFAULT false;

-- Обновление существующих записей
UPDATE products SET show_on_homepage = false WHERE show_on_homepage IS NULL; 