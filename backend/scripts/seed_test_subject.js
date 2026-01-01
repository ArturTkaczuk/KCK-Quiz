const db = require('../db');

async function seedTest() {
    console.log('Seeding "Test" subject...');

    try {
        // 1. Create Subject
        let subject = await db.getSubjectBySlug('test');
        if (!subject) {
            console.log('Creating subject "Test"...');
            subject = await db.createSubject('Test', 'test');
        } else {
            console.log('Subject "Test" already exists (ID: ' + subject.id + ').');
        }

        // 2. Clear existing questions for this subject to avoid duplicates if run multiple times
        // db.js doesn't have deleteQuestionsBySubjectId exposed directly, but we can just add new ones.
        // Or we can delete the subject and recreate it? 
        // Let's just add them. If they exist, it's fine for testing.
        // Actually, deleting the subject deletes questions via CASCADE if configured, 
        // check db.js migrations?
        // migrate_to_sqlite.js used:
        // "FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE"
        // So deleting the subject clears questions.

        // Let's delete and recreate to be clean.
        await db.deleteSubject(subject.id);
        subject = await db.createSubject('Test', 'test');

        console.log('Subject "Test" created/reset with ID:', subject.id);

        // 3. Add Questions (3 per difficulty 1-4)
        const questions = [];

        for (let diff = 1; diff <= 4; diff++) {
            for (let i = 1; i <= 3; i++) {
                questions.push({
                    subject_id: subject.id,
                    content: `Test Question Diff ${diff} - #${i} (Answer is A)`,
                    answer_a: "Correct Answer A",
                    answer_b: "Wrong B",
                    answer_c: "Wrong C",
                    answer_d: "Wrong D",
                    correct_answer: "A",
                    difficulty: diff
                });
            }
        }

        for (const q of questions) {
            await db.createQuestion(q);
        }

        console.log(`Successfully added ${questions.length} questions to "Test" subject.`);

    } catch (err) {
        console.error('Error seeding test data:', err);
    }
}

seedTest();
