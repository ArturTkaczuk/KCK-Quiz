const db = require('../db');

async function verify() {
    try {
        console.log('Verifying Leaderboard Data...');
        const entries = await db.getGlobalLeaderboard();
        console.log(`Found ${entries.length} entries.`);
        if (entries.length > 0) {
            console.log('Top 3:', entries.slice(0, 3));
        } else {
            console.log('Leaderboard is EMPTY.');

            // Check raw count
            const raw = await db.all("SELECT count(*) as count FROM leaderboard");
            console.log('Raw leaderboard count:', raw[0].count);
        }
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
