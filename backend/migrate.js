const db = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    try {
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = await fs.readdir(migrationsDir);
        
        // Сортируем файлы по имени для последовательного выполнения
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
        
        for (const file of sqlFiles) {
            console.log(`Running migration: ${file}`);
            const sqlPath = path.join(migrationsDir, file);
            const sql = await fs.readFile(sqlPath, 'utf8');

            // Разбиваем на отдельные запросы
            const queries = sql.split(';').filter(query => query.trim());

            // Выполняем каждый запрос
            for (const query of queries) {
                if (query.trim()) {
                    await db.query(query);
                    console.log('Query executed:', query.trim());
                }
            }
        }

        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

runMigration(); 