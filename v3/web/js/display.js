
define([
    "camera",
    "util/gl-util",
    "js/util/gl-matrix.js" //    "js/bolomap.js"
], function(camera, glUtil) {
    "use strict";
	
	var vaoExtension=null;
	
	// pre-allocate a bunch of arrays
	var orthoWorld = new Float32Array(16);
	var orthoView = new Float32Array(16);
	var orthoProjection = new Float32Array(16);

	var orthoWorldInverse = new Float32Array(16);
	var orthoViewProjection = new Float32Array(16);
	var orthoWorldViewProjection = new Float32Array(16);

	var orthoViewInverse = new Float32Array(16);
	var orthoProjectionInverse = new Float32Array(16);
	var orthoViewProjectionInverse = new Float32Array(16);
	var orthoWorldInverseTranspose = new Float32Array(16);

	var screenToRT=new Float32Array(2);
	var world = new Float32Array(16);
	var view = new Float32Array(16);
	var projection = new Float32Array(16);
	var cameraMatrix = new Float32Array(16);
	var frustumFarCorners = new Float32Array(16);

	var viewProjection = new Float32Array(16);
	var worldViewProjection = new Float32Array(16);
	var worldViewProjectionInverse = new Float32Array(16);

	var viewInverse = new Float32Array(16);
	var projectionInverse = new Float32Array(16);
	var viewProjectionInverse = new Float32Array(16);
	var worldInverse = new Float32Array(16);
	var worldInverseTranspose = new Float32Array(16);
	var viewInverseTranspose = new Float32Array(16);
	
	var _display;
	function v3cp(to,from){
		if(!from)return [to[0],to[1],to[2]];
		to[0]=from[0];
		to[1]=from[1];
		to[2]=from[2];
		return to;
	}
    var display = function (gl, canvas) {
		vaoExtension = gl.getExtension("OES_vertex_array_object");
        _display=this;
		this.camera = new camera.FlyingCamera(canvas);
        /*this.camera = new camera.ModelCamera(canvas);
        this.camera.distance = 4;
        this.camera.setCenter([0, 0, 1]);
        */
		
		this.fov = 45;
		canvas.gl = gl;
		display.prototype.fov=this.fov;
        mat4.perspective(this.fov, canvas.width/canvas.height, 0.1, 4096.0, projection);

        gl.clearColor(0.1, 0.1, 0.1, 0.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
       // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	   
	   loadSession();
    };
	
	display.prototype.world=world;
	display.prototype.view=view;
	display.prototype.projection=projection;
	display.prototype.viewProjectionInverse=viewProjectionInverse;
	display.prototype.worldInverseTranspose=worldInverseTranspose;
	display.prototype.worldViewProjection=worldViewProjection;
	
	display.prototype.seconds=0.0;
    display.prototype.resize = function (gl, canvas) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        mat4.perspective(this.fov, canvas.width/canvas.height, 0.1, 4096.0, projection);
    };
	window.onresize=function(){
		display.prototype.resize(canvas.gl,canvas);
	}
	window.loadSession=function(){
		var state=localStorage.state;
		if(!state)
			return;
		state = JSON.parse(state);
		v3cp(_display.camera._position , state.cameraPosition);
		v3cp(_display.camera._angles , state.cameraAngles);
	}
	window.saveSession=function(){
		console.log('display app closed.');
		var state={
			cameraPosition:v3cp(_display.camera._position),
			cameraAngles:v3cp(_display.camera._angles)
		}
		localStorage.state=JSON.stringify(state);
	}
	function orthoLookAt(at,from,up,rng,dpth){
		mat4.translation(orthoWorld, [0,0,0]);
		mat4.inverse(world,orthoWorldInverse);
		mat4.transpose(orthoWorldInverse,orthoWorldInverseTranspose);
		var cw=0.5;//canvas.clientWidth*0.5;
		var ch=0.5;//canvas.clientHeight*0.5;
		if(rng)cw=ch=rng;
		mat4.ortho(orthoProjection, -cw,cw,-ch,ch, 0.0, dpth?dpth:g_FarZ);
		mat4.lookAt( orthoView, at, from, up);
		mat4.inverse(orthoViewInverse, orthoView);
		mat4.inverse(orthoProjectionInverse, orthoProjection);
		mat4.multiply(orthoView, orthoProjection, orthoViewProjection);
		mat4.inverse(orthoViewProjectionInverse, orthoViewProjection);
		mat4.multiply(orthoWorld, orthoViewProjection, orthoWorldViewProjection);
	}
	function nv3(){return [0,0,0];}
	var v3t0=nv3();
	var v3t1=nv3();
	var v3t2=nv3();
	var v3t3=nv3();
	var v3t4=nv3();
	var v3t5=nv3();
	var v3t6=nv3();
	var v3t7=nv3();
	var v3t8=nv3();
	var v3t9=nv3();
	
	function setViewProjection(view,projection){
		
		mat4.inverse(view,viewInverse);
		mat4.transpose(viewInverse,viewInverseTranspose);
		mat4.inverse(projection,projectionInverse);
		mat4.multiply(projection, view, viewProjection);
		mat4.inverse( viewProjection,viewProjectionInverse);
		
		//Compute frustum
		/*
		fast.matrix4.getAxis(v3t3, viewInverse, 0); // x
		fast.matrix4.getAxis(v3t4, viewInverse, 1); // y;
		fast.matrix4.getAxis(v3t5, viewInverse, 2); // z;
		fast.matrix4.getAxis(v3t6, viewInverse, 3); // z;


		matrixSetRowVector3(cameraMatrix,0,v3t3)
		matrixSetRowVector3(cameraMatrix,1,v3t4)
		matrixSetRowVector3(cameraMatrix,2,v3t5)
		matrixSetRowVector3(cameraMatrix,3,g_eyePosition);
		cameraMatrix[15]=1.0;
		*/
		//mat4.transpose(viewInverse,cameraMatrix);
		
		mat4.getRowV3(viewInverse, 0,v3t3); // x
		mat4.getRowV3(viewInverse, 1,v3t4 ); // y;
		mat4.getRowV3(viewInverse, 2,v3t5 ); // z;
		mat4.getRowV3(viewInverse, 3,v3t6 ); // z;
	
	}

	function setWorld(nworld){
		mat4.set(nworld,world);
		mat4.inverse(world,worldInverse);
		mat4.transpose(worldInverse,worldInverseTranspose);
		
		
		mat4.multiply(viewProjection, world, worldViewProjection);
		mat4.inverse(worldViewProjection,worldViewProjectionInverse);
	}

	display.prototype.setWorld=setWorld;
	display.prototype.setViewProjection=setViewProjection;
	
	display.renderFrame=function(gl,timing){
		alert("Display:renderFrame is not overridden!");
		
	}
	
    display.prototype.renderLoop = function (gl, timing) {
//        gl.clearColor(0.0, 0.0, 0.1, 1.0);
        this.camera.update(timing.frameTime);
		display.prototype.seconds = timing.time/1000.0;
		setViewProjection(this.camera.getViewMat(),projection);
   //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);		
		this.renderFrame(gl,timing);
    }
	
	
	function newBuffer(gl,type,data){
		var buf=gl.createBuffer();
		gl.bindBuffer(type, buf);
		gl.bufferData(type,data,gl.STATIC_DRAW);
		return buf;
	}
	
	function bindVAABuffer(gl,buf,attrib,ecount,stride){
		gl.enableVertexAttribArray(attrib);
		gl.bindBuffer(gl.ARRAY_BUFFER,buf);
		gl.vertexAttribPointer(attrib, ecount, gl.FLOAT, false, stride,0);
	}
	
	
	var	renderedShaders=[];
	var renderedShaderTop=0;
	display.prototype.renderActiveShaders=function(){
		for(var t=0;t<renderedShaderTop;t++){
			renderedShaders[t].render();
		}
		renderedShaderTop=0;
	}
	
	display.prototype.renderComponent=function(object,component,shader){
		if(shader.displayTop==0){
			if(renderedShaders.length==renderedShaderTop)
				renderedShaders.push(shader);
			else
				renderedShaders[renderedShaderTop]=shader;
			renderedShaderTop++;
		}
		shader.addToDisplayList(object,component);
	}
	
	display.prototype.buildMeshAO=function(gl,mesh,shader){		
		var vao=vaoExtension.createVertexArrayOES();
		vaoExtension.bindVertexArrayOES(vao);
		if(mesh.vertices)
			bindVAABuffer(gl,mesh.vertices,shader.attribLoc.position,3,12);
		if(mesh.normals)
			bindVAABuffer(gl,mesh.normals,shader.attribLoc.normal,3,12);
		if(mesh.uvs)
			bindVAABuffer(gl,mesh.uvs,shader.attribLoc.texCoord,2,8);
		if(mesh.indices)
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
		vaoExtension.bindVertexArrayOES(null);
		return vao;
		
	}
	
	display.prototype.meshRenderer=function(gl,mesh,shader){
		var disp=this;
		var meshRend = {
			vao:this.buildMeshAO(gl,mesh,shader),
			mesh:mesh,
			shader:shader,
			render:function(go){
				
				vaoExtension.bindVertexArrayOES(this.vao);
					
				disp.setWorld(go.matrix);
				//Bind our uniforms...
				var uniforms=this.shader.uniform;
				var shader=this.shader;
				for(var u in uniforms){
					
					if(go[u]!=undefined){
						shader.setUniform(u,go[u]);
					}else if(display.prototype[u]!=undefined){
						shader.setUniform(u,display.prototype[u]);					
					}else if(this[u]!=undefined){
						shader.setUniform(u,this[u]);
					}else if(shader[u]!=undefined){
						shader.setUniform(u,shader[u]);
					}else{
						console.log("Shader:"+shader.name+" Uniform:"+u+" is undefined.");
						debugger;
					}
				}
				//Render our submeshes...
				
				gl.drawElements(gl.TRIANGLES,this.mesh.elemCount*3,gl.UNSIGNED_SHORT,0);
				//this.renderComponent(go,this,shader);
				vaoExtension.bindVertexArrayOES(null);
			}
		}
		
		return meshRend;
	}
	
	
	display.prototype.mesh=function(gl,vertices,indices,normals,uvs){
		var m = {};
		if(vertices)m.vertices=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(vertices));
		if(normals)m.normals=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(normals));
		if(uvs)m.uvs=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(uvs));
		if(indices){
			m.indices=newBuffer(gl,gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
			m.elemCount=indices.length/3;
		}
		return m;
	};
    return {
        display: display
    };
});




	/*

	tdl.models.Model.prototype.applyUniforms_ = function(opt_uniforms) {
	  if (opt_uniforms) {
		var program = this.program;
		for (var uniform in opt_uniforms) {
		  program.setUniform(uniform, opt_uniforms[uniform]);
		}
	  }
	};
*/
	/**
	 * Sets up the shared parts of drawing this model. Uses the
	 * program, binds the buffers, sets the textures.
	 *
	 * @param {!Object.<string, *>} opt_uniforms An object of names to
	 *     values to set on this models uniforms.
	 * @param {!Object.<string, *>} opt_textures An object of names to
	 *     textures to set on this models uniforms.
	 */
	 /*
	tdl.models.Model.prototype.drawPrep = function() {
	  var program = this.program;
	  var buffers = this.buffers;
	  var textures = this.textures;

	  program.use();
	  for (var buffer in buffers) {
		var b = buffers[buffer];
		if (buffer == 'indices') {
		  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.buffer());
		} else {
		  var attrib = program.attrib[buffer];
		  if (attrib) {
			attrib(b);
		  }
		}
	  }

	  this.applyUniforms_(textures);
	  for (var ii = 0; ii < arguments.length; ++ii) {
		this.applyUniforms_(arguments[ii]);
	  }
	};
*/
	/**
	 * Draws this model.
	 *
	 * After calling tdl.models.Model.drawPrep you can call this
	 * function multiple times to draw this model.
	 *
	 * @param {!Object.<string, *>} opt_uniforms An object of names to
	 *     values to set on this models uniforms.
	 * @param {!Object.<string, *>} opt_textures An object of names to
	 *     textures to set on this models uniforms.
	 */
	 /*
	tdl.models.Model.prototype.draw = function() {
	  for (var ii = 0; ii < arguments.length; ++ii) {
		this.applyUniforms_(arguments[ii]);
	  }

	  var buffers = this.buffers;
	  gl.drawElements(
		  this.mode, buffers.indices.totalComponents(), gl.UNSIGNED_SHORT, 0);
	};
*/