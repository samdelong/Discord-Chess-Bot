'use strict'

// Discord setup shmuck
const Discord = require('discord.js');
const client = new Discord.Client();
const token = process.env.DISCORD_BOT_SECRET;

//const keep_alive = require("./keep_alive.js");
const pieces = require("./pieces.json");

const commands = require("./commands.json");

// Letters for board coordinates
const letters = [':regional_indicator_a:', ':regional_indicator_b:', ':regional_indicator_c:', ':regional_indicator_d:', ':regional_indicator_e:', ':regional_indicator_f:', ':regional_indicator_g:', ':regional_indicator_h:'];

// Numbers for board coordinates
const numbers = [":one:", ":two:", ":three:", ":four:", ":five:", ":six:", ":seven:", ":eight:"];

var active_users = {};
var active_games = {};

client.on('ready', () => {
  client.user.setActivity(commands.chess, { type: "PLAYING" });
  console.log(client.user.username + ' started!');
});

client.on('message', msg => {

  if (msg.content.split(" ")[0] === commands.chess) {
    let user = msg.author;
    let command = msg.content.split(" ")[1];

    if (command === commands.challenge) {

      let opponent = msg.mentions.members.first();

      if (opponent && opponent.user.id !== user.id) {
        msg.channel.send(`Does ${opponent} accept ${user.username}'s challenge?'`);
        active_games[user] = {
          players: {
            0: user.id,
            1: opponent.user.id,
          },
          waiting: true,
          board: [7],

        }
        let game = active_games[user];


        //game.board[7] = "r n b q k b n r "; 
        game.board[7] = "br:bn:bb:bq:bk:bb:bn:br";
        game.board[6] = "bp:bp:bp:bp:bp:bp:bp:bp";
        game.board[5] = "ee:ee:ee:ee:ee:ee:ee:ee";
        game.board[4] = "ee:ee:ee:ee:ee:ee:ee:ee";
        game.board[3] = "ee:ee:ee:ee:ee:ee:ee:ee";
        game.board[2] = "ee:ee:ee:ee:ee:ee:ee:ee";
        game.board[1] = "wp:wp:wp:wp:wp:wp:wp:wp";
        game.board[0] = "wr:wn:wb:wq:wk:wb:wn:wr";

        active_games[user][user] = 0;
        active_games[user][opponent.user.id] = 1;
      }

    } else if (command === commands.accept) {

      let challenger = msg.mentions.members.first();
      let game = active_games[challenger];
      if (game && game.waiting && game.players[1] == user.id) {
        active_users[user.id] = {
          game: challenger,
          user: user,
          opponent: challenger.user
        }
        active_users[challenger.user.id] = {
          game: challenger,
          user: challenger.user,
          opponent: user
        }
        msg.channel.send("Let the games begin");
        game.waiting = false;
      } else {
        msg.channel.send("That user isn't trying to challenge you.");

      }
    } else if (command === commands.deny) {

      let challenger = msg.mentions.members.first();
      let game = active_games[challenger];
      if (game && game.players[1] == user.id) {
        msg.channel.send(`${user} has denied ${challenger}'s game!'`);
        active_games[challenger] = {};
      } else {
        msg.channel.send("That user isn't trying to challenge you.");

      }
    } else if (command === commands.view) {

      if (activeGame(user)) {
        var game = active_games[active_users[user.id].game];
        var gameBoard = "";
        //game.board[7] = "r n b q k b n r "; 

        game.board.forEach((line, i) => {
          gameBoard += numbers[numbers.length - 1 - i] + " ";
          line.split(":").forEach((ch) => {
            // Replace each piece in each row with it's respective 'emoji'
            gameBoard += renderBoard(ch);
          });
          gameBoard += "\n";
        });
        msg.channel.send(gameBoard + `\n:black_large_square: ${letters[0]}${letters[1]}${letters[2]}${letters[3]}${letters[4]}${letters[5]}${letters[6]}${letters[7]}`);
      } else {
        msg.channel.send("You aren't in an active game!");

      }

    } else if (command === commands.current) {
      // Send the user the game they're in (If they're in one)
      if (activeGame(user)) {
        msg.channel.send(`Your are in the game: ${user} vs ${active_users[user.id].opponent}`);
      } else {
        msg.channel.send(`You aren't in a game! Start one with \`\`\`${commands.chess} challenge\`\`\``);
      }

    }
    else if (command === commands.move) {

      if (activeGame(user)) {

        // Piece user wants to move, and where they want to move it to
        let piece = (msg.content.split(" ")[2]).split("");
        let newloc = (msg.content.split(" ")[3]).split("");

        if (piece.length == 2 && newloc.length == 2) {

          // Get active game and board
          let game = active_games[active_users[user.id].game];
          let board = game.board;

          let pieceLetter = piece[0].toLowerCase();
          // Mapping inputted letters to integer coordinates
          let selectedLetter = letters.indexOf(`:regional_indicator_${piece[0].toLowerCase()}:`);
          let newLetter = letters.indexOf(`:regional_indicator_${newloc[0].toLowerCase()}:`);
          // y - coordinates
          let selectedPos = piece[1];
          let newPos = newloc[1];

          // Check if either of the desired positions are outside of the board
          if (selectedLetter == -1 || Math.floor(selectedPos) > 8) {
            msg.channel.send("Invalid piece " + letters.indexOf(pLetter));
            return;
          }
          if (newLetter == -1 || Math.floor(newPos) > 8) {
            msg.channel.send("Invalid position");
            return;
          }

          // Type of the piece that is being moved
          let pieceType = board[game.board.length - selectedPos].split(":")[selectedLetter];
          console.log(pieceType);

          let userTeam = "w";
          if (game.players[1] == user.id) {
            userTeam = "b";
          }

          // Check if player is making a valid move (correct team, correct movement )
          if (validMove({ "x": selectedLetter, "y": parseInt(selectedPos) }, { "x": newLetter, "y": parseInt(newPos) }, pieceType.split("")[1], userTeam, pieceType.split("")[0], game.board).valid) {
            // Row of the selected piece
            var oldRow = board[game.board.length - selectedPos].split(":");

            //Row of the new piece position
            var newRow = board[game.board.length - newPos].split(":");


            // Set new spot to game piece
            newRow[newLetter] = pieceType;
            board[game.board.length - newPos] = newRow.join(":");

            // Set Previous Piece to Blank Space
            oldRow[selectedLetter] = "ee";
            board[game.board.length - selectedPos] = oldRow.join(":");

            // Set active board to updated board
            active_games[active_users[user.id].game].board = board;

            // Yay
            msg.channel.send(`Success! Your move ${active_users[user.id].opponent}`);
          } else {
            msg.channel.send("Invalid Move!");

          }
        } else {
          msg.channel.send("Invalid input");
        }


      }
    } else if (command === commands.help) {
      msg.channel.send(` 
      \`\`\`      
Chessbot

All commands with ${commands.chess}
Example: ${commands.chess} {command}
Commands:
  ${commands.help}: Shows this help menu

  ${commands.view}: Shows the board of the current game
  ${commands.move}: 
    Syntax: ${commands.move} {piece position} {desired location}
    Example: ${commands.chess} ${commands.move} a2 a3
  ${commands.current}: View current opponent
    Syntax: ${commands.current}
    Example: ${commands.chess} ${commands.curent}

  ${commands.challenge}: Challenge another user to a game of chess
    Syntax: ${commands.challenge} @{username}
    Example: ${commands.chess} ${commands.challenge} @samdelong9#7961
  ${commands.accept}: Accepts challenge from another user
    Syntax: ${commands.accept} @{username}
    Example: ${commands.chess} ${commands.accept} @samdelong9#7961
  ${commands.deny}: Denies challenge from another user
    Syntax: ${commands.deny} @{username}
    Example: ${commands.chess} ${commands.deny} @samdelong9#7961
      \`\`\`    
      `);
    }
  }
});

function checkHits(userTeam, start, des, type, board) {

  let ret = {
    "hits" : [],
    "err" : ""
  };
  if (start.x == des.x) {
    for (let y = start.y - 1; y < des.y - 1; y++) {
      let row = board[y].split(":");
      if(row[des.x] != "ee"){
        if(row[des.x].split("")[0] != userTeam){
          ret.hits.push({"x":start.x,"y":y});
        }else{
          ret.err = "You hit your own pawn!";
          return ret;
        }
      }
    }
  }
  return ret;
}

function validMove(start, desired, type, userTeam, pawnTeam, board) {
  console.log(start);
  if (userTeam !== pawnTeam) {
    console.log("wrong team");
    return false;
  }

  //game.board[7] = "r n b q k b n r "; 
  let up = (desired.y) - (start.y);
  let side = (desired.x) - (start.x);
  let isUp = up != 0;
  let isDown = !isUp;

  let valid = false;
  console.log(type);
  if (type == "k" || type == "p") {
    console.log(type);

    if (((Math.abs(up) > 1) || (Math.abs(side) > 1))) {
      return { "valid": false };

    }
    if (isUp) {
      for (let i = start.x + 1; i < desired.x; i++) {
        console.log(board[i]);
      }
    }
    return { "valid": true }
  } else if (type == "b") {
    return { "valid": (Math.abs(desired.x - start.x) == Math.abs(desired.y - start.y)) }
  } else if (type == "r") {
    return { "valid": (start.x == desired.x || start.y == desired.y) }
    // }else if(){

    // }else if(){

    // }else if(){

  } else {
    return false;
  }

  switch (type) {

    case "k":
    case "p": {


      break;
    }
    case "b":
      valid = (Math.abs(desired.x - start.x) == Math.abs(desired.y - start.y));
      if(valid){
        valid = checkHits(userTeam, start, des, type, board);
      }
      break;

    case "r":
      console.log("rook");

      if (isUp) {
        if (desired.x > start.x) {
          for (let i = desired.x; i > start.x; i--) {
            console.log(board[i]);
          }
        } else {
          for (let i = start.x; i > desired.x; i--) {
            console.log(board[i]);
          }
        }
      }
      valid = (start.x == desired.x || start.y == desired.y)
      break;

    case "n":
      valid = true;
      break;

  }
  console.log("22");
  return valid;
}

function userFromId(message, id) {



}

function activeGame(user) {
  return active_users[user.id] && active_games[active_users[user.id].game]
}

// if (msg.author.id != client.user.id) {
//         msg.channel.send(msg.content.split('').reverse().join(''));
//     }

function renderBoard(ch) {
  switch (ch) {
    case "br":
      return pieces.rook.b
      break;
    case "bn":
      return pieces.knight.b
      break;
    case "bb":
      return pieces.bishop.b
      break;
    case "bq":
      return pieces.queen.b
      break;
    case "bk":
      return pieces.king.b
      break;
    case "bp":
      return pieces.pawn.b
      break;
    case "wp":
      return pieces.pawn.w
      break;
    case "wr":
      return pieces.rook.w
      break;
    case "wn":
      return pieces.knight.w
      break;
    case "wb":
      return pieces.bishop.w
      break;
    case "wq":
      return pieces.queen.w
      break;
    case "wk":
      return pieces.king.w
      break;
    default:
      return pieces.square.w
      break;
  }

}

client.login(token);
