
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//Create Normal matrix
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var cubeImage;
var cubeTexture;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(1.0,1.0,1.0);
var globalQuat = quat.create();

// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);
var modelZRotationRadians = degToRad(0);

//global
ready_to_draw = false;

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Generates and sends the normal matrix to the shader  
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
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

//Pass the view direction vector to shader 
function uploadViewDirToShader(){
  gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}

//Pass the rotation matrix to shader so that reflections work as the teapot spins
function uploadRotateMatrixToShader(rotateMat){
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uRotateMat"), false, rotateMat);
}

/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

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

//Pass bool variable to shader program. 
//Shading color is different for the teapot and the skybox, 
//it is necessary to switch between the settings when shading.
function switchShaders(forskybox){
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsSkybox"), forskybox);
}

function switchreflect(onoroff){
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsreflective"), onoroff);
}
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

  
  //shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
  //console.log("Tex coord attrib: ", shaderProgram.texCoordAttribute);
  //gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);
    
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  // Enable vertex normals
  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
  // Enable matrix manipulations  
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  // Enable Phong Shading options
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//Setup the draw buffers for skybox and teapot
function setupBuffers(){
  setupcubebuf();
  readTextFile("teapot_0.obj", setupTeapotBuffers);
}

//Setup the cubemap texture for the skybox 
function setupCubeMap() {
  //Initialize the Cube Map, and set its parameters
  cubeTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture); 
  
  //Set texture parameters
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, 
          gl.LINEAR); 
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,    
          gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    
    // Load each cube map face
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeTexture, 'posx.jpg');  
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeTexture, 'negx.jpg');    
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeTexture, 'posy.jpg');  
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeTexture, 'negy.jpg');  
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeTexture, 'posz.jpg');  
  loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeTexture, 'negz.jpg'); 
}

//Bind images to a specific side of the cubemap
function loadCubeMapFace(gl, target, texture, url){
    
    var image = new Image();
    image.onload = function(){

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    image.src = url;
}


/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
//Load the image to a face of the cubemap.
//but given if we know the img size, this func can be skip
function handleTextureLoaded(image, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  
  var bool1=  ( (image.width & (image.width - 1))==0  )
  var bool2=  ( (image.height & (image.height - 1)) ==0  )

  /// Check if the image is a power of 2 in both dimensions, whether there will be a minification
  if (bool1 && bool2) {
    //// Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
    // Wrapping mode to clamp edge
    // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  //make the highest quality filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Draw call that applies matrix transformations to cube
 */
//Set camera location and view direction, help to render the skybox and teapot
function draw() { 
    var translateVec = vec3.create();
    var scaleVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    uploadViewDirToShader();

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(75), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    //Draw 
    // Setup the scene and camera
    
    var rotateMat = mat4.create();
    // Rotatation for orbitting around the teapot
    mat4.rotateY(rotateMat, rotateMat, 0);
    mvPushMatrix();
    mat4.rotateY(rotateMat, rotateMat, modelYRotationRadians);
    mat4.rotateX(rotateMat, rotateMat, modelXRotationRadians);
    mat4.rotateZ(rotateMat, rotateMat, modelZRotationRadians);
    uploadRotateMatrixToShader(rotateMat);
    vec3.set(translateVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,translateVec);
    setMatrixUniforms();
    // Calculate view point from eye point and view direction
    vec3.add(viewPt, eyePt, viewDir);
    // Generate the lookat matrix and initialize the model-view matrix
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
  
   if(document.getElementById("reflectyes").checked){
      switchreflect(false);
    }
    if(document.getElementById("reflectno").checked){
      switchreflect(true);
    } 
  // Setup lights
  //in other words, the color that teapot will show out
  uploadLightsToShader([88,88,88],[0.0,0.0,0.0],[0.6,0.6,0.6],[0.08,0.08,0.08]);
  
  // render the skybox
    drawSkybox();

  // if the teapot file has been successfully loaded, render the teapot
  if (ready_to_draw){
    mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
    mat4.rotateX(mvMatrix,mvMatrix,modelXRotationRadians);
    mat4.rotateZ(mvMatrix,mvMatrix,modelZRotationRadians);
    drawTeapot();

    
  }
    mvPopMatrix();
  
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
//my animate function: rotate
function animate() {
    if (then==0)
    {
      then = Date.now();
    }
    else
    {
    now=Date.now();
    // Convert to seconds
    now *= 0.002;
    // Remember the current time for the next frame.
    then = now;  
    //Animate the rotation
    //modelXRotationRadians += 1.2 * deltaTime;
    //modelYRotationRadians += 0.7 * deltaTime; 
    }
}


/**
 * Startup function called from html code to start program.
 */
//Doing the initialization work of the program and kicking off the animation callback
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  setupShaders();
  setupBuffers();
  setupCubeMap();
  tick();
}

/**
 * Tick called for every animation frame.
 */
//Callback function to perform draw each frame
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

//Function to setup the vertex and tri-index buffers for the skybox cube.

function setupcubebuf() {

  // Create a buffer for the cube's vertices.
  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeverticBuffer as the one to apply vertex
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.
  var vertices = [
    //the lecture example use 1.0 which is too small
    //so we need to scale it
    // Front face
    -88.0, -88.0,  88.0,
     88.0, -88.0,  88.0,
     88.0,  88.0,  88.0,
    -88.0,  88.0,  88.0,

    // Back face
    -88.0, -88.0, -88.0,
    -88.0,  88.0, -88.0,
     88.0,  88.0, -88.0,
     88.0, -88.0, -88.0,

    // Top face
    -88.0,  88.0, -88.0,
    -88.0,  88.0,  88.0,
     88.0,  88.0,  88.0,
     88.0,  88.0, -88.0,

    // Bottom face
    -88.0, -88.0, -88.0,
     88.0, -88.0, -88.0,
     88.0, -88.0,  88.0,
    -88.0, -88.0,  88.0,

    // Right face
     88.0, -88.0, -88.0,
     88.0,  88.0, -88.0,
     88.0,  88.0,  88.0,
     88.0, -88.0,  88.0,

    // Left face
    -88.0, -88.0, -88.0,
    -88.0, -88.0,  88.0,
    -88.0,  88.0,  88.0,
    -88.0,  88.0, -88.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.
  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  var cubeVertexIndices = [ 
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

//Helper function of draw() to set the vertex positions before drawing the 
//skybox for each frame. Also switches the shader to the skybox settings.
//Draw a cube based on buffers.
function drawSkybox(){
  switchShaders(true);
  
  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the face.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

  // Draw the cube.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

/**
 * Gets a file from the server for processing on the client side.
 *
 * @param  file A string that is the name of the file to get
 * @param  callbackFunction The name of function (NOT a string) that will receive a string holding the file
 *         contents.
 *
 */
function readTextFile(file, callbackFunction)
{
    console.log("reading "+ file);
    var rawFile = new XMLHttpRequest();
    var allText = [];
    rawFile.open("GET", file, true);
    
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                 callbackFunction(rawFile.responseText);
                 console.log("Got text file!");
                 
            }
        }
    }
    rawFile.send(null);
}

var vertical_axis = vec3.fromValues(0.0, 1.0, 0.0);  //up
var eyepoint = vec3.fromValues(0.0,0.0,10.0);

//Function which adds a new rotation around a given axis to the global quaternion 
function quatRotation(rotationRate, rotAxis){
    // create a new quaternion to apply new rotation
    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat, rotAxis, rotationRate);
    quat.normalize(tempQuat, tempQuat);
    
    // apply new rotation to global quaternion
    quat.multiply(globalQuat, tempQuat, globalQuat);
    quat.normalize(globalQuat, globalQuat);
}

//Function to handle user input from keyboard
function handleKeyDown(event){
  // A:orbit left
    if (event.keyCode == 65){
      quatRotation(-0.05, vertical_axis);        
      vec3.transformQuat(eyePt, eyepoint, globalQuat);
      vec3.normalize(viewDir, eyePt);
      vec3.scale(viewDir, viewDir, -1);
    }
    // D:orbit right
    else if (event.keyCode == 68){
      quatRotation(0.05, vertical_axis);
      vec3.transformQuat(eyePt, eyepoint, globalQuat);
      vec3.normalize(viewDir, eyePt);
      vec3.scale(viewDir, viewDir, -1);
    }
  //Q: orbit up
  else if (event.keyCode == 81){
      var temp=vec3.create();
      vec3.cross(temp, viewDir, vertical_axis);
      quatRotation(-0.05, temp);
      vec3.transformQuat(eyePt, eyepoint, globalQuat);
      vec3.normalize(viewDir, eyePt);
      vec3.scale(viewDir, viewDir, -1);
    }
  //E: orbit down
  else if (event.keyCode == 69){
      var temp=vec3.create();
      vec3.cross(temp, viewDir, vertical_axis);
      quatRotation(0.05, temp);
      vec3.transformQuat(eyePt, eyepoint, globalQuat);
      vec3.normalize(viewDir, eyePt);
      vec3.scale(viewDir, viewDir, -1);
    }
  
  
  // W:rotate teapot right
  else if (event.keyCode == 87){
    modelYRotationRadians += 0.05;
  }
  // S:Rotate teapot left
  else if (event.keyCode == 83){
    modelYRotationRadians -= 0.05;
  }
  //up arrow key: rotate front for teapot
  else if (event.keyCode == 38) {
    modelXRotationRadians += 0.05;
  }
  //down arrow key: rotate back for teapot
  else if (event.keyCode == 40) {
    modelXRotationRadians -= 0.05;
  }
  //right arrow key: rotate counter-clock wise  for teapot
  else if (event.keyCode == 39) {
    modelZRotationRadians += 0.05;
  }
  //left arrow key: rotate clock-wise for teapot
  else if (event.keyCode == 37) {
    modelZRotationRadians -= 0.05;
  }
}



