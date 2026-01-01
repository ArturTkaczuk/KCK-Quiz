const db = require('../db');

async function seedLeaderboard() {
    console.log('Seeding leaderboard data...');

    try {
        const users = await db.getAllUsers();
        const subjects = await db.getSubjects();

        if (users.length === 0 || subjects.length === 0) {
            console.log('No users or subjects found. Cannot seed leaderboard.');
            return;
        }

        console.log(`Found ${users.length} users and ${subjects.length} subjects.`);

        // Generate some random scores
        for (const user of users) {
            // Each user plays 1-5 random games
            const gamesCount = Math.floor(Math.random() * 5) + 1;

            for (let i = 0; i < gamesCount; i++) {
                // Pick random subject
                const subject = subjects[Math.floor(Math.random() * subjects.length)];
                // Random score (e.g. between 0 and 12 questions * 100 points? Or money?)
                // Game logic usually returns money index or similar. 
                // Let's assume score is money values like 1000, 40000, etc. or just 0-12
                // The leaderboard schema stores 'score' as integer.
                // Let's give random "money" scores for fun.
                const scores = [0, 500, 1000, 2000, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 500000, 1000000];
                const score = scores[Math.floor(Math.random() * scores.length)];

                await db.addToLeaderboard({
                    user_id: user.id,
                    subject_id: subject.id,
                    score: score
                });
            }
        }

        console.log('Leaderboard seeding completed successfully.');

    } catch (err) {
        console.error('Error seeding leaderboard:', err);
    }
}

seedLeaderboard();
