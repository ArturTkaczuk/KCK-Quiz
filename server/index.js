const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const DB_FILE = path.join(__dirname, 'data.json');

// --- Pamięć podręczna (State) ---
let activeRooms = {}; // Klucz: roomCode, Wartość: Obiekt pokoju

// --- Helpery Bazy Danych ---
async function readDB() {
  if (!fs.existsSync(DB_FILE)) await fs.writeJson(DB_FILE, { quizzes: [], history: [] });
  return await fs.readJson(DB_FILE);
}
async function writeDB(data) {
  await fs.writeJson(DB_FILE, data, { spaces: 2 });
}

// --- Helpery Gry ---
function getPublicRooms() {
  // Zwraca listę pokoi, które są w fazie LOBBY (czekają na graczy)
  return Object.values(activeRooms)
    .filter(r => r.status === 'LOBBY')
    .map(r => ({
      roomCode: r.roomCode,
      quizTitle: r.quiz.title,
      lecturerName: r.lecturerName,
      playersCount: r.players.length
    }));
}

function broadcastRoomList() {
  // Wysyła aktualną listę pokoi do wszystkich podłączonych klientów
  io.emit('rooms_list_update', getPublicRooms());
}

// --- REST API ---
app.get('/api/quizzes', async (req, res) => {
  const db = await readDB();
  res.json(db.quizzes);
});

app.post('/api/quizzes', async (req, res) => {
  const db = await readDB();
  const newQuiz = { id: Date.now().toString(), ...req.body };
  db.quizzes.push(newQuiz);
  await writeDB(db);
  res.json(newQuiz);
});

app.get('/api/history/:indexNumber', async (req, res) => {
  const db = await readDB();
  const studentHistory = db.history.filter(h => h.studentIndex === req.params.indexNumber);
  res.json(studentHistory);
});

// --- SOCKET.IO LOGIC ---

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Na starcie wyślij listę dostępnych pokoi
  socket.emit('rooms_list_update', getPublicRooms());

  // Wykładowca tworzy pokój
  socket.on('create_room', async ({ quizId, lecturerName }) => {
    const db = await readDB();
    const quiz = db.quizzes.find(q => q.id === quizId);
    
    if (!quiz) return;

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    activeRooms[roomCode] = {
      roomCode,
      quiz,
      lecturerId: socket.id,
      lecturerName,
      status: 'LOBBY',
      currentQuestionIndex: -1,
      players: [],
      answersCount: 0
    };

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, quizTitle: quiz.title });
    
    // Aktualizuj listę pokoi dla wszystkich (doszedł nowy pokój)
    broadcastRoomList();
  });

  // Student dołącza
  socket.on('join_room', ({ roomCode, studentIndex }) => {
    const room = activeRooms[roomCode];
    if (room && room.status === 'LOBBY') {
      const existingPlayer = room.players.find(p => p.name === studentIndex);
      if(existingPlayer) {
          socket.emit('error_msg', 'Taki indeks już jest w pokoju!');
          return;
      }

      room.players.push({
        socketId: socket.id,
        name: studentIndex,
        score: 0
      });
      socket.join(roomCode);
      
      socket.emit('joined_successfully', { roomCode, quizTitle: room.quiz.title });
      io.to(room.lecturerId).emit('update_players', room.players);

      // Aktualizuj listę (zmieniła się liczba graczy)
      broadcastRoomList();
    } else {
      socket.emit('error_msg', 'Pokój nie istnieje lub gra już trwa.');
      socket.emit('rooms_list_update', getPublicRooms()); // Odśwież widok studenta
    }
  });

  // Kickowanie gracza
  socket.on('kick_player', ({ roomCode, socketIdToKick }) => {
      const room = activeRooms[roomCode];
      if(room) {
          room.players = room.players.filter(p => p.socketId !== socketIdToKick);
          io.to(socketIdToKick).emit('kicked');
          io.sockets.sockets.get(socketIdToKick)?.leave(roomCode);
          io.to(room.lecturerId).emit('update_players', room.players);
          
          broadcastRoomList(); // Update liczznika graczy
      }
  });

  // Start Gry
  socket.on('start_game', ({ roomCode }) => {
    const room = activeRooms[roomCode];
    if (room) {
      room.status = 'GAME';
      room.currentQuestionIndex = -1;
      io.to(roomCode).emit('game_started');
      
      broadcastRoomList(); // Pokój znika z listy (bo status != LOBBY)
      
      nextQuestion(roomCode);
    }
  });

  socket.on('next_question', ({ roomCode }) => {
    nextQuestion(roomCode);
  });

  // Obsługa odpowiedzi
  socket.on('submit_answer', ({ roomCode, answerIndex }) => {
    const room = activeRooms[roomCode];
    if (!room || room.status !== 'GAME') return;

    const player = room.players.find(p => p.socketId === socket.id);
    const question = room.quiz.questions[room.currentQuestionIndex];

    if (player && question) {
      const isCorrect = answerIndex === question.correctIndex;
      if (isCorrect) player.score += 10;

      room.answersCount++;
      
      socket.emit('answer_result', { isCorrect });
      
      io.to(room.lecturerId).emit('live_stats', {
          answered: room.answersCount,
          total: room.players.length,
          leaderboard: room.players.sort((a,b) => b.score - a.score)
      });
    }
  });

  socket.on('disconnect', () => {
    // Prosta obsługa - jeśli to host, pokój może "wisieć" do restartu serwera w MVP
    // Jeśli to gracz, nie usuwamy go z tablicy w trakcie gry, żeby nie psuć statystyk
  });
});

// Funkcje logiki gry (poza scope connection, ale z dostępem do io)
function nextQuestion(roomCode) {
    const room = activeRooms[roomCode];
    if (!room) return;

    room.currentQuestionIndex++;
    room.answersCount = 0;

    if (room.currentQuestionIndex < room.quiz.questions.length) {
      const question = room.quiz.questions[room.currentQuestionIndex];
      const questionPayload = {
        text: question.text,
        options: question.options,
        totalQuestions: room.quiz.questions.length,
        currentNumber: room.currentQuestionIndex + 1
      };
      io.to(roomCode).emit('new_question', questionPayload);
    } else {
      finishGame(roomCode);
    }
}

async function finishGame(roomCode) {
    const room = activeRooms[roomCode];
    if (!room) return;

    room.status = 'FINISHED';
    
    const db = await readDB();
    const date = new Date().toISOString();
    room.players.forEach(p => {
        db.history.push({
            studentIndex: p.name,
            quizTitle: room.quiz.title,
            score: p.score,
            date: date
        });
    });
    await writeDB(db);

    io.to(roomCode).emit('game_over', {
        leaderboard: room.players.sort((a, b) => b.score - a.score)
    });
    
    delete activeRooms[roomCode];
    // Po usunięciu pokoju nie trzeba broadcastować, bo i tak miał status FINISHED (niewidoczny)
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});