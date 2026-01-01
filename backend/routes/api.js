const express = require('express');
const router = express.Router();
const db = require('../db');
const { checkAuth, requireAdmin } = require('../middleware/auth');

// Apply Auth Middleware selectively
// router.use(checkAuth); // Removed global auth to allow public access to subjects

// GET /me (Protected)
router.get('/me', checkAuth, (req, res) => {
    res.json(req.user);
});

// === SUBJECTS ===
// Public endpoint for listing subjects
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await db.getSubjects();
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/subjects', checkAuth, requireAdmin, async (req, res) => {
    const { name, slug } = req.body;
    try {
        await db.createSubject(name, slug);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/subjects/:id', checkAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await db.deleteSubject(id);
        if (!deleted) return res.status(404).json({ error: 'Subject not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === QUESTIONS (Admin) ===
router.get('/subjects/:slug/questions', checkAuth, requireAdmin, async (req, res) => {
    const { slug } = req.params;
    try {
        const subject = await db.getSubjectBySlug(slug);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const questions = await db.getQuestionsBySubjectId(subject.id);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/subjects/:slug/questions', checkAuth, requireAdmin, async (req, res) => {
    const { slug } = req.params;
    const { content, answers, correct_answer, difficulty } = req.body;

    try {
        console.log('DEBUG: Creating question. Slug:', slug);
        console.log('DEBUG: Body:', JSON.stringify(req.body));
        const subject = await db.getSubjectBySlug(slug);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        await db.createQuestion({
            subject_id: subject.id,
            content,
            answer_a: answers.A,
            answer_b: answers.B,
            answer_c: answers.C,
            answer_d: answers.D,
            correct_answer,
            difficulty
        });

        res.json({ success: true });
    } catch (err) {
        console.error('DEBUG: Error in create question:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/subjects/:slug/questions/import', checkAuth, requireAdmin, async (req, res) => {
    const { slug } = req.params;
    const questions = req.body;

    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Invalid format' });

    try {
        const subject = await db.getSubjectBySlug(slug);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        for (const q of questions) {
            await db.createQuestion({
                subject_id: subject.id,
                content: q.content,
                answer_a: q.answers.A,
                answer_b: q.answers.B,
                answer_c: q.answers.C,
                answer_d: q.answers.D,
                correct_answer: q.correct,
                difficulty: q.difficulty
            });
        }

        res.json({ success: true, count: questions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === GAME ===
router.get('/subjects/:slug/questions/game', checkAuth, async (req, res) => {
    const { slug } = req.params;
    console.log(`DEBUG: Fetching game for slug: '${slug}'`);
    try {
        const subject = await db.getSubjectBySlug(slug);
        console.log(`DEBUG: Found subject:`, subject);

        if (!subject) {
            const all = await db.getSubjects();
            console.log(`DEBUG: Lookup failed. Available slugs: ${all.map(s => s.slug).join(', ')}`);
            return res.status(404).json({ error: `Subject not found: ${slug}` });
        }

        // Fetch 3 questions of each difficulty
        const gameQuestions = [];
        for (let diff = 1; diff <= 4; diff++) {
            const questions = await db.getQuestionsBySubjectIdAndDifficulty(subject.id, diff);

            // Randomize and pick 3
            const shuffled = questions.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);

            if (selected.length < 3) {
                return res.status(400).json({ error: `Not enough questions for difficulty ${diff} (Only ${selected.length}/3)` });
            }
            gameQuestions.push(...selected);
        }

        res.json(gameQuestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/game/submit', checkAuth, async (req, res) => {
    const { subject_slug, score, answers } = req.body;
    const userId = req.user.id;

    try {
        const subject = await db.getSubjectBySlug(subject_slug);
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const leaderboardEntry = await db.addToLeaderboard({
            user_id: userId,
            subject_id: subject.id,
            score
        });

        // Save history if answers provided
        if (answers && Array.isArray(answers)) {
            await db.saveGameAnswers(leaderboardEntry.id, answers);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === LEADERBOARD ===
router.get('/leaderboard', checkAuth, async (req, res) => {
    try {
        const leaderboard = await db.getGlobalLeaderboard();
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === HISTORY ===
router.get('/history', checkAuth, async (req, res) => {
    try {
        const games = await db.getUserGames(req.user.id);
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/history/:gameId', checkAuth, async (req, res) => {
    try {
        const gameId = req.params.gameId;
        // Should really verify ownership here or only allow if admin, 
        // but for now checkAuth covers basic valid user.
        // TODO: Access control (only own games or admin)

        const details = await db.getGameDetails(gameId);
        res.json(details);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /questions/:id
router.put('/questions/:id', checkAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { content, answers, correct_answer, difficulty } = req.body;

    try {
        const updated = await db.updateQuestion(id, {
            content,
            answer_a: answers.A,
            answer_b: answers.B,
            answer_c: answers.C,
            answer_d: answers.D,
            correct_answer,
            difficulty
        });

        if (!updated) return res.status(404).json({ error: 'Question not found' });
        res.json({ success: true, question: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /questions/:id
router.delete('/questions/:id', checkAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await db.deleteQuestion(id);
        if (!deleted) return res.status(404).json({ error: 'Question not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
