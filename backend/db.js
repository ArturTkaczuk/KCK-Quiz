const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');

// Create DB connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
    } else {
        console.log('Connected to SQLite database.');
        db.run("PRAGMA foreign_keys = ON"); // Enable Foreign Keys
    }
});

// Helper Promisified Functions
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Exports
module.exports = {
    // Users
    getUserById: async (id) => {
        return await get("SELECT * FROM users WHERE id = ?", [id]);
    },
    getAllUsers: async () => {
        return await all("SELECT * FROM users");
    },
    createUser: async (id, name, role) => {
        const result = await run("INSERT INTO users (id, name, role) VALUES (?, ?, ?)", [id, name, role]);
        return { id, name, role };
    },

    // Subjects
    getSubjects: async () => {
        return await all("SELECT * FROM subjects");
    },
    createSubject: async (name, slug) => {
        const result = await run("INSERT INTO subjects (name, slug) VALUES (?, ?)", [name, slug]);
        return { id: result.id, name, slug };
    },
    getSubjectBySlug: async (slug) => {
        return await get("SELECT * FROM subjects WHERE slug = ?", [slug]);
    },
    deleteSubject: async (id) => {
        // Cascade delete is handled by SQLite ON DELETE CASCADE if enabled
        const result = await run("DELETE FROM subjects WHERE id = ?", [id]);
        return result.changes > 0;
    },

    // Questions
    getQuestionsBySubjectId: async (subjectId) => {
        return await all("SELECT * FROM questions WHERE subject_id = ? ORDER BY difficulty ASC, id ASC", [subjectId]);
    },
    getQuestionsBySubjectIdAndDifficulty: async (subjectId, difficulty) => {
        return await all("SELECT * FROM questions WHERE subject_id = ? AND difficulty = ?", [subjectId, difficulty]);
    },
    createQuestion: async (q) => {
        const result = await run(
            "INSERT INTO questions (subject_id, content, answer_a, answer_b, answer_c, answer_d, correct_answer, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [q.subject_id, q.content, q.answer_a, q.answer_b, q.answer_c, q.answer_d, q.correct_answer, q.difficulty]
        );
        return { id: result.id, ...q };
    },
    updateQuestion: async (id, data) => {
        // Build dynamic query? Or simple one for now since we usually update all fields.
        // The API sends all fields.
        // data contains content, answers, correct_answer, difficulty

        // We need to fetch the existing question to handle partial updates if necessary, 
        // but current API sends full update.
        // Let's assume full update of editable fields.

        const sql = `UPDATE questions SET 
            content = ?, 
            answer_a = ?, 
            answer_b = ?, 
            answer_c = ?, 
            answer_d = ?, 
            correct_answer = ?, 
            difficulty = ? 
            WHERE id = ?`;

        const result = await run(sql, [
            data.content,
            data.answer_a,
            data.answer_b,
            data.answer_c,
            data.answer_d,
            data.correct_answer,
            data.difficulty,
            id
        ]);

        if (result.changes === 0) return null;

        return await get("SELECT * FROM questions WHERE id = ?", [id]);
    },
    deleteQuestion: async (id) => {
        const result = await run("DELETE FROM questions WHERE id = ?", [id]);
        return result.changes > 0;
    },

    // Leaderboard
    addToLeaderboard: async (entry) => {
        // entry: user_id, subject_id, score
        // timestamp is auto
        const result = await run(
            "INSERT INTO leaderboard (user_id, subject_id, score) VALUES (?, ?, ?)",
            [entry.user_id, entry.subject_id, entry.score]
        );
        return { id: result.id, ...entry };
    },
    getGlobalLeaderboard: async () => {
        console.log("DB: Executing getGlobalLeaderboard query...");
        const res = await all(`
            SELECT u.name, SUM(l.score) as total_score
            FROM leaderboard l
            JOIN users u ON l.user_id = u.id
            GROUP BY u.id
            ORDER BY total_score DESC
        `);
        console.log("DB: getGlobalLeaderboard result count:", res.length);
        return res;
    },

    // Game History
    saveGameAnswers: async (leaderboardId, answers) => {
        // answers: [{ question_id, selected_answer, is_correct }]
        for (const ans of answers) {
            await run(
                "INSERT INTO game_answers (leaderboard_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)",
                [leaderboardId, ans.question_id, ans.selected_answer, ans.is_correct]
            );
        }
    },

    getUserGames: async (userId) => {
        return await all(`
            SELECT l.id, l.score, l.timestamp, s.name as subject_name
            FROM leaderboard l
            JOIN subjects s ON l.subject_id = s.id
            WHERE l.user_id = ?
            ORDER BY l.timestamp DESC
        `, [userId]);
    },

    getGameDetails: async (gameId) => {
        return await all(`
            SELECT ga.*, q.content, q.correct_answer, q.answer_a, q.answer_b, q.answer_c, q.answer_d, q.difficulty
            FROM game_answers ga
            JOIN questions q ON ga.question_id = q.id
            WHERE ga.leaderboard_id = ?
        `, [gameId]);
    }
};
