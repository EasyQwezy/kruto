-- Добавление колонки images в таблицу products
ALTER TABLE products ADD COLUMN images JSON DEFAULT '[]';

-- Обновление существующих записей
UPDATE products SET images = '[]' WHERE images IS NULL; 