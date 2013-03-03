
define([
//    "display",
    "util/gl-util",
    "util",
    "programs",
    "js/bolomap.js",
    "js/meshes/testmesh.js",
    "js/util/gl-matrix.js"
    ], 
    function(glUtil,util,programs,bolomap,meshes) {//display, 
        
        var GameObject=function(){
            var go={
                id:objIdBase++,
                matrix:mat4.identity(mat4.create()),
                components:[],
                addComponent: function(name,comp){
                    this[name]=comp;
                    this.components.push(comp);
                }
            }
            return go;
        }
        
        var objIdBase=0;
        var objects = util.ObjectPool(GameObject);
        var frameRenderer=null;
	var tileDim = 50.0;
	var tileScale = tileDim/2.0;
        var mapOrigin=[120,130];
        
        function update(gl,display,timing){
            if(frameRenderer==null)
                frameRenderer=display.createFrameRenderer(gl,timing);
            objects.updateActive(frameRenderer);
        }
        
        function makeScene(gl,display){

            var shader=programs.createProgramFromTags(gl,'TNDVS','TNDFS');
		
		
            var meshList=[]
            for(var me in meshes)
                meshList.push(me);
            var meshMap={
                "Building":meshes.building,
                "River":meshes.river,
                "Swamp":meshes.grass,
                "Crater":meshes.grass,
                "Road":meshes.road,
                "Forest":meshes.forest,
                "Rubble":meshes.crater,
                "Grass":meshes.grass,
                "ShotBuilding":meshes.building02,
                "RiverWithBoat":meshes.river,
                "Ocean":meshes.ocean
            }
            function getTile(x,y){
                x+=mapOrigin[0];
                y+=mapOrigin[1];
                if(x<0)x=0;
                else if(x>255)x=255;
                if(y<0)y=0;
                else if(y>255)y=255;
                return bolomap.map[x+(y*256)];
            }
            function getNeighborsOfName(mx,my,name){
                var dbits=0;
                if(getTile(mx,my-1)[0].name==name)dbits|=1;
                if(getTile(mx+1,my)[0].name==name)dbits|=2;
                if(getTile(mx,my+1)[0].name==name)dbits|=4;
                if(getTile(mx-1,my)[0].name==name)dbits|=8;
                return dbits;
            }
            function buildPatch(mox,moy,patchRad)
            {
                var batch=display.geomBatch();
                for(var x=-patchRad;x<patchRad;x++)
                    for(var y=-patchRad;y<patchRad;y++){
                        var mat=mat4.identity(mat4.create());
                        mat4.translate(mat,[x*tileDim,y*tileDim,0.0]);

                        var mx=x+mox;
                        var my=y+moy;
                        var tid=getTile(mx,my)[0].name;
                        var mesh=meshMap[tid];
                        var directional=false;
                        var meshBase="";
                        if(tid=="Road"){
                            // instanceMesh(meshes.crater,mat,batch);
                            directional=true;
                            meshBase="road";
                        }else if(tid=="River"){
                            directional=true;
                            meshBase="river";
                        }else if(tid=="Building"){
                            directional=true;
                            meshBase="building";
                        }
                        var dirLUT={
                            0:["",0],
                            1:["0",2],
                            2:["0",3],
                            4:["0",0],
                            8:["0",1],

                            3:["01",3],
                            6:["01",0],
                            12:["01",1],
                            9:["01",2],

                            5:["02",0],
                            10:["02",1],

                            7:["012",0],
                            14:["012",1],
                            13:["012",2],
                            11:["012",3],

                            15:["0123",0],

                        }
                        if(directional){
                            var dbits=getNeighborsOfName(mx,my,tid);
                            if(tid=="River"){
                                dbits|=getNeighborsOfName(mx,my,"Ocean");
                            }
                            var tdata=dirLUT[dbits];
                            var meshName=meshBase+tdata[0];
                            if(tid=="Building"&&tdata[0]!="02")meshName="building";
                            else if(tid=="River"&&tdata[0]=="0123")meshName="river";
                            else if(tid=="Road"&&tdata[0]=="0123")meshName="road";
                            mesh = meshes[meshName];
                            mat4.rotateZ(mat,tdata[1]*Math.PI*0.5);
                        }else{
                            mat4.rotateZ(mat,parseInt(Math.random()*3.99)*Math.PI*0.5);
                        }
                        var scl=tileScale;
                        mat4.scale(mat,[scl,scl,scl]);
                        display.instanceMesh(mesh,mat,batch);
                    }
                return batch;
            }

            function bindToUnit(unit){
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, this);
            }
            var diffuse=glUtil.createSolidTexture(gl,[0,0,0,0]);
            diffuse.bindToUnit=bindToUnit;
            var tex=glUtil.loadTexture(gl,"tiles.png",function(glTex){
                tex.bindToUnit=bindToUnit;
                objects.updateActive({
                    tex:tex,
                    update:function(obj){
                        obj.diffuseSampler=tex;
                    }
                });
            });

            //var tileTexture=textures.get(gl,"tiles.png");
            //var skyTexture=textures.get(gl,"tiles.png");

            function buildPatchObject(x,y,patchRad){
                var batch=buildPatch(x,y,patchRad);
                var mesh=display.mesh(gl,
                    batch.vertices,
                    batch.indices,
                    batch.normals,
                    batch.uvs);
                var meshRenderer = display.meshRenderer(gl,mesh,shader);
                var obj=objects.allocate();
                obj.addComponent('meshRenderer',meshRenderer);
                obj.diffuseSampler=diffuse;
                mat4.identity(obj.matrix);
                //mat4.scale(obj.matrix,[sfrnd(10),sfrnd(10),sfrnd(10)]);
                mat4.translate(obj.matrix,[x*tileDim,y*tileDim,0.0]);
                return obj;
            }

            function addObject(meshName,diffuse,x,y){
                var obj=objects.allocate();
                var batch=display.geomBatch();
                mat4.identity(obj.matrix);    
                var scl=tileScale;
                mat4.scale(obj.matrix,[scl,scl,scl]);
                display.instanceMesh(meshes[meshName],obj.matrix,batch);

                var mesh=display.mesh(gl,
                    batch.vertices,
                    batch.indices,
                    batch.normals,
                    batch.uvs);
                var meshRenderer = display.meshRenderer(gl,mesh,shader);

                obj.addComponent('meshRenderer',meshRenderer);
                obj.diffuseSampler=diffuse;

                x-=mapOrigin[0];
                y-=mapOrigin[1];

                mat4.identity(obj.matrix);
                mat4.translate(obj.matrix,[x*tileDim,y*tileDim,0.0]);	
            }
            //	for(var t=0;t<640;t++){
            //		genSquare(sfrnd(10),sfrnd(10),sfrnd(10),sfrnd(Math.PI),sfrnd(Math.PI));
            //	}
            var patchRad=8;
            var rgnRad=5;
            for(var x=-patchRad;x<patchRad;x++)for(var y=-patchRad;y<patchRad;y++){
                //if((x&1)!=(y&1))
                    buildPatchObject(x*(rgnRad*2),y*(rgnRad*2),rgnRad);//,30,3.14159,3.14159);
            }
            for(var i in bolomap.bases){
                var base=bolomap.bases[i];
                addObject("base",diffuse,base.x,base.y);
            }
            for(var i in bolomap.pillboxes){
                var pill=bolomap.pillboxes[i];
                addObject("turret",diffuse,pill.x,pill.y);
            }

            for(var i in bolomap.starts){
                var start=bolomap.starts[i];
                addObject("boat",diffuse,start.x,start.y);
            }

        }
        return{
            makeScene: makeScene,
            update: update
        }
    }
    );