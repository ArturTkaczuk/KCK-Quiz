const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
        process.exit(1);
    }
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS game_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leaderboard_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_answer VARCHAR(1),
    is_correct BOOLEAN,
    FOREIGN KEY(leaderboard_id) REFERENCES leaderboard(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES questions(id)
)
`;

db.serialize(() => {
    db.run(createTableSQL, (err) => {
        if (err) {
            console.error("Error creating table:", err);
        } else {
            console.log("Table 'game_answers' created successfully.");
        }
    });

    db.close();
});
