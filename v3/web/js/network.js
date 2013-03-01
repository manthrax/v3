
/*********** NETWORKING *********/

var g_playerList={};
var g_localPlayer=undefined;
var g_networkId=null;
var iosocket;

var incomingChatElem;
var outgoingChatElem;
var outgoingNickField;

function doPlayerAction(playerId,item){
    if(item==2)//Accept request
    {
        iosocket.emit('joinaccept',playerId);        
    }
    else if(item==1)//request game
    {
        iosocket.emit('joinrequest',playerId);
    }
}

function rebuildPlayerList()
{
    var elem=document.getElementById("playerListElems");
    var str="<list>";
    for(var key in g_playerList){
        var p=g_playerList[key];
        str+="<li>"+
            ((p==g_localPlayer) ? "<input class='uiComponent' value='"+p.nick+"' onkeypress='outgoingNickKeyPress(event)'></input>":p.nick)+
            "<button class='uiComponent' onclick='doPlayerAction(\""+key+"\",1);'>request</button><button class='uiComponent' onclick='doPlayerAction(\""+key+"\",2);'>accept</button></br>";
            //+"</li><select class='uiComponent' onchange='if(this.selectedIndex)doPlayerAction(\""+key+"\",this.selectedIndex);'><option disabled>Actions<option>Request Game</option><option>Accept Request</option></select>\n";
    }
    str+="</list>";
    elem.innerHTML=str;
}

function outgoingNickKeyPress(event){
    if(event.which == 13) {
        event.preventDefault();
        iosocket.emit('nick',event.target.value);
        localStorage.nick=event.target.value;
    }
}

function outgoingChatKeyPress(event){
    if(event.which == 13) {
        event.preventDefault();
        //doPreventDefault(event);

        iosocket.emit('chat',outgoingChatElem.value);

        var ourPlayer=g_playerList[g_networkId];
        if(ourPlayer){
            ourPlayer.chat=outgoingChatElem.value;
            incomingChatElem.innerHTML+='<li>'+ourPlayer.nick+":"+outgoingChatElem.value+'</li>';
        }else{
            incomingChatElem.innerHTML+='<li>Not connected:'+outgoingChatElem.value+'</li>';                
        }
        outgoingChatElem.value='';
        outgoingChatElem.blur();

        if(g_remoteVideoEnabled==true){
            setTimeout(new function(){
                renderPlayerImage(ourPlayer,getPlayerImageBuffer(ourPlayer.id));
                updateDynamicTexture();
                },1000);
        }
    }
}


function networkAttachClientListeners(){
    
    incomingChatElem=document.getElementById('incomingChatMessages');
    outgoingChatElem=document.getElementById('outgoingChatMessage');
    outgoingNickField=document.getElementById('outgoingNickField');
    incomingChatElem.innerHTML+='<li>Connected</li>';
    iosocket.on('addroom')
    iosocket.on('disconnect', function() {incomingChatElem.innerHTML+='<li>Disconnected</li>';});
    iosocket.on('welcome', function(data) {
        console.log("got welcome");
        g_networkId = data;
        
        //Send our default nick
        if(localStorage.nick){
            iosocket.emit('nick',localStorage.nick);
        }        
        if(g_targetFixture!=null)
            iosocket.emit('control',g_targetFixture.id);    //Attempt to take control of our targeted fixture
    });
    iosocket.on('chat', function(msg) {
        var player=g_playerList[msg.id];
        if(player){
            player.chat=msg.message;
            incomingChatElem.innerHTML+='<li>'+player.nick+":"+player.chat+'</li>';
        }
    });
    iosocket.on('player', function(playerData) {
        var player=g_playerList[playerData.id]=playerData;
        g_localPlayer=g_playerList[g_networkId];
        rebuildPlayerList();
    });
    iosocket.on('players', function(players) {
        g_playerList = players;
        g_localPlayer=g_playerList[g_networkId];
        rebuildPlayerList();
    });
    
    if(outgoingNickField)outgoingNickField.onkeypress=outgoingNickKeyPress;    
    if(outgoingChatElem)outgoingChatElem.onkeypress=outgoingChatKeyPress;
}


function connectToChatServer()
{
    if(iosocket)return undefined; //Already connected...
    iosocket = io.connect("/");//:3001");
    return iosocket;
}

/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */



var badPacketCount=0;

function sendFixtureToServer(fix){
    var msg='sync~'+fix.id;
    for(var bid in fix.bodies){
        var bod=fix.bodies[bid];
        msg+='~'+bod.position[0]+'~'+bod.position[1]+'~'+bod.position[2]+
             '~'+bod.linearVelocity[0]+'~'+bod.linearVelocity[1]+'~'+bod.linearVelocity[2];
    }
    iosocket.emit('sim',msg);
}

function sendControlsToServer(fix){
    var msg='ctrl~'+fix.id;
    var controls=fix.controls;
    for(var i in controls.inputs)
        msg+='~'+controls.inputs[i];
    for(var ca in controls.active)
        for(var a in controls.active[ca])
            msg+='~'+controls.active[ca][a];
    msg+='~'+controls.flipOver;
    iosocket.emit('sim',msg);
}

function parseBool(str) {
  return /^y|yes|ok|true$/i.test(str);
}

function recvFromServer(msg){
    var cmd=msg.data.split('~');
    var idx=0;
    while(idx<cmd.length){
        var remaining=cmd.length-idx;
        var c=cmd[idx];
        if(c=='sync'){
            var objID=cmd[++idx];
            idx++;
            var fix=g_fixtures.byId[objID];
            if(remaining<(fix.bodies.length*6)+2){//cmd + objID + 16 flt
                badPacketCount++;
                break;
            }
            try{
                for(var bid in fix.bodies){
                    var bod=fix.bodies[bid];
                    v3set(bod.position,parseFloat(cmd[idx++]),parseFloat(cmd[idx++]),parseFloat(cmd[idx++]));
                    v3set(bod.linearVelocity,parseFloat(cmd[idx++]),parseFloat(cmd[idx++]),parseFloat(cmd[idx++]));
                }
            }catch(e){
                badPacketCount++;
                break;
            }
        }else if(c=='ctrl'){
            objID=cmd[++idx];
            idx++;
            fix=g_fixtures.byId[objID];
            if(remaining<15){//cmd + objID + 16 flt
                badPacketCount++;
                break;
            }
            var controls=fix.controls;
            for(var i in controls.inputs){
                controls.inputs[i]=parseFloat(cmd[idx++]);
            }
            
            for(ci in controls.active){
                for(i in controls.active[ci]){
                    controls.active[ci][i]=parseBool(cmd[idx++]);
                }
            }
            controls.flipOver=parseBool(cmd[idx++]);
        }
        if(idx==cmd.length)
            break;
    }
}

function initNetwork(){
    
    var iosocket=connectToChatServer();
    
    iosocket.on('connect', function () {
        networkAttachClientListeners();
        iosocket.on('sim', function(data) {
            recvFromServer(data);
        });
        iosocket.on('video', videoStreamHandler);
        iosocket.on('playerState', function(state) {
            var plr=g_playerList[state.id];
            for(var k in state)plr[k]=state[k];
        });
        iosocket.on('chat', function(msg) {
            if(g_remoteVideoEnabled){
                var player=g_playerList[msg.id];
                if(player){
                    renderPlayerImage(player,getPlayerImageBuffer(player.id));
                    updateDynamicTexture();
                }
            }
        });
    });
}