// Constants
const DEFAULT_SERVER_PORT = 8081;

const PLAYER_HEIGHT = 2;
const PLAYER_MAX_HEALTH = 100;

// Random
let seed = 1;

function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function rand (min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

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
            id: 0,
            message: message
        });
    }
}

// When new player connects
wss.on('connection', function (ws) {
    let player;

    // When a player sends a message
    ws.on('message', function (message) {
        try {
            message = JSON.parse(message);
            const type = message.type;
            const data = message.data;

            // Connect a player
            if (type == 'player.connect') {
                if (player != undefined) {
                    throw new Exception('Player is already connected!');
                }

                // Create a new player object
                player = { id: playerIdCounter++, ws: ws, name: data.name, health: PLAYER_MAX_HEALTH, x: rand(-4, 4), y: PLAYER_HEIGHT, z: rand(-4, 4) };

                // Send init player message to the connected player
                sendMessage(ws, 'player.init', { id: player.id, name: player.name, health: player.health, x: player.x, y: player.y, z: player.z });

                // Send all players to the connected player
                for (const otherPlayer of players) {
                    sendMessage(ws, 'player.new', { id: otherPlayer.id, name: otherPlayer.name, health: player.health, x: otherPlayer.x, y: otherPlayer.y, z: otherPlayer.z });
                }

                // Send new player message to all other players
                for (const otherPlayer of players) {
                    sendMessage(otherPlayer.ws, 'player.new', { id: player.id, name: player.name, health: player.health, x: player.x, y: player.y, z: player.z });
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

            // Send to all other players when a move message
            if (type == 'player.move') {
                for (const otherPlayer of players) {
                    if (otherPlayer.id != player.id) {
                        sendMessage(otherPlayer.ws, 'player.move', {
                            id: player.id,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            rotationX: data.rotationX,
                            rotationZ: data.rotationZ
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
                            rotationX: data.rotationX,
                            rotationY: data.rotationY,
                            rotationZ: data.rotationZ
                        });
                    }
                }
            }
        } catch (exception) {
            console.error(exception);
            player.ws.close();
        }
    });

    // When a player disconnects
    ws.on('close', function () {
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
});
