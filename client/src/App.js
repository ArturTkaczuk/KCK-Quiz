import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Container, Card, Button, Form, Alert, ListGroup, Badge, Row, Col } from 'react-bootstrap';

// Połączenie z serwerem
const socket = io.connect("http://localhost:3001");
const API_URL = "http://localhost:3001/api";

function App() {
  const [user, setUser] = useState({ role: null, id: '' });
  const [view, setView] = useState('LOGIN'); 
  
  // POPRAWKA: Stan roomCode przeniesiony tutaj, aby nie zginął przy zmianie widoku
  const [currentRoomCode, setCurrentRoomCode] = useState(null);

  const handleLogin = (role, id) => {
    if (!id) return alert("Podaj identyfikator!");
    setUser({ role, id });
    setView('DASHBOARD');
  };

  return (
    <Container className="mt-3" style={{ maxWidth: '600px' }}>
      <header className="mb-4 text-center">
        <h2 className="text-danger fw-bold">Quiz PŁ <Badge bg="secondary">MVP</Badge></h2>
      </header>
      
      {view === 'LOGIN' && <LoginView onLogin={handleLogin} />}
      
      {/* Przekazujemy funkcję setCurrentRoomCode do dashboardów */}
      {view === 'DASHBOARD' && user.role === 'student' && 
        <StudentDashboard 
            user={user} 
            setView={setView} 
            socket={socket} 
            setRoomCode={setCurrentRoomCode} 
        />
      }
      
      {view === 'DASHBOARD' && user.role === 'lecturer' && 
        <LecturerDashboard 
            user={user} 
            setView={setView} 
            socket={socket}
            setRoomCode={setCurrentRoomCode}
        />
      }

      {/* Przekazujemy zapamiętany roomCode do GameRoom */}
      {(view === 'LOBBY' || view === 'GAME' || view === 'SUMMARY') && 
        <GameRoom 
            user={user} 
            view={view} 
            setView={setView} 
            socket={socket} 
            roomCode={currentRoomCode} 
        />
      }
    </Container>
  );
}

// --- KOMPONENTY WIDOKÓW ---

const LoginView = ({ onLogin }) => {
  const [role, setRole] = useState('student');
  const [val, setVal] = useState('');

  return (
    <Card className="p-4 shadow-sm">
      <h4 className="mb-3">Wybierz rolę</h4>
      <div className="d-flex gap-2 mb-3">
        <Button variant={role === 'student' ? 'primary' : 'outline-primary'} onClick={() => setRole('student')} className="flex-fill">Student</Button>
        <Button variant={role === 'lecturer' ? 'danger' : 'outline-danger'} onClick={() => setRole('lecturer')} className="flex-fill">Wykładowca</Button>
      </div>
      <Form.Control 
        placeholder={role === 'student' ? "Nr Indeksu (np. 123456)" : "Imię i Nazwisko"} 
        value={val} onChange={e => setVal(e.target.value)} 
        className="mb-3"
      />
      <Button size="lg" className="w-100" onClick={() => onLogin(role, val)}>Wejdź</Button>
    </Card>
  );
};

const StudentDashboard = ({ user, setView, socket, setRoomCode }) => {
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Pobierz historię
    axios.get(`${API_URL}/history/${user.id}`).then(res => setHistory(res.data));
    
    // Lista pokoi
    socket.on('rooms_list_update', (updatedList) => {
        setRooms(updatedList);
    });

    // POPRAWKA: Odbieramy kod i ustawiamy go w App.js
    socket.on('joined_successfully', ({ roomCode }) => {
        setRoomCode(roomCode);
        setView('LOBBY');
    });

    socket.on('error_msg', (msg) => alert(msg));
    
    return () => {
        socket.off('rooms_list_update');
        socket.off('joined_successfully');
        socket.off('error_msg');
    };
  }, [setRoomCode, setView, socket, user.id]);

  const joinRoom = (roomCode) => {
    socket.emit('join_room', { roomCode, studentIndex: user.id });
  };

  return (
    <div>
      <h4 className="mb-3">Dostępne Quizy (Lobby)</h4>
      
      {rooms.length === 0 ? (
        <Alert variant="secondary" className="text-center py-4">
          Brak aktywnych pokoi.<br/>
          <small>Poczekaj, aż wykładowca uruchomi quiz.</small>
          <div className="mt-2 spinner-grow spinner-grow-sm text-secondary" role="status"/>
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-2 mb-4">
            {rooms.map((room) => (
                <Card key={room.roomCode} className="shadow-sm border-start border-4 border-primary">
                    <Card.Body className="d-flex justify-content-between align-items-center p-3">
                        <div>
                            <h5 className="mb-1 fw-bold text-primary">{room.quizTitle}</h5>
                            <div className="text-muted small">
                                Prowadzący: {room.lecturerName}
                            </div>
                        </div>
                        <div className="text-end">
                             <Badge bg="info" className="mb-2 d-block">
                                 Graczy: {room.playersCount}
                             </Badge>
                             <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => joinRoom(room.roomCode)}
                             >
                                DOŁĄCZ &gt;
                             </Button>
                        </div>
                    </Card.Body>
                </Card>
            ))}
        </div>
      )}
      
      <hr />
      
      <h5>Twoja Historia</h5>
      <ListGroup className="mb-4">
        {history.map((h, i) => (
            <ListGroup.Item key={i} className="d-flex justify-content-between">
                <span>{h.quizTitle}</span>
                <Badge bg="secondary">{h.score} pkt</Badge>
            </ListGroup.Item>
        ))}
        {history.length === 0 && <p className="text-muted small">Brak wyników.</p>}
      </ListGroup>
    </div>
  );
};

const LecturerDashboard = ({ user, setView, socket, setRoomCode }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/quizzes`).then(res => setQuizzes(res.data));
    
    // POPRAWKA: Odbieramy kod pokoju i przekazujemy do App.js
    socket.on('room_created', ({ roomCode }) => {
        setRoomCode(roomCode);
        setView('LOBBY');
    });

    return () => socket.off('room_created');
  }, [setRoomCode, setView, socket]);

  const createRoom = (quizId) => {
    socket.emit('create_room', { quizId, lecturerName: user.id });
  };

  return (
    <div>
      <h4 className="mb-3">Dostępne Quizy</h4>
      {quizzes.map(q => (
        <Card key={q.id} className="mb-2">
            <Card.Body className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">{q.title}</span>
                <Button variant="success" size="sm" onClick={() => createRoom(q.id)}>Uruchom</Button>
            </Card.Body>
        </Card>
      ))}
    </div>
  );
};

const GameRoom = ({ user, view, setView, socket, roomCode }) => {
  const [roomData, setRoomData] = useState({ 
      players: [], 
      question: null, 
      leaderboard: [],
      answeredCount: 0 
  });
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // --- Listenerzy ---
    socket.on('update_players', (players) => setRoomData(prev => ({ ...prev, players })));
    socket.on('kicked', () => { alert("Zostałeś wyrzucony!"); window.location.reload(); });
    
    socket.on('game_started', () => setView('GAME'));
    
    socket.on('new_question', (q) => {
        setRoomData(prev => ({ ...prev, question: q }));
        setFeedback(null);
    });

    socket.on('answer_result', ({ isCorrect }) => {
        setFeedback(isCorrect ? 'correct' : 'wrong');
    });

    socket.on('live_stats', (stats) => {
        setRoomData(prev => ({ ...prev, leaderboard: stats.leaderboard, answeredCount: stats.answered }));
    });

    socket.on('game_over', ({ leaderboard }) => {
        setRoomData(prev => ({ ...prev, leaderboard }));
        setView('SUMMARY');
    });

    return () => {
        socket.off('update_players');
        socket.off('new_question');
        socket.off('game_started');
        socket.off('game_over');
        socket.off('live_stats');
    };
  }, [setView, socket]);

  if (view === 'LOBBY') {
    return (
      <div className="text-center">
        <h1 className="display-4 fw-bold text-primary">{roomCode}</h1>
        <p className="text-muted">Kod pokoju</p>
        <hr />
        <h5>Gracze w lobby ({roomData.players?.length || 0}):</h5>
        <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
            {roomData.players?.map(p => (
                <Badge key={p.socketId} bg="secondary" className="p-2">
                    {p.name} 
                    {user.role === 'lecturer' && 
                        <span style={{cursor:'pointer', marginLeft:'5px'}} onClick={() => socket.emit('kick_player', {roomCode: roomCode, socketIdToKick: p.socketId})}>×</span>
                    }
                </Badge>
            ))}
        </div>
        
        {user.role === 'lecturer' ? (
            <Button 
                size="lg" 
                variant="success" 
                // TERAZ UŻYWAMY POPRAWNEGO KODU POKOJU Z PROPSÓW
                onClick={() => socket.emit('start_game', { roomCode })}
            >
                START GRY
            </Button>
        ) : (
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        )}
      </div>
    );
  }

  if (view === 'GAME' && roomData.question) {
    return (
      <div>
        <div className="d-flex justify-content-between mb-3">
            <span>Pytanie {roomData.question.currentNumber}/{roomData.question.totalQuestions}</span>
            {user.role === 'lecturer' && <Badge bg="warning" text="dark">Admin View</Badge>}
        </div>
        <h3 className="mb-4 text-center">{roomData.question.text}</h3>

        {user.role === 'student' && (
            feedback ? (
                <Alert variant={feedback === 'correct' ? 'success' : 'danger'} className="text-center">
                    {feedback === 'correct' ? "DOBRZE! +10pkt" : "BŁĄD!"}
                </Alert>
            ) : (
                <Row className="g-2">
                    {roomData.question.options.map((opt, idx) => (
                        <Col xs={6} key={idx}>
                            <Button variant="outline-primary" className="w-100 py-4" onClick={() => socket.emit('submit_answer', { roomCode: roomCode, answerIndex: idx })}>
                                {opt}
                            </Button>
                        </Col>
                    ))}
                </Row>
            )
        )}

        {user.role === 'lecturer' && (
            <div className="text-center">
                <p>Odpowiedziało: {roomData.answeredCount || 0} / {roomData.players.length}</p>
                <Button variant="primary" onClick={() => socket.emit('next_question', { roomCode: roomCode })}>
                    Następne Pytanie &gt;&gt;
                </Button>
                
                <h6 className="mt-4">Live Ranking:</h6>
                <ListGroup variant="flush">
                    {roomData.leaderboard?.slice(0, 3).map((p, i) => (
                         <ListGroup.Item key={i}>{i+1}. {p.name} ({p.score} pkt)</ListGroup.Item>
                    ))}
                </ListGroup>
            </div>
        )}
      </div>
    );
  }

  if (view === 'SUMMARY') {
      return (
          <div className="text-center">
              <h2>Koniec Gry! 🏁</h2>
              <h4 className="mt-4">Wyniki:</h4>
              <ListGroup className="mt-3 text-start">
                  {roomData.leaderboard?.map((p, i) => (
                      <ListGroup.Item key={i} variant={i===0 ? 'warning' : ''}>
                          <strong>#{i+1} {p.name}</strong> - {p.score} pkt
                      </ListGroup.Item>
                  ))}
              </ListGroup>
              <Button className="mt-4" onClick={() => window.location.reload()}>Powrót do menu</Button>
          </div>
      )
  }

  return <div>Ładowanie...</div>;
};

export default App;