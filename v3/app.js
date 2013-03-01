var express = require('express'),
    sio = require('socket.io'),
	http = require('http');
var app = express();
var httpServer = http.createServer(app);
app.use(express.static(__dirname+"/web"));
var port = (process.env.PORT || 3000)

httpServer.listen(port);

var io = sio.listen(httpServer);

io.set('log level',2);

var clients={};
var players={};
var rooms={};

var joinRequests={};
var playerSockets={};

var occupiedFixtures={};
var fixtures=[];

//io.sockets.on('message', function (msg) {
	//console.log('Message Received: ', msg);
//    socket.broadcast.emit('message', msg);
//});

function sanitize(val){
    return val.replace(/[^a-z 0-9]+/gi,'');
}

function addRoom(name){
    return rooms[sanitize(name)]={
        spectators: {},
        players:    {}
    }
}

function addPlayer(socket){
    playerSockets[socket.id]=socket;
    return {    //Add the player to the world
        id:socket.id,
        nick:"anonymous",
        spectating:true,
        chat:""
    }
}


function addClient(sockId){
    return clients[sockId]={
    }
}

console.log("started!");
io.sockets.on('connection', function (socket) {
    var address = socket.handshake.address;
    console.log("New connection from " + address.address + ":" + address.port + " sid:"+socket.id);
    //console.log('Connect Received: ');
    
    var client=addClient(socket.id);

    console.log("Clients:"+JSON.stringify(clients));

  //  socket.on('join', function (data) {
    var player=addPlayer(socket);
    
    players[socket.id]=player;
    var i=0;
    for( var k in players)  //Renumber the players
        players[k].index=i++;
    console.log("players:"+JSON.stringify(players));

    socket.emit('welcome',socket.id); //Send the joining players id
    
    io.sockets.emit("players",players); //Broadcast the new player list

    socket.on('nick', function (nnick) {    //Change user nickname
        players[socket.id].nick = sanitize(nnick);
        io.sockets.emit('player',players[socket.id]); //Broadcast the changed player nick..
    });
    
    socket.on('video', function (data) {
	//console.log('Got data:'+socket.id);
        socket.broadcast.emit('video', {data:data,id:socket.id});    //Forward video packets...
    });
    
    socket.on('sim', function (msg) {
        //console.log('Message Received: ', msg);
        var plr=players[socket.id];
        if(plr.avatar){
            var pav=fixtures[plr.avatar];
            if(pav)
                pav.lastState=msg;
        }
        socket.broadcast.emit('sim', {data:msg,id:socket.id});   //Forward chat/game data
    });
    
    socket.on('chat', function (msg) {
        //console.log('Message Received: ', msg);
        socket.broadcast.emit('chat', {message:msg,id:socket.id});   //Forward chat/game data
    });
    
    Array.prototype.contains = function(val) {
        return (this.indexOf(val)==-1)?false:true;
    }

    Array.prototype.remove = function() {
        var what, a = arguments, L = a.length, ax;
        while (L && this.length) {
            what = a[--L];
            while ((ax = this.indexOf(what)) !== -1) {
                this.splice(ax, 1);
            }
        }
        return this;
    };
    
    socket.on('room', function (data) {
        var plr=players[socket.id];
        if(rooms[data.room]){
            socket.broadcast.to(data.room).emit(data.command,data);
        }else{
            console.log("Player:"+plr.nick+" sent to invalid room...");
        }
    });
    
    socket.on('joinrequest', function(playerId){
        var plr=players[socket.id];
        var plr2=players[playerId];

        console.log("Got join request from "+plr.nick+" to "+plr2.nick+" "+playerId);
        if(joinRequests[playerId]){
            if(joinRequests[playerId].contains(plr.id)==false)
                joinRequests[playerId].push(plr.id);
        }else{
            joinRequests[playerId]=[plr.id];
        }
    });
    
    socket.on('joinaccept', function(playerId){
        var plr=players[socket.id];
        var plr2=players[playerId];
        console.log("Got join accept from "+plr.nick+" to "+plr2.nick+" "+playerId);
        if(joinRequests[plr.id].contains(playerId))
        {   //Set up game
            joinRequests[plr.id].remove(playerId);
            console.log("Setting up game between "+plr.nick+" and "+plr2.nick+"");
            var room=""+socket.id+playerId;
            addRoom(room);
            socket.join(room);//Join both players into the room that is the combination of thier names..
            
            var sock2=playerSockets[playerId];
            sock2.join(room);
            
            socket.broadcast.to(room).emit("join",room);
            
        }else{
            console.log("Player "+plr.nick+" attempted to accept unrequested game...");
        }
    });
    
    socket.on('control', function (fixtureId) {
        var plr=players[socket.id];
        if(plr.avatar && plr.spectating==false){    //If we are controlling something already...
            delete occupiedFixtures[plr.avatar]; //Disengage from it..
        }
        plr.avatar=fixtureId;   //Set our new avatar target
        if(occupiedFixtures[fixtureId] && occupiedFixtures[fixtureId]!=socket.id)    //If it is currently controlled..
            plr.spectating=true;
        else{
            plr.spectating=false;
            occupiedFixtures[fixtureId]=socket.id;  //Take control of the fixture
            if(!fixtures[fixtureId])
                fixtures[fixtureId]={
                    
                };
        }
        var state={id:plr.id,spectating:plr.spectating,avatar:plr.avatar};
        io.sockets.emit('playerState',{id:plr.id,spectating:plr.spectating,avatar:plr.avatar});   //Send the player state change to everyone.
    });
    
    socket.on('disconnect', function (data) {
        console.log("Client disconnect from " + address.address + ":" + address.port + " sid:"+socket.id);
        console.log("Discon data:" + data);
        var plyr=players[socket.id];
        if(plyr.avatar && occupiedFixtures[plyr.avatar]==socket.id){//plyr.spectating==false){    //If we are controlling something already...
            delete occupiedFixtures[plyr.avatar]; //Disengage from it..
        }

        delete clients[socket.id];
        delete players[socket.id];
        delete playerSockets[socket.id];
        var i=0;
        for( var k in players) players[k].index=i++;  //Reindex the players
        console.log("players:"+JSON.stringify(clients));
        console.log("occupiedFixtures:"+JSON.stringify(occupiedFixtures));

        io.sockets.emit('players',players); //Broadcast the new player list
        
    });
    
});