
'use client';
import { useState, useEffect, createContext, useContext } from 'react';
// We will not use firebase directly, but let's keep the project structure
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, addDoc, updateDoc } from 'firebase/firestore';

// Lucide React icons for a cleaner look
import { Users, Ticket, Gift, Home, Plus, List, LogOut, CheckCheck, XCircle, ChevronLeft, Award } from 'lucide-react';

// Mock Firebase for demonstration without real backend
const mockAuth = {
    onAuthStateChanged: (callback) => {
        // Simulate a logged-in user for demonstration
        setTimeout(() => callback({ uid: 'mockUserId' }), 1000);
        return () => {}; // Unsubscribe function
    },
    signOut: () => Promise.resolve(),
    signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'mockUserId' } }),
    createUserWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'mockUserId' } }),
};

const mockDb = {
    collection: () => {},
    doc: () => {},
    onSnapshot: (ref, callback) => {
        if (ref.path?.includes('raffles')) {
            const rafflesData = [
                { id: 'raffle2', name: 'Rifa Tecnológica', price: 10, totalTickets: 100, tickets: Array.from({length: 100}, (_, i) => ({number: i+1, isSold: Math.random() > 0.5, ownerId: Math.random() > 0.5 ? `user${i}`: null, ownerName: `User ${i}`})), status: 'open', winner: null },
                { id: 'raffle3', name: 'Premio Final', price: 20, totalTickets: 25, tickets: Array.from({length: 25}, (_, i) => ({number: i+1, isSold: true, ownerId: `user${i}`, ownerName: `User ${i}`})), status: 'closed', winner: {number: 17, ownerName: 'Ganador X'} },
            ];
            const snapshot = { docs: rafflesData.map(d => ({ id: d.id, data: () => d })) };
            callback(snapshot);
        }
         if (ref.path?.includes('profile')) {
            callback({ exists: () => true, data: () => ({ name: 'Usuario Demo', role: 'admin' }) });
        }
        return () => {}; // Unsubscribe
    },
    updateDoc: () => Promise.resolve(),
    addDoc: () => Promise.resolve(),
    getDoc: (ref) => {
       if (ref.path?.includes('raffles')) {
            const raffleData = { name: 'Rifa Tecnológica', price: 10, totalTickets: 100, tickets: Array.from({length: 100}, (_, i) => ({number: i+1, isSold: Math.random() > 0.5, ownerId: `user${i}`, ownerName: `User ${i}`})), status: 'open', winner: null };
            return Promise.resolve({ exists: () => true, data: () => raffleData });
        }
        return Promise.resolve({exists: () => false});
    },
    setDoc: () => Promise.resolve(),
};


// Context to provide Firebase and user data throughout the app
const AppContext = createContext(null);

// Main application component
export default function App() {
    const [authReady, setAuthReady] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [view, setView] = useState('login'); // 'login', 'register', 'raffles'
    const [userDisplayName, setUserDisplayName] = useState('');

    useEffect(() => {
        const initFirebase = async () => {
            try {
                // Simulate Firebase initialization
                const firestoreDb = mockDb;
                const firebaseAuth = mockAuth;

                setDb(firestoreDb);
                setAuth(firebaseAuth);

                const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
                    if (user) {
                        setUserId(user.uid);
                        const userDocRef = { path: `/artifacts/appId/users/${user.uid}/private/profile` }; // Mock ref
                        firestoreDb.onSnapshot(userDocRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const data = docSnap.data();
                                setUserDisplayName(data.name || 'Usuario');
                            }
                        });
                    } else {
                        setUserId(null);
                        setUserDisplayName('');
                    }
                    setAuthReady(true);
                    setIsAuthenticating(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setIsAuthenticating(false);
            }
        };

        initFirebase();
    }, []);

    if (isAuthenticating) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-950">
                <div className="text-xl text-gray-200 animate-pulse">Cargando...</div>
            </div>
        );
    }

    const value = { db, auth, userId, authReady, setView, userDisplayName, setUserDisplayName };

    return (
        <AppContext.Provider value={value}>
            <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-4 md:p-8">
                {userId ? (
                    <MainApp />
                ) : (
                    <Auth view={view} setView={setView} />
                )}
            </div>
        </AppContext.Provider>
    );
}

// Auth components for login and registration
function Auth({ view, setView }) {
    const { auth } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            // In a real app, you would use the real user object and db reference.
            // await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/private/profile`), {
            //     name: name,
            //     email: email,
            //     uid: user.uid
            // });
            setView('raffles');
        } catch (err) {
            console.error("Error al registrarse:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await auth.signInWithEmailAndPassword(email, password);
            setView('raffles');
        } catch (err) {
            console.error("Error al iniciar sesión:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
            <div className="w-full max-w-md bg-gray-800 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-8 md:p-10 space-y-8">
                <h1 className="text-4xl font-extrabold text-center text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse-slow">
                    {view === 'login' ? 'Bienvenido' : 'Únete a la Rifa'}
                </h1>
                {error && <div className="p-3 text-sm text-red-300 bg-red-900 rounded-xl text-center shadow-md">{error}</div>}
                
                {view === 'register' ? (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <input
                            type="text"
                            placeholder="Tu Nombre"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-inner"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-inner"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Contraseña Segura"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-inner"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full p-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                            disabled={loading}
                        >
                            {loading ? 'Registrando...' : 'Crear Cuenta'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-inner"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-inner"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full p-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                            disabled={loading}
                        >
                            {loading ? 'Iniciando Sesión...' : 'Entrar'}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm text-gray-400">
                    {view === 'login' ? (
                        <>
                            ¿No tienes cuenta?{' '}
                            <button onClick={() => setView('register')} className="font-semibold text-pink-400 hover:underline transition-colors duration-300">
                                Regístrate aquí
                            </button>
                        </>
                    ) : (
                        <>
                            ¿Ya tienes cuenta?{' '}
                            <button onClick={() => setView('login')} className="font-semibold text-pink-400 hover:underline transition-colors duration-300">
                                Inicia sesión
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

// Main application components after login
function MainApp() {
    const { auth, db, userId, setView, userDisplayName } = useContext(AppContext);
    const [raffles, setRaffles] = useState([]);
    const [isCreatingRaffle, setIsCreatingRaffle] = useState(false);
    const [isShowingMyTickets, setIsShowingMyTickets] = useState(false);
    const [newRaffleName, setNewRaffleName] = useState('');
    const [newRafflePrice, setNewRafflePrice] = useState(10);
    const [newRaffleTotalTickets, setNewRaffleTotalTickets] = useState(100);
    const [currentRaffleId, setCurrentRaffleId] = useState(null);
    const [raffleDetails, setRaffleDetails] = useState(null);
    const [message, setMessage] = useState('');
    const [isMessageVisible, setIsMessageVisible] = useState(false);

    useEffect(() => {
        if (!db || !userId) return;

        const rafflesQuery = { path: `/artifacts/appId/public/data/raffles` };
        const unsubscribeRaffles = db.onSnapshot(rafflesQuery, (snapshot) => {
            const rafflesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRaffles(rafflesData);
        }, (error) => {
            console.error("Error fetching raffles:", error);
        });

        return () => {
            unsubscribeRaffles();
        };
    }, [db, userId]);

    const showMessage = (text) => {
        setMessage(text);
        setIsMessageVisible(true);
        setTimeout(() => setIsMessageVisible(false), 3000);
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setView('login');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    const handleCreateRaffle = async (e) => {
        e.preventDefault();
        try {
            showMessage('Rifa creada exitosamente (simulado).');
            setNewRaffleName('');
            setNewRafflePrice(10);
            setNewRaffleTotalTickets(100);
            setIsCreatingRaffle(false);
        } catch (error) {
            console.error("Error al crear rifa:", error);
            showMessage('Error al crear rifa.');
        }
    };

    const handleViewRaffleDetails = async (raffleId) => {
        setCurrentRaffleId(raffleId);
        const raffleDocRef = { path: `/artifacts/appId/public/data/raffles/${raffleId}`};
        const docSnap = await db.getDoc(raffleDocRef);
         if (docSnap.exists()) {
             setRaffleDetails({ id: docSnap.id, ...docSnap.data() });
         } else {
             const staticRaffle = raffles.find(r => r.id === raffleId);
             if(staticRaffle) setRaffleDetails(staticRaffle);
             else setRaffleDetails(null);
         }
    };

    const handleBuyTicket = async (ticketNumber) => {
        try {
             showMessage(`Has comprado el boleto #${ticketNumber} (simulado).`);
        } catch (error) {
            console.error("Error al comprar boleto:", error);
            showMessage('Error al comprar el boleto.');
        }
    };

    const handleSelectWinner = async () => {
        if (!raffleDetails) return;
        const soldTickets = raffleDetails.tickets.filter(t => t.isSold);
        if (soldTickets.length === 0) {
            showMessage('No hay boletos vendidos para sortear un ganador.');
            return;
        }
        const randomIndex = Math.floor(Math.random() * soldTickets.length);
        const winningTicket = soldTickets[randomIndex];
        try {
            showMessage(`¡El boleto ganador es #${winningTicket.number}! (simulado)`);
        } catch (error) {
            console.error("Error al seleccionar ganador:", error);
            showMessage('Error al seleccionar ganador.');
        }
    };

    const getUserTickets = () => {
        const myTickets = [];
        raffles.forEach(raffle => {
            const userTickets = raffle.tickets.filter(t => t.ownerId === userId || t.ownerId?.startsWith('user')); // Mock condition
            if (userTickets.length > 0) {
                myTickets.push({ raffleName: raffle.name, tickets: userTickets.slice(0, 3), winner: raffle.winner });
            }
        });
        return myTickets;
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 md:p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        App Rifa
                    </h1>
                    <span className="text-sm font-medium bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
                        <Users className="inline-block h-4 w-4 mr-1" />
                        {userDisplayName}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                        ID: {userId.substring(0, 8)}...
                    </span>
                </div>
                <nav className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            setCurrentRaffleId(null);
                            setIsShowingMyTickets(false);
                            setIsCreatingRaffle(false);
                        }}
                        className="p-2 md:px-4 md:py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        <Home className="inline-block h-4 w-4 mr-1" />
                        Rifas
                    </button>
                    <button
                        onClick={() => {
                            setCurrentRaffleId(null);
                            setIsShowingMyTickets(true);
                        }}
                        className="p-2 md:px-4 md:py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        <Ticket className="inline-block h-4 w-4 mr-1" />
                        Mis Boletos
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 md:px-4 md:py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
                    >
                        <LogOut className="inline-block h-4 w-4 mr-1" />
                        Salir
                    </button>
                </nav>
            </header>

            {isMessageVisible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-600 text-white p-4 rounded-xl shadow-xl z-50 transition-transform duration-300 transform-gpu animate-bounce-in flex items-center space-x-2">
                    <CheckCheck />
                    <span>{message}</span>
                </div>
            )}

            <div className="mt-8">
                {isShowingMyTickets ? (
                    <MyTickets getUserTickets={getUserTickets} />
                ) : (
                    currentRaffleId ? (
                        <RaffleDetails
                            raffleDetails={raffleDetails}
                            handleBuyTicket={handleBuyTicket}
                            handleSelectWinner={handleSelectWinner}
                            setCurrentRaffleId={setCurrentRaffleId}
                            userId={userId}
                        />
                    ) : (
                        <RaffleList
                            raffles={raffles}
                            handleViewRaffleDetails={handleViewRaffleDetails}
                            isCreatingRaffle={isCreatingRaffle}
                            handleCreateRaffle={handleCreateRaffle}
                            newRaffleName={newRaffleName}
                            setNewRaffleName={setNewRaffleName}
                            newRafflePrice={newRafflePrice}
                            setNewRafflePrice={setNewRafflePrice}
                            newRaffleTotalTickets={newRaffleTotalTickets}
                            setNewRaffleTotalTickets={setNewRaffleTotalTickets}
                            setIsCreatingRaffle={setIsCreatingRaffle}
                        />
                    )
                )}
            </div>
        </div>
    );
}

// Component to display the list of raffles
function RaffleList({ raffles, handleViewRaffleDetails, isCreatingRaffle, handleCreateRaffle, newRaffleName, setNewRaffleName, newRafflePrice, setNewRafflePrice, newRaffleTotalTickets, setNewRaffleTotalTickets, setIsCreatingRaffle }) {
    const { userId } = useContext(AppContext);
    const [isAdmin, setIsAdmin] = useState(false);
    const { db } = useContext(AppContext);

    useEffect(() => {
        if (!db || !userId) return;
        const userDocRef = { path: `/artifacts/appId/users/${userId}/private/profile` };
        const unsubscribe = db.onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'admin') {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, [db, userId]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Rifas Disponibles</h2>

            {isAdmin && (
                <div className="bg-purple-900/50 text-purple-200 p-4 rounded-xl shadow-inner border border-purple-800">
                    <p className="font-semibold flex items-center space-x-2">
                        <Award className="h-5 w-5 text-purple-400" />
                        <span>Nota de Administrador: Puedes crear y gestionar nuevas rifas.</span>
                    </p>
                </div>
            )}

            {isAdmin && (
                <button
                    onClick={() => setIsCreatingRaffle(!isCreatingRaffle)}
                    className="w-full p-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-700 transition-colors shadow-md transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                    <Plus />
                    <span>{isCreatingRaffle ? 'Cancelar' : 'Crear Nueva Rifa'}</span>
                </button>
            )}

            {isCreatingRaffle && isAdmin && (
                <div className="bg-gray-800 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2"><Gift /> <span>Detalles de la Nueva Rifa</span></h3>
                    <form onSubmit={handleCreateRaffle} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nombre del Premio"
                            value={newRaffleName}
                            onChange={(e) => setNewRaffleName(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Precio por boleto"
                            value={newRafflePrice}
                            onChange={(e) => setNewRafflePrice(Number(e.target.value))}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                            min="1"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Cantidad de boletos (ej. 100)"
                            value={newRaffleTotalTickets}
                            onChange={(e) => setNewRaffleTotalTickets(Number(e.target.value))}
                            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                            min="10"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full p-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 shadow-lg transform hover:scale-105"
                        >
                            Crear Rifa
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {raffles.length > 0 ? (
                    raffles.map(raffle => (
                        <div key={raffle.id} className="bg-gray-800 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between transform transition-transform duration-300 hover:scale-[1.02]">
                            <h3 className="text-2xl font-semibold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-yellow-400">{raffle.name}</h3>
                            <p className="text-md font-medium text-gray-400">Precio por boleto: <span className="text-pink-400 font-bold">${raffle.price}</span></p>
                            <p className="text-sm font-medium text-gray-500">Boletos vendidos: <span className="font-semibold text-gray-300">{raffle.tickets.filter(t => t.isSold).length}</span> de {raffle.totalTickets}</p>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(raffle.tickets.filter(t => t.isSold).length / raffle.totalTickets) * 100}%` }}></div>
                            </div>
                            <p className="text-sm font-semibold mt-4 flex items-center space-x-1">
                                <span className="text-gray-400">Estado:</span>
                                <span className={`flex items-center space-x-1 ${raffle.status === 'open' ? 'text-green-400' : 'text-red-400'}`}>
                                    {raffle.status === 'open' ? <CheckCheck size={16} /> : <XCircle size={16} />}
                                    <span>{raffle.status === 'open' ? 'Abierta' : 'Cerrada'}</span>
                                </span>
                            </p>
                            {raffle.status === 'closed' && raffle.winner && (
                                <p className="text-sm font-semibold mt-2 text-yellow-400 flex items-center space-x-1">
                                    <Award size={16} />
                                    <span>Ganador: #{raffle.winner.number}</span>
                                </p>
                            )}
                            <button
                                onClick={() => handleViewRaffleDetails(raffle.id)}
                                className="mt-4 w-full p-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                disabled={raffle.status === 'closed'}
                            >
                                {raffle.status === 'closed' ? 'Ver Ganador' : 'Ver Detalles'}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center p-8 bg-gray-800 rounded-3xl shadow-lg">
                        <p className="text-gray-400 text-xl font-medium">No hay rifas disponibles en este momento.</p>
                        {isAdmin && <p className="text-gray-500 mt-2">¡Crea una para comenzar!</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

// Component to display raffle details and buy tickets
function RaffleDetails({ raffleDetails, handleBuyTicket, handleSelectWinner, setCurrentRaffleId, userId }) {
    const { db } = useContext(AppContext);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!db || !userId) return;
        const userDocRef = { path: `/artifacts/appId/users/${userId}/private/profile` };
        const unsubscribe = db.onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === 'admin') {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, [db, userId]);

    if (!raffleDetails) {
        return <div className="text-center text-gray-400 animate-pulse">Cargando detalles de la rifa...</div>;
    }

    const soldTicketsCount = raffleDetails.tickets.filter(t => t.isSold).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => setCurrentRaffleId(null)} className="p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors shadow-lg">
                    <ChevronLeft />
                </button>
                <h2 className="text-3xl font-bold text-white">{raffleDetails.name}</h2>
            </div>

            <div className="bg-gray-800 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
                <p className="text-lg font-semibold text-white flex items-center space-x-2"><Gift /> <span>Precio por boleto: <span className="text-purple-400">${raffleDetails.price}</span></span></p>
                <p className="text-sm text-gray-400">Total de boletos: {raffleDetails.totalTickets}</p>
                <p className="text-sm text-gray-400">Boletos vendidos: <span className="font-bold text-white">{soldTicketsCount}</span></p>
                <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500" style={{ width: `${(soldTicketsCount / raffleDetails.totalTickets) * 100}%` }}></div>
                </div>
            </div>

            {isAdmin && raffleDetails.status === 'open' && (
                <div className="flex justify-center">
                    <button
                        onClick={handleSelectWinner}
                        className="bg-yellow-600 text-white p-4 rounded-xl font-semibold text-lg hover:bg-yellow-700 transition-colors shadow-lg transform hover:scale-105 flex items-center space-x-2"
                    >
                        <Award />
                        <span>Seleccionar Ganador</span>
                    </button>
                </div>
            )}
            
            {raffleDetails.status === 'closed' && raffleDetails.winner && (
                <div className="bg-green-900/50 text-green-300 p-6 rounded-3xl text-center shadow-lg border border-green-800 animate-pulse-slow">
                    <h3 className="text-2xl font-bold mb-2">¡Rifa Finalizada!</h3>
                    <p className="text-xl">El boleto ganador es: <span className="font-extrabold text-3xl text-green-400">#{raffleDetails.winner.number}</span></p>
                    <p className="text-md">Comprado por: <span className="font-bold text-green-300">{raffleDetails.winner.ownerName}</span></p>
                </div>
            )}

            <div className="bg-gray-800 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2"><List /> <span>Selecciona tu boleto</span></h3>
                <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
                    {raffleDetails.tickets.map(ticket => (
                        <button
                            key={ticket.number}
                            onClick={() => handleBuyTicket(ticket.number)}
                            disabled={ticket.isSold || raffleDetails.status === 'closed'}
                            className={`
                                p-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 transform hover:scale-110
                                ${ticket.isSold
                                    ? ticket.ownerId === userId
                                        ? 'bg-gradient-to-br from-green-500 to-green-700 text-white cursor-not-allowed shadow-inner'
                                        : 'bg-red-800 text-red-200 cursor-not-allowed'
                                    : 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white hover:shadow-md'
                                }
                                ${ticket.isSold ? '' : 'cursor-pointer'}
                            `}
                            title={ticket.isSold ? `Vendido a: ${ticket.ownerName}` : 'Disponible'}
                        >
                            {ticket.number}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Component to display user's tickets
function MyTickets({ getUserTickets }) {
    const myTickets = getUserTickets();

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Mis Boletos</h2>
            {myTickets.length > 0 ? (
                myTickets.map((raffle, index) => (
                    <div key={index} className="bg-gray-800 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
                        <h3 className="text-2xl font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">{raffle.raffleName}</h3>
                        {raffle.winner && (
                             <div className="p-3 text-sm text-center font-bold rounded-xl text-yellow-800 bg-yellow-400/80 shadow-inner">
                                <Award className="inline-block h-5 w-5 mr-2 text-yellow-900" />
                                Ganador: #{raffle.winner.number}
                             </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {raffle.tickets.map(ticket => (
                                <span key={ticket.number} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold shadow-md">
                                    <Ticket size={16} className="inline-block mr-1" />
                                    #{ticket.number}
                                </span>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-8 bg-gray-800 rounded-3xl shadow-lg">
                    <p className="text-gray-400 text-xl font-medium">Aún no has comprado ningún boleto. ¡Es hora de participar!</p>
                </div>
            )}
        </div>
    );
}
