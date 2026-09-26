import { BOARD, CHANCE_CARDS, CHEST_CARDS, RAILROAD_IDS, UTILITY_IDS, GROUP_COLORS } from "./board";

const STARTING_CASH = 1500;
const PASS_GO = 200;
const JAIL_FINE = 50;
const MAX_JAIL_TURNS = 3;

export function newGame(roomId, hostName, hostId) {
  return {
    roomId,
    status: "lobby", // lobby | playing | finished
    createdAt: Date.now(),
    players: [
      {
        id: hostId,
        name: hostName,
        cash: STARTING_CASH,
        position: 0,
        inJail: false,
        jailTurns: 0,
        jailCards: 0,
        bankrupt: false,
        properties: [],
      },
    ],
    turnIndex: 0,
    ownership: {}, // tileId -> { owner: playerId, houses: 0-4, hotel: bool, mortgaged: bool }
    dice: [1, 1],
    doublesCount: 0,
    log: ["Room created. Waiting for players..."],
    lastCard: null,
    pendingAction: null, // "awaitBuy" | "awaitRoll" | null
    winner: null,
  };
}

function findPlayer(game, playerId) {
  return game.players.find((p) => p.id === playerId);
}

function activePlayers(game) {
  return game.players.filter((p) => !p.bankrupt);
}

function log(game, msg) {
  game.log.push(msg);
  if (game.log.length > 60) game.log.shift();
}

export function addPlayer(game, playerId, name) {
  if (game.status !== "lobby") throw new Error("Game already started");
  if (game.players.length >= 8) throw new Error("Room is full (max 8 players)");
  if (game.players.some((p) => p.id === playerId)) return game;
  game.players.push({
    id: playerId,
    name,
    cash: STARTING_CASH,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false,
    properties: [],
  });
  log(game, `${name} joined the game.`);
  return game;
}

export function startGame(game, requesterId) {
  if (game.players[0].id !== requesterId) throw new Error("Only the host can start the game");
  if (game.players.length < 2) throw new Error("Need at least 2 players to start");
  game.status = "playing";
  game.turnIndex = 0;
  log(game, `Game started with ${game.players.length} players. ${game.players[0].name} goes first.`);
  return game;
}

function currentPlayer(game) {
  return game.players[game.turnIndex];
}

function nextTurn(game) {
  game.doublesCount = 0;
  game.pendingAction = null;
  let idx = game.turnIndex;
  do {
    idx = (idx + 1) % game.players.length;
  } while (game.players[idx].bankrupt && idx !== game.turnIndex);
  game.turnIndex = idx;
  const p = currentPlayer(game);
  log(game, `It's ${p.name}'s turn.`);
}

function tileOwnership(game, tileId) {
  return game.ownership[tileId];
}

function ownsFullGroup(game, playerId, group) {
  const tiles = BOARD.filter((t) => t.type === "property" && t.group === group);
  return tiles.every((t) => game.ownership[t.id] && game.ownership[t.id].owner === playerId);
}

function countRailroadsOwned(game, playerId) {
  return RAILROAD_IDS.filter((id) => game.ownership[id] && game.ownership[id].owner === playerId).length;
}

function countUtilitiesOwned(game, playerId) {
  return UTILITY_IDS.filter((id) => game.ownership[id] && game.ownership[id].owner === playerId).length;
}

function calcRent(game, tileId, diceRoll) {
  const tile = BOARD[tileId];
  const own = game.ownership[tileId];
  if (!own || own.mortgaged) return 0;

  if (tile.type === "property") {
    if (own.hotel) return tile.rent[5];
    if (own.houses > 0) return tile.rent[own.houses];
    const base = tile.rent[0];
    return ownsFullGroup(game, own.owner, tile.group) ? base * 2 : base;
  }
  if (tile.type === "railroad") {
    const n = countRailroadsOwned(game, own.owner);
    return [0, 25, 50, 100, 200][n] || 0;
  }
  if (tile.type === "utility") {
    const n = countUtilitiesOwned(game, own.owner);
    const mult = n >= 2 ? 10 : 4;
    return (diceRoll || 7) * mult;
  }
  return 0;
}

function payPlayer(game, fromPlayer, toPlayer, amount) {
  fromPlayer.cash -= amount;
  if (toPlayer) toPlayer.cash += amount;
}

function checkBankruptcy(game, player) {
  if (player.cash < 0) {
    // Must liquidate: mortgage properties / sell houses automatically if still short, else bankrupt.
    // Simple approach: try mortgaging everything owned before declaring bankrupt.
    for (const tileId of player.properties) {
      const own = game.ownership[tileId];
      if (own && !own.mortgaged && own.houses === 0 && !own.hotel) {
        const tile = BOARD[tileId];
        own.mortgaged = true;
        player.cash += tile.mortgage;
        log(game, `${player.name} mortgaged ${tile.name} to raise cash.`);
        if (player.cash >= 0) break;
      }
    }
  }
  if (player.cash < 0) {
    player.bankrupt = true;
    log(game, `${player.name} went bankrupt and is out of the game!`);
    // release properties
    for (const tileId of player.properties) {
      delete game.ownership[tileId];
    }
    player.properties = [];
    const remaining = activePlayers(game);
    if (remaining.length === 1) {
      game.status = "finished";
      game.winner = remaining[0].id;
      log(game, `${remaining[0].name} wins the game!`);
    }
  }
}

function moveToJail(game, player) {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  log(game, `${player.name} was sent to Jail.`);
}

function drawCard(game, player, deckName) {
  const deck = deckName === "chance" ? CHANCE_CARDS : CHEST_CARDS;
  const card = deck[Math.floor(Math.random() * deck.length)];
  game.lastCard = { deck: deckName, text: card.text };
  log(game, `${player.name} drew ${deckName === "chance" ? "Chance" : "Community Chest"}: "${card.text}"`);
  const result = card.action(player);

  if (result.jailCard) {
    player.jailCards += 1;
    return;
  }
  if (result.toJail) {
    moveToJail(game, player);
    return;
  }
  if (typeof result.move === "number") {
    const passedGo = result.move < player.position && result.collect !== false;
    player.position = result.move;
    if (result.collect || passedGo) {
      player.cash += PASS_GO;
      log(game, `${player.name} passed GO and collected $${PASS_GO}.`);
    }
    resolveTileLanding(game, player, true);
    return;
  }
  if (typeof result.moveBy === "number") {
    player.position = (player.position + result.moveBy + 40) % 40;
    resolveTileLanding(game, player, true);
    return;
  }
  if (result.nearestRailroad) {
    const nearest = RAILROAD_IDS.find((id) => id > player.position) || RAILROAD_IDS[0];
    if (nearest < player.position) {
      player.cash += PASS_GO;
      log(game, `${player.name} passed GO and collected $${PASS_GO}.`);
    }
    player.position = nearest;
    resolveTileLanding(game, player, true);
    return;
  }
  if (typeof result.cash === "number") {
    player.cash += result.cash;
    checkBankruptcy(game, player);
  }
  if (typeof result.payEachPlayer === "number") {
    for (const other of activePlayers(game)) {
      if (other.id !== player.id) {
        payPlayer(game, player, other, result.payEachPlayer);
      }
    }
    checkBankruptcy(game, player);
  }
  if (typeof result.collectFromEachPlayer === "number") {
    for (const other of activePlayers(game)) {
      if (other.id !== player.id) {
        payPlayer(game, other, player, result.collectFromEachPlayer);
        checkBankruptcy(game, other);
      }
    }
  }
  if (result.repairs) {
    let total = 0;
    for (const tileId of player.properties) {
      const own = game.ownership[tileId];
      if (!own) continue;
      if (own.hotel) total += result.repairs.hotel;
      else total += own.houses * result.repairs.house;
    }
    player.cash -= total;
    if (total > 0) log(game, `${player.name} paid $${total} for repairs.`);
    checkBankruptcy(game, player);
  }
}

function resolveTileLanding(game, player, fromCard, diceRoll) {
  const tile = BOARD[player.position];

  if (tile.type === "tax") {
    player.cash -= tile.amount;
    log(game, `${player.name} paid $${tile.amount} in tax.`);
    checkBankruptcy(game, player);
    return;
  }
  if (tile.type === "gotojail") {
    moveToJail(game, player);
    return;
  }
  if (tile.type === "chance") {
    drawCard(game, player, "chance");
    return;
  }
  if (tile.type === "chest") {
    drawCard(game, player, "chest");
    return;
  }
  if (tile.type === "property" || tile.type === "railroad" || tile.type === "utility") {
    const own = game.ownership[tile.id];
    if (!own) {
      game.pendingAction = "awaitBuy";
      log(game, `${player.name} landed on ${tile.name} (unowned, $${tile.price}).`);
    } else if (own.owner !== player.id && !own.mortgaged) {
      const rent = calcRent(game, tile.id, diceRoll);
      const owner = findPlayer(game, own.owner);
      payPlayer(game, player, owner, rent);
      log(game, `${player.name} paid $${rent} rent to ${owner.name} for ${tile.name}.`);
      checkBankruptcy(game, player);
    } else if (own.owner !== player.id && own.mortgaged) {
      log(game, `${tile.name} is mortgaged, no rent due.`);
    }
    return;
  }
  // GO, jail-visiting, free parking: no-op
}

export function rollDice(game, playerId) {
  if (game.status !== "playing") throw new Error("Game is not active");
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (game.pendingAction === "awaitBuy") throw new Error("Resolve the current property first (buy or pass)");

  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  game.dice = [d1, d2];
  const isDouble = d1 === d2;

  if (player.inJail) {
    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      log(game, `${player.name} rolled doubles (${d1},${d2}) and got out of Jail!`);
    } else {
      player.jailTurns += 1;
      log(game, `${player.name} rolled (${d1},${d2}) in Jail — no doubles (${player.jailTurns}/${MAX_JAIL_TURNS}).`);
      if (player.jailTurns >= MAX_JAIL_TURNS) {
        player.cash -= JAIL_FINE;
        player.inJail = false;
        player.jailTurns = 0;
        log(game, `${player.name} paid $${JAIL_FINE} fine after 3 failed attempts and is released.`);
        checkBankruptcy(game, player);
      } else {
        nextTurn(game);
        return game;
      }
    }
  } else {
    if (isDouble) {
      game.doublesCount += 1;
      if (game.doublesCount === 3) {
        log(game, `${player.name} rolled doubles three times in a row — straight to Jail!`);
        moveToJail(game, player);
        nextTurn(game);
        return game;
      }
    } else {
      game.doublesCount = 0;
    }
  }

  const roll = d1 + d2;
  const oldPos = player.position;
  const newPos = (oldPos + roll) % 40;
  if (newPos < oldPos) {
    player.cash += PASS_GO;
    log(game, `${player.name} passed GO and collected $${PASS_GO}.`);
  }
  player.position = newPos;
  log(game, `${player.name} rolled ${d1} + ${d2} = ${roll}, moved to ${BOARD[newPos].name}.`);
  resolveTileLanding(game, player, false, roll);

  if (game.pendingAction === "awaitBuy") {
    // wait for buy/pass action
  } else if (isDouble && game.status === "playing" && !player.bankrupt) {
    log(game, `${player.name} rolled doubles and goes again.`);
  } else {
    nextTurn(game);
  }
  return game;
}

export function buyProperty(game, playerId) {
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (game.pendingAction !== "awaitBuy") throw new Error("Nothing to buy right now");
  const tile = BOARD[player.position];
  if (player.cash < tile.price) throw new Error("Not enough cash to buy this property");

  player.cash -= tile.price;
  player.properties.push(tile.id);
  game.ownership[tile.id] = { owner: player.id, houses: 0, hotel: false, mortgaged: false };
  log(game, `${player.name} bought ${tile.name} for $${tile.price}.`);
  game.pendingAction = null;

  const isDouble = game.dice[0] === game.dice[1];
  if (!(isDouble && game.status === "playing")) {
    nextTurn(game);
  }
  return game;
}

export function passOnProperty(game, playerId) {
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (game.pendingAction !== "awaitBuy") throw new Error("Nothing pending");
  const tile = BOARD[player.position];
  log(game, `${player.name} declined to buy ${tile.name}.`);
  game.pendingAction = null;
  const isDouble = game.dice[0] === game.dice[1];
  if (!(isDouble && game.status === "playing")) {
    nextTurn(game);
  }
  return game;
}

export function payJailFine(game, playerId) {
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (!player.inJail) throw new Error("You are not in Jail");
  if (player.cash < JAIL_FINE) throw new Error("Not enough cash");
  player.cash -= JAIL_FINE;
  player.inJail = false;
  player.jailTurns = 0;
  log(game, `${player.name} paid $${JAIL_FINE} to get out of Jail.`);
  return game;
}

export function useJailCard(game, playerId) {
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (!player.inJail) throw new Error("You are not in Jail");
  if (player.jailCards < 1) throw new Error("You don't have a Get Out of Jail Free card");
  player.jailCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  log(game, `${player.name} used a Get Out of Jail Free card.`);
  return game;
}

export function buyHouse(game, playerId, tileId) {
  const player = findPlayer(game, playerId);
  const tile = BOARD[tileId];
  if (!tile || tile.type !== "property") throw new Error("Invalid property");
  const own = game.ownership[tileId];
  if (!own || own.owner !== playerId) throw new Error("You don't own this property");
  if (!ownsFullGroup(game, playerId, tile.group)) throw new Error("You must own the full color group");
  if (own.hotel) throw new Error("Already has a hotel");
  if (own.houses >= 4) {
    // build hotel
    if (player.cash < tile.houseCost) throw new Error("Not enough cash");
    player.cash -= tile.houseCost;
    own.houses = 0;
    own.hotel = true;
    log(game, `${player.name} built a hotel on ${tile.name}.`);
    return game;
  }
  // even-building rule (simplified): can't build if another property in group has 2+ fewer houses
  const groupTiles = BOARD.filter((t) => t.type === "property" && t.group === tile.group);
  const minHouses = Math.min(...groupTiles.map((t) => (game.ownership[t.id]?.houses ?? 0)));
  if (own.houses > minHouses) throw new Error("Must build evenly across the color group");
  if (player.cash < tile.houseCost) throw new Error("Not enough cash");
  player.cash -= tile.houseCost;
  own.houses += 1;
  log(game, `${player.name} built a house on ${tile.name} (${own.houses}/4).`);
  return game;
}

export function sellHouse(game, playerId, tileId) {
  const player = findPlayer(game, playerId);
  const tile = BOARD[tileId];
  const own = game.ownership[tileId];
  if (!own || own.owner !== playerId) throw new Error("You don't own this property");
  if (own.hotel) {
    own.hotel = false;
    own.houses = 4;
    player.cash += Math.floor(tile.houseCost / 2);
    log(game, `${player.name} sold the hotel on ${tile.name}.`);
    return game;
  }
  if (own.houses <= 0) throw new Error("No houses to sell");
  const groupTiles = BOARD.filter((t) => t.type === "property" && t.group === tile.group);
  const maxHouses = Math.max(...groupTiles.map((t) => (game.ownership[t.id]?.houses ?? 0)));
  if (own.houses < maxHouses) throw new Error("Must sell evenly across the color group");
  own.houses -= 1;
  player.cash += Math.floor(tile.houseCost / 2);
  log(game, `${player.name} sold a house on ${tile.name} (${own.houses}/4).`);
  return game;
}

export function toggleMortgage(game, playerId, tileId) {
  const player = findPlayer(game, playerId);
  const tile = BOARD[tileId];
  const own = game.ownership[tileId];
  if (!own || own.owner !== playerId) throw new Error("You don't own this property");
  if (own.houses > 0 || own.hotel) throw new Error("Sell houses/hotel before mortgaging");
  if (own.mortgaged) {
    const cost = Math.ceil(tile.mortgage * 1.1);
    if (player.cash < cost) throw new Error("Not enough cash to unmortgage");
    player.cash -= cost;
    own.mortgaged = false;
    log(game, `${player.name} unmortgaged ${tile.name} for $${cost}.`);
  } else {
    own.mortgaged = true;
    player.cash += tile.mortgage;
    log(game, `${player.name} mortgaged ${tile.name} for $${tile.mortgage}.`);
  }
  return game;
}

export function endTurnManually(game, playerId) {
  const player = currentPlayer(game);
  if (player.id !== playerId) throw new Error("Not your turn");
  if (game.pendingAction === "awaitBuy") throw new Error("Resolve the pending purchase first");
  nextTurn(game);
  return game;
}

export function declareBankruptcy(game, playerId) {
  const player = findPlayer(game, playerId);
  player.cash = -1;
  checkBankruptcy(game, player);
  if (currentPlayer(game).id === playerId && game.status === "playing") {
    nextTurn(game);
  }
  return game;
}
