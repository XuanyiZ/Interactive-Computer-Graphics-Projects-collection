//I get the idea of my mp1 code mostly from HelloAnimation.js(skelenton+ affine transformation) and Discussion2Demo.js(non-uniform motion)

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;


// Create a place to store vertex colors
var vertexColorBuffer;

var mvMatrix = mat4.create();
var rotAngle = 0;
var lastTime = 0;


/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
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

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  
}

/**
 * Populate vertex and color buffers with data
 */
function setupBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [//an array that hokd all vertices of the graph
  //see 2.jpg for the label of each vertex
  //10 traingle form the blue part
          -0.84,  0.93,  0.0,   //123
          0.84,  0.93,  0.0,
          -0.84,  0.6,  0.0,

          0.84,  0.93,  0.0,   //234
          -0.84, 0.6,   0.0,
          0.84,  0.6,  0.0,

          -0.64,  0.6,  0.0,   //579
           -0.3, 0.6,  0.0,
          -0.64, -0.25,   0.0,

          -0.3,  0.6,  0.0,   //7911
          -0.64,  -0.25,  0.0,
          -0.3,  -0.25,  0.0,

          -0.3,  0.4,  0.0,   //131517
          -0.17,  0.4,   0.0,
          -0.3,  0.0,  0.0,

          -0.17,  0.4,  0.0,   //151719
           -0.3, 0.0,  0.0,
          -0.17,  0,   0.0,

           0.17,  0.4,  0.0,   //161420
          0.3,  0.4,  0.0,
           0.17,  0,  0.0,

          0.17,   0,  0.0,   //201814
          0.3,  0,   0.0,
          0.3,  0.4,  0.0,

          0.3,  0.6,  0.0,   //8612
           0.64, 0.6,  0.0,
          0.3, -0.25,   0.0,

          0.3, -0.25,   0.0,   //12106
           0.64, -0.25,  0.0,
           0.64, 0.6,   0.0,

           ////12 traingle form the orange part
           -0.64,  -0.29,  0.0,   //212335
          -0.54,  -0.29,  0.0,
          -0.54,  -0.51,  0.0,

          -0.64,  -0.29,  0.0,   //213335
          -0.64, -0.43,   0.0,
          -0.54,  -0.51,  0.0,

          -0.42,  -0.29,  0.0,   //252739
           -0.3, -0.29,  0.0,
          -0.3, -0.67,   0.0,

          -0.42,  -0.29,  0.0,   //253739
          -0.42,  -0.59,  0.0,
          -0.3, -0.67,   0.0,

          -0.18,  -0.29,  0.0,   //293143
          -0.06,  -0.29,   0.0,
          -0.06,  -0.83,  0.0,

          -0.18,  -0.29,  0.0,   //294143
           -0.18, -0.75,  0.0,
          -0.06,  -0.83,  0.0,

           0.06,  -0.29,  0.0,   //302842
          0.18,  -0.29,  0.0,
           0.06,  -0.83,  0.0,

          0.06,  -0.83,  0.0,   //424028
          0.18,  -0.75,   0.0,
          0.18,  -0.29,  0.0,

          0.30,  -0.29,  0.0,   //262438
           0.42, -0.29,  0.0,
          0.30, -0.67,   0.0,

          0.30, -0.67,   0.0,   //383624
           0.42, -0.59,  0.0,
           0.42, -0.29,  0.0,

           0.54,  -0.29,  0.0,   //222034
           0.64, -0.29,  0.0,
          0.54, -0.51,   0.0,

          0.54, -0.51,   0.0,   //343220
           0.64, -0.43,  0.0,
           0.64, -0.29,   0.0
  ];
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;  //dimension of each vertex
  vertexPositionBuffer.numberOfItems = 66;//number of vertex
    
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var colors = [
  //30 blue RGB 19 41 75  /255
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
         0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
         0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
         0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
         0.0745, 0.1607, 0.2941, 1.0,
        0.0745, 0.1607, 0.2941, 1.0,
        

        //36 orange 232 74 39 /255
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0,
        0.9098, 0.2901, 0.1529, 1.0
    ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 66;  
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame, be called each frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
  mat4.identity(mvMatrix);
  mat4.rotateY(mvMatrix, mvMatrix, 1.0*degToRad(rotAngle));  //see D2 slide 18 how it works, affaine transformation happed here
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);//this will draw a triangle for each group of three consecutive vertices.
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
 //see Discussion2Demo.js
var sinscalar = 0;
function animate() {
    sinscalar+=0.2;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    var triangleVertices=[
        //10 traingle form the blue part
          -0.84,  0.93,  0.0,   //123
          0.84,  0.93,  0.0,
          -0.84,  0.6,  0.0,

          0.84,  0.93,  0.0,   //234
          -0.84, 0.6,   0.0,
          0.84,  0.6,  0.0,

          -0.64,  0.6,  0.0,   //579
           -0.3, 0.6,  0.0,
          -0.64, -0.25,   0.0,

          -0.3,  0.6,  0.0,   //7911
          -0.64,  -0.25,  0.0,
          -0.3,  -0.25,  0.0,

          -0.3,  0.4,  0.0,   //131517
          -0.17,  0.4,   0.0,
          -0.3,  0.0,  0.0,

          -0.17,  0.4,  0.0,   //151719
           -0.3, 0.0,  0.0,
          -0.17,  0,   0.0,

           0.17,  0.4,  0.0,   //161420
          0.3,  0.4,  0.0,
           0.17,  0,  0.0,

          0.17,   0,  0.0,   //201814
          0.3,  0,   0.0,
          0.3,  0.4,  0.0,

          0.3,  0.6,  0.0,   //8612
           0.64, 0.6,  0.0,
          0.3, -0.25,   0.0,

          0.3, -0.25,   0.0,   //12106
           0.64, -0.25,  0.0,
           0.64, 0.6,   0.0,

           ////12 traingle form the orange part, ununiform motion happen at this
           -0.64+Math.sin(sinscalar-0.2)*0.05,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //212335
          -0.54+Math.sin(sinscalar-0.2)*0.05,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,
          -0.54+Math.sin(sinscalar-0.2)*0.05,  -0.51+Math.sin(sinscalar-0.2)*0.05,  0.0,

          -0.64+Math.sin(sinscalar-0.2)*0.05,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //213335
          -0.64+Math.sin(sinscalar-0.2)*0.05, -0.43+Math.sin(sinscalar-0.2)*0.05,   0.0,
          -0.54+Math.sin(sinscalar-0.2)*0.05,  -0.51+Math.sin(sinscalar-0.2)*0.05,  0.0,

          -0.42+Math.sin(sinscalar-0.2)*0.15,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //252739
           -0.3+Math.sin(sinscalar-0.2)*0.15, -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,
          -0.3+Math.sin(sinscalar-0.2)*0.15, -0.67+Math.sin(sinscalar-0.2)*0.05,   0.0,

          -0.42+Math.sin(sinscalar-0.2)*0.15,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //253739
          -0.42+Math.sin(sinscalar-0.2)*0.15,  -0.59+Math.sin(sinscalar-0.2)*0.05,  0.0,
          -0.3+Math.sin(sinscalar-0.2)*0.15, -0.67+Math.sin(sinscalar-0.2)*0.05,   0.0,

          -0.18+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //293143
          -0.06+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,   0.0,
          -0.06+Math.sin(sinscalar-0.2)*0.25,  -0.83+Math.sin(sinscalar-0.2)*0.05,  0.0,

          -0.18+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //294143
           -0.18+Math.sin(sinscalar-0.2)*0.25, -0.75+Math.sin(sinscalar-0.2)*0.05,  0.0,
          -0.06+Math.sin(sinscalar-0.2)*0.25,  -0.83+Math.sin(sinscalar-0.2)*0.05,  0.0,

           0.06+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //302842
          0.18+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,
           0.06+Math.sin(sinscalar-0.2)*0.25,  -0.83+Math.sin(sinscalar-0.2)*0.05,  0.0,

          0.06+Math.sin(sinscalar-0.2)*0.25,  -0.83+Math.sin(sinscalar-0.2)*0.05,  0.0,   //424028
          0.18+Math.sin(sinscalar-0.2)*0.25,  -0.75+Math.sin(sinscalar-0.2)*0.05,   0.0,
          0.18+Math.sin(sinscalar-0.2)*0.25,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,

          0.30+Math.sin(sinscalar-0.2)*0.15,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //262438
           0.42+Math.sin(sinscalar-0.2)*0.15, -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,
          0.30+Math.sin(sinscalar-0.2)*0.15, -0.67+Math.sin(sinscalar-0.2)*0.05,   0.0,

          0.30+Math.sin(sinscalar-0.2)*0.15, -0.67+Math.sin(sinscalar-0.2)*0.05,   0.0,   //383624
           0.42+Math.sin(sinscalar-0.2)*0.15, -0.59+Math.sin(sinscalar-0.2)*0.05,  0.0,
           0.42+Math.sin(sinscalar-0.2)*0.15, -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,

           0.54+Math.sin(sinscalar-0.2)*0.05,  -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,   //222034
           0.64+Math.sin(sinscalar-0.2)*0.05, -0.29+Math.sin(sinscalar-0.2)*0.05,  0.0,
          0.54+Math.sin(sinscalar-0.2)*0.05, -0.51+Math.sin(sinscalar-0.2)*0.05,   0.0,

          0.54+Math.sin(sinscalar-0.2)*0.05, -0.51+Math.sin(sinscalar-0.2)*0.05,   0.0,   //343220
           0.64+Math.sin(sinscalar-0.2)*0.05, -0.43+Math.sin(sinscalar-0.2)*0.05,  0.0,
           0.64+Math.sin(sinscalar-0.2)*0.05, -0.29+Math.sin(sinscalar-0.2)*0.05,   0.0

    ];

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
      vertexPositionBuffer.itemSize = 3;
      vertexPositionBuffer.numberOfItems = 66;


    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;    
        rotAngle= (rotAngle+1.0) % 360;   //update the global variable
    }
    lastTime = timeNow;
}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();//produce imageof currrent frame
    animate();
}
