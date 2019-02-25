var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];
//Creates a new identity quat
var rot = quat.create([0.0, 0.0, 0.0, 1.0]);

var lastCamera = vec3.create();
lastCamera.set([0.0, 0.0, 3]);

//fogdensity
var fogden=0.15;

var Plane = {
  coverEl: document.getElementById('cover'),
  contentEl: document.getElementById('content'),
  fullscreen: false,
  velocity: 0.001,
  rows: 100,
  cols: 100,
  gridSpacing: 2,
  left: false,
  right: false,
  up: false,
  down: false,
  yaw_right: false,
  yaw_left:  false,
  fogon: true,
  fogoff: false,
  acc: false,
  dec: false
}
//-------------------------------------------------------------------------
/**
 * Populates terrain buffers for terrain generation
 */
function setupTerrainBuffers() {
    
    var vTerrain=[];	//vertex
    var fTerrain=[];	//triangle face	
    var nTerrain=[];	//normal
    var eTerrain=[];	//line edge
    var gridN=Math.pow(2, 7) + 1;  //n^2+1		
    var max=Math.pow(2, 7)
    // 2D heightarray
    var heightArray = new Array(gridN);
    for(var i = 0; i < gridN; i++){
        heightArray[i]= new Array(gridN);
    }
    heightArray[0][0] = 0.05;
    heightArray[max][0] = 0.01;
    heightArray[0][max] = 0.03;
    heightArray[max][max] = 0.02;
   
    //generate the heightArray using dimondsquare algorithm
    generateheightwithDimondSquare(heightArray,0,0,max,max,max,0.3);

    var terrain_size = 5;
    var numT = terrainFromIteration(gridN-1, -terrain_size, terrain_size, -terrain_size, terrain_size, vTerrain, fTerrain, nTerrain,heightArray);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;    
}

//-------------------------------------------------------------------------
/**
 * Draws terrain from populated buffers
 */
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
/**
 * Draws edge of terrain from the edge buffer
 */
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");  
  shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
  shaderProgram.uniformFogDensity=gl.getUniformLocation(shaderProgram, "uFogDensity");
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * set material information to shader
 */
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColor, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColor, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColor, s);
}


//-------------------------------------------------------------------------
/**
 * set updated fogdensity to shader
 */
function uploadFogdenToShader(f) {
  gl.uniform1f(shaderProgram.uniformFogDensity, f);
}
//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.41,-0.34,-7.5);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));     
    setMatrixUniforms();
    
    //set color
    var Ia = vec3.fromValues(1.0,1.0,0.0);
    var Id = vec3.fromValues(1.0,1.0,0.0);
    var Is = vec3.fromValues(1.0,1.0,0.0);
    
    var lightPosEye4 = vec4.fromValues(20.0,20.0,0.0,1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    //console.log(vec4.str(lightPosEye4))
    var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
    //set material  
    var transformVec = vec3.create();
    var ka = vec3.fromValues(0.0,0.0,0.0);
    var kd = vec3.fromValues(0.65,0.65,0.0);
    var ks = vec3.fromValues(0.45,0.45,0.0);
    mvPushMatrix();
    vec3.set(transformVec,10,10,10);
    mat4.scale(mvMatrix, mvMatrix,transformVec);

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      uploadLightsToShader([1,1,2],[0.22,0.42,0.44],[0.0,0.22,0.44],[0.0,0.0,1.0]);
      drawTerrain();
    }
   
    if(document.getElementById("wirepoly").checked){
      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    
    if(document.getElementById("wireframe").checked){
      uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    mvPopMatrix();
  
}

//this function helps us roll right or left 
//----------------------------------------------------------------------------------
function roll(degree) {
  //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();  
  //It would more accurate to say that roll is rotation around the direction you are facing. (-z in my case)
  //If you imagine a local coordinate system in which you are looking down the z axis with y being the "up" ,  
  //then roll is rotation around z and pitch would be rotation around x.
  //The key thing to remember is that the operations are always in terms of the local frame of the viewer
  //use quat.setAxisAngle to update workingQuat with a roll rotation (about z axis)
  //setAxisAngle(out, axis, rad) Sets a quat from the given angle and rotation axis, then returns it.
  //the axis around which to rotate
  quat.setAxisAngle(workingQuat, viewDir, rad);

  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}

//this function helps us pitch up or down 
//----------------------------------------------------------------------------------
function pitch(degree) {
  //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();

  var vecTemp = vec3.create();
  vec3.cross(vecTemp, viewDir, up);//z cross y ->x

  //use quat.setAxisAngle to update workingQuat with a pitch rotation (about x axis)
  //setAxisAngle(out, axis, rad) Sets a quat from the given angle and rotation axis, then returns it.
  //the axis around which to rotate
  quat.setAxisAngle(workingQuat, vecTemp, rad);
 
  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}


//this function helps us turn right or left directions
//----------------------------------------------------------------------------------
function yaw(degree) {
    //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();
  //use quat.setAxisAngle to update workingQuat with a yaw rotation (about y axis)
  quat.setAxisAngle(workingQuat, up, rad);

  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);    
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
   // Get the current direction.
  vec3.normalize(viewDir, viewDir);
 
  vec3.scale(viewDir, viewDir, Plane.velocity);

  // Save the last camera position.
  lastCamera.set(eyePt);

  // Normalize the up vector before applying scaling.
  vec3.normalize(up, up);

  // Apply rotation transformations to the direction vector.
  if (Plane.left){
    // Calculate the change after the left key is pressed
    roll(-4);
    console.log("it actually turned!");
  }else if (Plane.right){
    // Calculate the change after the left key is pressed
    roll(4);
    console.log("it turned right!");
  }

  if (Plane.up){
    // Calculate the change after the left key is pressed
    pitch(4);
    console.log("it pitched up");
  }else if (Plane.down){
    // Calculate the change after the left key is pressed  
    pitch(-4);
    console.log("it pitched down!");
  }
    
  if (Plane.yaw_right){
    yaw(-0.01);  
  }else if(Plane.yaw_left){
    yaw(0.01);   
  }
  
  if (Plane.acc){
     Plane.velocity=Plane.velocity*1.013; 
  }else if(Plane.dec){
     Plane.velocity=Plane.velocity*0.99; 
  }

  if(Plane.fogon){
    fogden=0.15;
    uploadFogdenToShader(fogden);
  }else if(Plane.fogoff){
    fogden=0.0000;
    uploadFogdenToShader(fogden);
  }

  // Update the current vector
  vec3.add(eyePt, eyePt, viewDir);
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.1, 0.2, 0.3, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}


/**
 * Trigger flight controls for navigation when keys are pressed.
 *
 * @param {Event} e The keyseydown event.
 */
//----------------------------------------------------------------------------------
document.onkeydown = function (e){
  if (e.keyCode === 37) {
    //move left arrow
    Plane.left = true;
    Plane.right = false;
    console.log("moved left")
  } else if (e.keyCode === 38) {
    //move up arrow
    Plane.up = true;
    Plane.down = false;
    console.log("moved up");
  } else if (e.keyCode === 39) {
    //move right arrow
    Plane.left = false;
    Plane.right = true;
    console.log("moved right");
  } else if (e.keyCode === 40) {
    //move down arrow
    Plane.up = false;
    Plane.down = true;
    console.log("moved down");
  }else if (e.keyCode === 65) {
    //turn left A
    Plane.yaw_left = true;
    Plane.yaw_right = false;
    console.log("yaw left");
  }else if (e.keyCode === 68) {
    //move right D
    Plane.yaw_left = false;
    Plane.yaw_right = true;
    console.log("yaw right");
  }else if (e.keyCode === 187) {
    //acc +
    Plane.acc = true;
    Plane.dec = false;   
    console.log("acc");
  }else if (e.keyCode === 189) {
    //dece -
    Plane.acc = false;
    Plane.dec = true;   
    console.log("dec");
  }else if (e.keyCode === 90) {
    //fog on z
    Plane.fogon= true;
    Plane.fogoff= false;
    console.log("turn fog on");
  }else if (e.keyCode === 88) {
    //fog off x
    Plane.fogon= false;
    Plane.fogoff= true;
    console.log("turn fog off");
  }
           
}

/**
 * Trigger flight controls for navigation when arrow keys are released.
 *
 * @param {Event} e The keyseyup event.
 */
document.onkeyup = function(e){
  if (e.keyCode === 37) {
    //move left
    Plane.left = false;
  } else if (e.keyCode === 38) {
    //move up
    Plane.up = false;
  } else if (e.keyCode === 39) {
    //move right
    Plane.right = false;
  } else if (e.keyCode === 40) {
    //move down
    Plane.down = false;
  } else if (e.keyCode === 65) {
    //yaw left
    Plane.yaw_left = false; 
  }else if (e.keyCode === 68) {
    //yaw right
    Plane.yaw_right = false;
  }else if (e.keyCode === 187) {
    //acclerate
    Plane.acc = false; 
  }else if (e.keyCode === 189) {
    //declerate
    Plane.dec = false;
  }else if (e.keyCode === 90) {
    //fog on z
    Plane.fogon= true;
    Plane.fogoff= false;
  }else if (e.keyCode === 88) {
    //fog off x
    Plane.fogon= false;
    Plane.fogoff= true;
  }
    
  if ((e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode === 65 || e.keyCode === 68) {
    //reset
    rot = quat.create([0.0, 0.0, 0.0, 1.0]);
  }
}
