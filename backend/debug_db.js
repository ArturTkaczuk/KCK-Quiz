const db = require('./db');

async function test() {
    console.log('Testing DB Adapter...');
    try {
        const subjects = await db.getSubjects();
        console.log('All Subjects:', subjects.map(s => s.slug));

        const slug = 'matematyka';
        const subject = await db.getSubjectBySlug(slug);
        console.log(`Lookup for '${slug}':`, subject);

        if (!subject) console.error('FAIL: Subject not found via Adapter');
        else console.log('SUCCESS: Subject found');

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
