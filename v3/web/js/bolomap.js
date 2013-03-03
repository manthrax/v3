define(["text!Everard+Island.map","text!Everard+Island.map.txt"],function(bmap,ascmap){
    function getNib(buf,idx,nidx){
        var sidx=idx+(nidx>>1);
        var b=buf[sidx];
        //if((nidx&1)==0)b>>=4;
        if(nidx&1)
            return (b&0x0F);
        return (b&0xF0)>>4;
    }

    /*
	var imapname;
	var imap;
	$.ajax({
		url: '/v3/maps/',
		async: false,
		data: { filename: "Yellow Brick Road.map" },
		dataType: "json"
	}).done(function(data) {
		if (data.error) {
			console.log(data.error);
			return;
		}

		imapname = data.mapname;
		imap = data.map;
	});
*/		
    var imap=new Array(ascmap.length/2);
    var mi=0;
    var hexStr="0123456789abcdef";
    for(t=0;t<imap.length;t++)imap[t]=(hexStr.indexOf(ascmap[mi++])<<4)|hexStr.indexOf(ascmap[mi++]); //.charCodeAt(t)&255;

    var tag='BMAPBOLO';
    var tagValid=true;
    for(t=0;t<8;t++)if(tag.charAt(t).charCodeAt()!=imap[t])tagValid=false;
    if(tagValid==false){
        console.log("Bad file tag!:"+bmap.substring(0,8));
        return;
    }
    var mapVer=imap[8];
    t=imap.length-4;
    var appearsValid=(mapVer==1)&&(imap[t++]==4)&&(imap[t++]==255)&&(imap[t++]==255)&&(imap[t++]==255);
    console.log("AppearsValid:"+appearsValid);
    var endBytes=imap[imap.length-4];
    var tileCat=[
    {
        name:"Building",
        c:"|",
        hp:255
    },

    {
        name:"River",
        c:" ",
        hp:255
    },

    {
        name:"Swamp",
        c:"~",
        hp:255
    },

    {
        name:"Crater",
        c:"%",
        hp:255
    },

    {
        name:"Road",
        c:"=",
        hp:255
    },

    {
        name:"Forest",
        c:"#",
        hp:255
    },

    {
        name:"Rubble",
        c:":",
        hp:255
    },

    {
        name:"Grass",
        c:".",
        hp:255
    },

    {
        name:"ShotBuilding",
        c:"}",
        hp:255
    },

    {
        name:"RiverWithBoat",
        c:"b",
        hp:255
    },

    {
        name:"Ocean",
        c:"^",
        hp:255
    }
    ];
    var map=new Array(256*256);
        
        
    function addToTile(x,y,elem){
        var ta=(256*(255-y))+x;
        if(!map[ta])map[ta]=[elem];
        else map[ta].push(elem);
    }
        
    function setTile(x,y,elem){
        var ta=(256*(255-y))+x;
        map[ta]=[elem];
    }
        
    var t=0;
    var tilesByName={};
    for(t=0;t<tileCat.length;t++)tilesByName[tileCat[t].name]=tileCat[t];
    var ocean=[tilesByName["Ocean"]];
    for(t=0;t<map.length;t++)map[t]=ocean;
    t=9;
    var nPill=imap[t++];
    var nBases=imap[t++];
    var nStarts=imap[t++];		
    var pills=[];
    for(var pi=0;pi<nPill;pi++)pills.push({
        x:imap[t++],
        y:255-imap[t++],
        owner:imap[t++],
        armor:imap[t++],
        speed:imap[t++]
    });
    var bases=[];
    for(var bi=0;bi<nBases;bi++)bases.push({
        x:imap[t++],
        y:255-imap[t++],
        owner:imap[t++],
        armor:imap[t++],
        shells:imap[t++],
        mines:imap[t++]
    });
    var starts=[];
    for(var si=0;si<nStarts;si++)starts.push({
        x:imap[t++],
        y:255-imap[t++],
        dir:imap[t++]
    });
    //console.log(bmap.substring((t*2),(t*2)+64));
    for(;t<imap.length;){
        var datalen=imap[t++];
        var y=imap[t++];
        var startx=imap[t++];
        var endx=imap[t++];
		
        if((datalen==4)&&(y==255)&&(startx==255)&&(endx==255))
        {
            console.log("Found eof!");
            break;
        }
        datalen-=4;
        //console.log("se:"+startx+","+endx);
        var nibidx=0;
        var nrun=0;
        var ndif=0;
        for(var x=startx;x<endx;){
            var nib=getNib(imap,t,nibidx++);
            var rlc=nib;
			
            if(rlc<8){
                //unique run
                ndif++;
                for(var r=0;r<=rlc;r++){
                    var type=getNib(imap,t,nibidx++);
                    if(type>9)type-=8;
                    setTile(x,y,tileCat[type]);
                    x++;
                }
            }else{
                nrun++;
                //same run
                var type=getNib(imap,t,nibidx++);
                if(type>9)type-=8;
                rlc-=6;
                for(var r=0;r<rlc;r++){
                    setTile(x,y,tileCat[type]);
                    x++;
                }
            }
				
        }
        if(x!=endx){
        //console.log("Invalid x/endx."+(x-endx)+" nr:"+nrun+" ndif:"+ndif);
        }
        //else	console.log("VALID x/endx."+(x-endx)+" nr:"+nrun+" ndif:"+ndif);
        //		if(t+parseInt((nibidx+1)/2)!=t+datalen){
        //			console.log("Sizes dont match."+((t+parseInt((nibidx+1)/2))-(t+datalen)));
        //		}
        //t+=parseInt((nibidx+1)/2);
        t+=datalen;
    }
    
    var units=pills.concat(bases.concat(starts));
    for(var ui=0;ui<units.length;ui++){
        var u=units[ui];
        //console.log("Unit:"+u.x+","+u.y);
   //     addToTile(u.x,u.y,u)
    }
    
    function printMap(){
        for(var y=0;y<256;y++){
            var idx=(y*256);
            var row="";
            for(x=0;x<256;x++){
                var addr=idx+x;
                var cell=map[addr];
                if(cell.length>1)
                    row+="@";
                else{
                    var ct=cell[0].name;
                    row+=cell[0].c;
                /*
                                    if(ct=="Road")
                                    //if(ct=="River" || ct=="Ocean")
    //				if(ct=="Ocean" || ct=="River")
                                            row+="#";
                                    else if(ct=="Forest")row+="*";
                                    //	row+="#";
                                    else row+=".";
                                    //else row+=" ";
                                    //row+=cell[0].c;
                                    */
                }
            }
            console.log(row);
        }
    }
    return{
        map: map,
        pillboxes: pills,
        bases: bases,
        starts: starts
    }
})
