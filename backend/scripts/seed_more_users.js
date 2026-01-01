const db = require('../db');

async function seedUsers() {
    console.log('Seeding additional users...');

    const newUsers = [
        { id: '265124', name: 'Student 2', role: 'student' },
        { id: '265125', name: 'Student 3', role: 'student' },
        { id: '265126', name: 'Student 4', role: 'student' },
        { id: 'Lecturer 2', name: 'Lecturer 2', role: 'admin' },
        { id: 'Lecturer 3', name: 'Lecturer 3', role: 'admin' },
        { id: 'Lecturer 4', name: 'Lecturer 4', role: 'admin' }
    ];

    try {
        for (const user of newUsers) {
            // Check if exists
            const existing = await db.getUserById(user.id);
            if (!existing) {
                await db.createUser(user.id, user.name, user.role);
                console.log(`User ${user.name} (${user.id}) added.`);
            } else {
                console.log(`User ${user.name} (${user.id}) already exists.`);
            }
        }
        console.log('User seeding completed.');
    } catch (err) {
        console.error('Error seeding users:', err);
    }
}

seedUsers();
