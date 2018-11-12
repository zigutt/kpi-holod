var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var mysql = require('mysql'); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));


var con = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_pass,
  database: process.env.db_name
});


const TeleBot = require('telebot');
var request = require('request');
let users = {};
let current_week = 1;
let last_day = 12;
const bot = new TeleBot({
    token: process.env.tg_token,
    polling: { 
        interval: 1000, 
        timeout: 0, 
        limit: 100, 
        retryTimeout: 5000, 
    }
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
function finish(userid, username)
{
  if(users[userid].state != 2) return;
  var sql = "INSERT INTO kpiholod (user, building, room, comment) VALUES ('" + (username == undefined ? userid : username) + "','" + users[userid].building + "','" + users[userid].room + "','" + users[userid].comment + "')";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");
  });
}
bot.on('text', (msg) => 
{
  var date = new Date();
  console.log(date.getHours()+2);
  
  if(msg.text[0] != '/' ) 
  {
    console.log('get message from user: ' + msg.text + ' on stage: ' + users[msg.from.id]);
    switch(users[msg.from.id].state)
    {
      case 0:
        users[msg.from.id].building = msg.text;
        msg.reply.text('Отлично, твой корпус: ' + msg.text + '. А теперь введи номер аудитории, например "214", "314" и т.п.');
        users[msg.from.id].state = 1;
        break;
      case 1:
        users[msg.from.id].room = msg.text;
        msg.reply.text('Корпус: ' + users[msg.from.id].building + ', аудитория: ' + msg.text + '. Если это все, введи команду /finish для добавления комментария /comment.');
        users[msg.from.id].state = 2;
        break;
      case 2:
        users[msg.from.id].comment = msg.text;
        msg.reply.text('Твой отзыв был записан и отправлен на обработку');
        finish(msg.from.id, msg.from.username);
        break;
    }
  }
});
bot.on(['/finish'], (msg) =>
       {
  msg.reply.text('Твой отзыв был отправлен на обработку');
  finish(msg.from.id, msg.from.username);
  
});
bot.on(['/comment'], (msg) =>
       {
  msg.reply.text('Введи свой комментарий по поводу аудитории. (Одним сообщением)');
  
});
bot.on(['/holod'], (msg) => 
{
  users[msg.from.id] = {};
  users[msg.from.id].state = 0;
  msg.reply.text('Введи номер корпуса, например "1", "5" и т.п.');
});
bot.on(['/start'], (msg) => 
{
  msg.reply.text('Привет, этот бот создан для сбора информации по поводу отопления в корпусах! Если тебе было холодно или холодно сейчас, напиши /holod');
});
bot.start();
// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
