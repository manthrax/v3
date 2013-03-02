
require(["util/domReady!", // Waits for page load
    "display",
    "util/gl-util",
	"util",
	"programs",
	"js/bolomap.js",
	"js/meshes/testmesh.js",
	"js/textures.js",
    "js/util/gl-matrix.js",
	
], function(doc, display, glUtil,util,programs,bolomap,meshes,textures) { 
    "use strict";
    // Create gl context and start the render loop 
    var canvas = document.getElementById("canvas");
    var frame = document.getElementById("display-frame");
    var fpsCounter = document.getElementById("fps");
    var gl = glUtil.getContext(canvas);
	var objIdBase=0;
	
    var display = new display.display(gl, canvas);
	
    if(!gl) {
        // Replace the canvas with a message that instructs them on how to get a WebGL enabled browser
        glUtil.showGLFailed(frame); 
        return;
    }
	
    // If we don't set this here, the rendering will be skewed
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;    
	display.resize(gl, canvas);

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
	var objects = util.ObjectPool(GameObject);	
	
	
	function makeScene(){
		var r=50.0;//4.5;
		var z=0.0;//25;
		
		function instanceMesh(mesh,mat,onto){
			var vbase=onto.vertices.length;
			onto.vertices = onto.vertices.concat(mesh.vertices);
			var vend=onto.vertices.length;
			onto.normals = onto.normals.concat(mesh.normals);
			onto.uvs = onto.uvs.concat(mesh.uvs);
			var ibase=onto.indices.length;
			onto.indices = onto.indices.concat(mesh.indices);
			var iend=onto.indices.length;
			var vtop=vbase/3;
			for(var t=ibase;t<iend;t++){onto.indices[t]+=vtop;}
			for(var t=vbase;t<vend;t+=3){
				var vt=onto.vertices.slice(t,t+3);
				mat4.multiplyVec3(mat,vt);
				for(var i=0;i<3;i++)onto.vertices[t+i]=vt[i];
			}
		}

		function geomBatch(v,i,n,u){
		    return {
		        vertices:v?v:[],
		        indices:i?i:[],
		        normals:n?n:[],
		        uvs:u?u:[]
		    }
		}
		var planeData=geomBatch(
			[-r,-r,z,
			  r,-r,z,
			  r, r,z,
			 -r, r,z],
			[0,1,2, 2,3,0],
			[0,0,-1,
			 0,0,-1,
			 0,0,-1,
			 0,0,-1],
			[0,0, 1,0, 1,1, 0,1]);
		var shader=programs.createProgramFromTags(gl,'TNDVS','TNDFS');
		
		
		var meshList=[]
		for(var me in meshes)
			meshList.push(me);
		var meshMap={
		"Building":meshes.building,
		"River":meshes.river,
		"Swamp":meshes.grass,
		"Crater":meshes.grass,
		"Road":meshes.road01,
		"Forest":meshes.forest,
		"Rubble":meshes.dirt,
		"Grass":meshes.grass,
		"ShotBuilding":meshes.building02,
		"RiverWithBoat":meshes.river,
		"Ocean":meshes.ocean
		}
		function buildPatch(mox,moy,sz)
		{
			var batch=geomBatch();
			for(var x=-5;x<5;x++)
			for(var y=-5;y<5;y++){
				var mat=mat4.identity(mat4.create());
				mat4.translate(mat,[x*100,y*100,0.0]);
				mat4.rotateZ(mat,parseInt(Math.random()*3.99)*Math.PI*0.5);
				var scl=50.0;
				mat4.scale(mat,[scl,scl,scl]);
				var mx=x+mox;
				var my=y+moy;
				mx+=100;
				my+=100;
				if(mx<0)mx=0;else if(mx>255)mx=255;
				if(my<0)my=0;else if(my>255)my=255;
				var tid=bolomap.map[mx+(my*256)][0].name;
				var mesh=meshMap[tid];
				instanceMesh(mesh,mat,batch);
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
			objects.updateActive({tex:tex,update:function(obj){
				obj.diffuseSampler=tex;
			}});
		});
		
		var tileTexture=textures.get(gl,"tiles.png");
		var skyTexture=textures.get(gl,"tiles.png");
		
		function buildPatchObject(x,y){
			var batch=buildPatch(x,y);
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
			mat4.translate(obj.matrix,[x*100.0,y*100.0,0.0]);
			return obj;
		}
		
		function addObject(meshName,x,y){
			var obj=objects.allocate();
			var batch=geomBatch();
			mat4.identity(obj.matrix);
			instanceMesh(meshes[meshName],obj.matrix,batch);
			
			var mesh=display.mesh(gl,
				batch.vertices,
				batch.indices,
				batch.normals,
				batch.uvs);
			var meshRenderer = display.meshRenderer(gl,mesh,shader);
			
			obj.addComponent('meshRenderer',meshRenderer);
			obj.diffuseSampler=diffuse;
			
				x-=100;
				y-=100;
				
			mat4.translate(obj.matrix,[x*100.0,y*100.0,100.0]);			
		}
	//	for(var t=0;t<640;t++){
	//		genSquare(sfrnd(10),sfrnd(10),sfrnd(10),sfrnd(Math.PI),sfrnd(Math.PI));
	//	}



		for(var x=-4;x<4;x++)for(var y=-4;y<4;y++)
			buildPatchObject(x*10,y*10);//,30,3.14159,3.14159);
		
		for(var i in bolomap.bases){var base=bolomap.bases[i];
			addObject("skydome",diffuse,base.x,base.y);
		}
		for(var i in bolomap.pillboxes){var pill=bolomap.pillboxes[i];
			addObject("skydome",diffuse,pill.x,pill.y);
		}

		for(var i in bolomap.starts){var start=bolomap.starts[i];
			addObject("skydome",start.x,start.y);
		}
		
	}
	makeScene();
	function sfrnd(rng){return ((Math.random()*rng)-(rng*0.5));}
	display.createFrameRenderer = function(gl,timing){
		return {
			gl:gl,
			timing:timing,
			update:function (gobj){	//render
				//console.log("rendering.");
				var comps=gobj.components;
				display.setWorld(gobj.matrix);
				for(var i=0;i<comps.length;i++){
					var c=comps[i];
					display.renderComponent(gobj,c,c.shader);
				}
				display.renderActiveShaders();
			}
		}
	}
	
	var frameRenderer=null;
	
	display.renderFrame=function(gl,timing){

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		if(frameRenderer==null)
			frameRenderer=display.createFrameRenderer(gl,timing);
		objects.updateActive(frameRenderer);
	}
	
	glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
        fpsCounter.innerHTML = timing.framesPerSecond;		
        //gl.clearColor(1.0, 0.0, 0.1, 1.0);
		display.renderLoop(gl, timing);
    });
	
    function fullscreenchange() {
        if(document.webkitIsFullScreen || document.mozFullScreen) {
            canvas.width = screen.width;
            canvas.height = screen.height;
        } else {
            canvas.width = canvasOriginalWidth;
            canvas.height = canvasOriginalHeight;
        }
        display.resize(gl, canvas);
    }

    frame.addEventListener("webkitfullscreenchange", fullscreenchange, false);
    frame.addEventListener("mozfullscreenchange", fullscreenchange, false);
	
	
});
