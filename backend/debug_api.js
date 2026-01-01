
async function test() {
    try {
        console.log('Fetching questions for /matematyka...');
        const res = await fetch('http://localhost:5000/api/subjects/matematyka/questions/game', {
            headers: { 'Cookie': 'User=265123' },
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
