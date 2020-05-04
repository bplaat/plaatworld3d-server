// Constants
const DEFAULT_SERVER_PORT = 8081;

const CHAT_SERVER_PLAYER_ID = 0;

const PLAYER_HEIGHT = 2;
const PLAYER_START_STRENGTH = 100;
const PLAYER_START_ATTACK = 5;
const PLAYER_START_MONEY = 100;

// Random
let seed = 1;

function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function rand (min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// Load the package
var package = require('./package.json');

// Create a websocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || DEFAULT_SERVER_PORT });

// The players list and player id counter
const players = [];
let playerIdCounter = 1;

// Sends a message to a websocket client
function sendMessage (ws, type, data) {
    ws.send(JSON.stringify({ type: type, data: data }));
}

// Send a server chat message
function sendServerChatMessage (message) {
    for (const otherPlayer of players) {
        sendMessage(otherPlayer.ws, 'player.chat', {
            id: CHAT_SERVER_PLAYER_ID,
            message: message
        });
    }
}

// When new player connects
wss.on('connection', function (ws) {
    // The current player data holder
    let player;

    // When a player sends a message
    ws.on('message', function (message) {
        try {
            // Try to parse the message
            message = JSON.parse(message);
            const type = message.type;
            const data = message.data;

            // Connect a player
            if (type == 'player.connect') {
                // Check if the player is not already connected
                if (player != undefined) {
                    throw new Exception('Player is already connected!');
                }

                // Create a new player object
                player = { id: playerIdCounter++, ws: ws, name: data.name, health: PLAYER_START_STRENGTH, strength: PLAYER_START_STRENGTH, attack: PLAYER_START_ATTACK, money: PLAYER_START_MONEY, x: rand(-4, 4), y: PLAYER_HEIGHT * 5, z: rand(-4, 4) };

                // Send init player message to the connected player
                sendMessage(ws, 'player.init', { id: player.id, name: player.name, health: player.health, strength: player.strength, attack: player.attack, money: player.money, x: player.x, y: player.y, z: player.z });

                // Send all players to the connected player
                for (const otherPlayer of players) {
                    sendMessage(ws, 'player.new', { id: otherPlayer.id, name: otherPlayer.name, health: player.health, strength: player.strength, attack: player.attack, money: player.money, x: otherPlayer.x, y: otherPlayer.y, z: otherPlayer.z });
                }

                // Send new player message to all other players
                for (const otherPlayer of players) {
                    sendMessage(otherPlayer.ws, 'player.new', { id: player.id, name: player.name, health: player.health, strength: player.strength, attack: player.attack, money: player.money, x: player.x, y: player.y, z: player.z });
                }

                // Add the player to the players
                players.push(player);

                // Send server chat message
                sendServerChatMessage(player.name + ' joined');
            }

            // Player chat message
            if (type == 'player.chat') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.chat', {
                            id: player.id,
                            message: data.message
                        });
                    }
                }
            }

            // Player update name message
            if (type == 'player.name') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.name', {
                            id: player.id,
                            name: data.name
                        });
                    }
                }
            }

            // Player update health message
            if (type == 'player.health') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.health', {
                            id: player.id,
                            health: data.health
                        });
                    }
                }
            }

            // Player update strength message
            if (type == 'player.strength') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.strength', {
                            id: player.id,
                            strength: data.strength
                        });
                    }
                }
            }

            // Player update attack message
            if (type == 'player.attack') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.attack', {
                            id: player.id,
                            attack: data.attack
                        });
                    }
                }
            }

            // Player update money message
            if (type == 'player.money') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.money', {
                            id: player.id,
                            money: data.money
                        });
                    }
                }
            }

            // Player money give message
            if (type == 'player.money.give') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.money.give', {
                            playerId: data.playerId,
                            money: data.money
                        });
                    }
                }
            }

            // Send to all other players when a move message
            if (type == 'player.move') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.move', {
                            id: player.id,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            rotation: {
                                x: data.rotation.x,
                                y: data.rotation.y,
                                z: data.rotation.z
                            }
                        });
                    }
                }
            }

            // Send a shoot message to all other players
            if (type == 'player.shoot') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.shoot', {
                            playerId: player.id,
                            createdAt: data.createdAt,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            rotation: {
                                x: data.rotation.x,
                                y: data.rotation.y,
                                z: data.rotation.z
                            }
                        });
                    }
                }
            }
        }

        // Log exceptions
        catch (exception) {
            console.error(exception);
            player.ws.close();
        }
    });

    // When a player disconnects
    ws.on('close', function () {
        // Check if the player was already connected
        if (player != undefined) {
            // Remove the player from the players list
            for (let i = 0; i < players.length; i++) {
                if (players[i].id == player.id) {
                    players.splice(i, 1);
                    break;
                }
            }

            // Send a close player message to all other players
            for (const otherPlayer of players) {
                sendMessage(otherPlayer.ws, 'player.close', { id: player.id });
            }

            // Send server chat message
            sendServerChatMessage(player.name + ' died');
        }
    });

    // Send server info message
    sendMessage(ws, 'server.info', {
        version: package.version
    });
});
