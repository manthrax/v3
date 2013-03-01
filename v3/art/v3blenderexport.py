#!BPY

"""
Name: 'WebGL JavaScript (.js)'
Blender: 244
Group: 'Export'
Tooltip: 'WebGL JavaScript'
""" 

__author__ = "thrax"
__url__ = ("http://www.vectorslave.com")
__version__ = "0.0"

__bpydoc__ = """

For more information please go to mars.
"""
import Blender
from Blender import *
import bpy
import bpy
import os
from Blender.BGL import *

EVENT_NOEVENT = 1
EVENT_DRAW = 2
EVENT_EXIT = 3
EVENT_EXPORT = 4
EVENT_BROWSEFILE = 5

file_button = Draw.Create("")
export_all = None

def unspool_mesh(mesh):
	verts = []
	tris = []
	vi = 0
	vmap={}
	vimap={}
	uniqueVertexCount = 0
	#print mesh.faces[0].v[0]
	#print mesh.vertexUV
	#print dir(mesh.faces[0].verts[0])
	#print dir(mesh.faces[0].verts[0].uvco)
	hasUV=1
	for f in mesh.faces:
		uvi=0
		fvi=[]
		for v in f.verts:
			if(hasUV==1):
				uvs=f.uv
				vt = [[v.co.x,v.co.y,v.co.z],[v.no.x,v.no.y,v.no.z],[f.uv[uvi][0],1.0-f.uv[uvi][1]]]
			else:
				vt = [[v.co.x,v.co.y,v.co.z],[v.no.x,v.no.y,v.no.z],[0.5,0.5]]
			vs = str(vt)
			uvi += 1
			
			if( vs not in vimap ):
				#print "unique:"+vs
				vimap[vs] = len(verts)
				vmap[vs] = vt
				verts += [vt]
			
			fvi += [vimap[vs]]
		for i in range(1,len(fvi)-1):
			tris += [[fvi[0],fvi[i],fvi[i+1]]]
	
	indices=[]
	vertices=[]
	normals=[]
	uvs=[]
	strided=[]
	for t in tris:
		indices+=t
	for v in verts:
		vertices+=v[0]
		normals+=v[1]

		uvs+=v[2]
		strided+=v[0]+v[1]+v[2]
	#print strided
	#print indices
	
	return {'v':vertices,'i':indices,'n':normals,'u':uvs}


def export_native(class_name, mesh):
	
	m = unspool_mesh(mesh)
	
	
	print "unspooled mesh:"+class_name
	s=class_name+":{\n"
	s+="vertices:"+str(m['v'])+",\n"
	s+="indices:"+str(m['i'])+",\n"
	s+="normals:"+str(m['n'])+",\n"
	s+="uvs:"+str(m['u'])+"\n"
	s+="},\n"
	return s


def event(evt, val):
	if (evt == Draw.QKEY and not val):
		Draw.Exit()

def bevent(evt):
	global EVENT_NOEVENT,EVENT_DRAW,EVENT_EXIT
	
	if (evt == EVENT_EXIT):
		Draw.Exit()
	elif (evt== EVENT_DRAW):
		Draw.Redraw()
	elif (evt== EVENT_EXPORT):
		fname = file_button.val
		if(fname==''):
			fname = 'C:/Users/thrax/Documents/NetBeansProjects/v3/web/js/meshes/testmesh.js'
		out = file(fname, 'w')
		sce = bpy.data.scenes.active
		
		data_string = ""
		data_string += "define(function(){return{\n";
	
		#ob = sce.objects.active
		#mesh = Mesh.New()        
		#mesh.getFromObject(ob.name)
		#class_name = ob.name.replace(".", "")
		#data_string = export_native(class_name, mesh)

		for ob in sce.objects.selected:
			class_name = ob.name.replace(".", "")
		
			mesh = ob.getData(mesh=1)		
			data_string += export_native(class_name, mesh)
		data_string+="}});\n"
		
			
		out.write(data_string)
		out.close()
		
		Draw.PupMenu("Export Successful")
	elif (evt== EVENT_BROWSEFILE):
		Window.FileSelector(FileSelected,"Export .js", exp_file_name)
		Draw.Redraw(1)


def FileSelected(file_name):
	global file_button
	if file_name != '':
		file_button.val = file_name
	else:
		cutils.Debug.Debug('ERROR: filename is empty','ERROR')

def draw():
	global file_button, exp_file_name
	global exp_normals
	global EVENT_NOEVENT, EVENT_DRAW, EVENT_EXIT, EVENT_EXPORT
	exp_file_name = ""

	glClear(GL_COLOR_BUFFER_BIT)
	glRasterPos2i(40, 240)

	file_button = Draw.String('File location: ', EVENT_NOEVENT, 40, 70, 250, 20, file_button.val, 255) 
	Draw.PushButton('...', EVENT_BROWSEFILE, 300, 70, 30, 20, 'browse file')
	exp_normals = Draw.Toggle('Export normals', EVENT_NOEVENT, 40, 45, 200, 20, 0)
	
	
	Draw.Button("Export",EVENT_EXPORT , 40, 20, 80, 18)
	Draw.Button("Exit",EVENT_EXIT , 140, 20, 80, 18)
	
Draw.Register(draw, event, bevent)