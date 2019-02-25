//buffers for the teapot model and normal vectors
var TPvertexbuffer;
var TPvertexnormalbuffer;
var TPindexbuffer;

//load teapot obj file. calculates normal
function setupTeapotBuffers(raw_file_text){
  var vertices = [];
  var face = [];

  verticess_counter = 0;
  face_counter = 0;
  
  // get vertex and face data line by line
  var lines = raw_file_text.split("\n");
  for (var line_num in lines){
    list_elements = lines[line_num].split(' ');
    
    // line corresponds to vertex data
    if (list_elements[0] == 'v'){
      //cast to float 0.0
      vertices.push(parseFloat(list_elements[1]));
      vertices.push(parseFloat(list_elements[2]));
      vertices.push(parseFloat(list_elements[3]));
      verticess_counter += 1;
    }
    // line corresponds to face data
    else if(list_elements[0] == 'f'){
      //cast to int
      face.push(parseInt(list_elements[2])-1);
      face.push(parseInt(list_elements[3])-1);
      face.push(parseInt(list_elements[4])-1);
      face_counter += 1;
    }
  }
  
  // bind vertex data
  TPvertexbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, TPvertexbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  TPvertexbuffer.numItems = verticess_counter;
  
  // bind face data
  TPindexbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, TPindexbuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(face), gl.STATIC_DRAW);
  TPindexbuffer.numItems = face_counter;

  // calculate per vertex normals
  var normals = [];

  for (var i=0; i < verticess_counter; i++){
    normals.push(0);
    normals.push(0);
    normals.push(0);
  }
  // Calculate vertex normals
  normal_getter(vertices, face, face_counter, verticess_counter, normals);

  // bind normal data
  TPvertexnormalbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, TPvertexnormalbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  TPvertexnormalbuffer.itemSize = 3; //#of coordinas 
  TPvertexnormalbuffer.numItems = face_counter;
  
  ready_to_draw = true;
}

//draw the teapot
function drawTeapot(){

  switchShaders(false);  //tpot not skybox
  uploadViewDirToShader()
  
  // Draw the cube by binding the array buffer to the cube's vertices array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, TPvertexbuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, TPvertexnormalbuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);  

  // Draw the cube.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, TPindexbuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
}


//create per-vertex normals, which you can create by setting a per-face normal, 
//and then setting the vertex normal to be the sum of its adjacent face normals, 
//normalized (so the resulting vertex normal is unit length). 
//You can create a normal accumulator entry for every vertex and initialize it to zero. 
//Then loop through every face and add its normal to the normal accumulator of each of its three vertices. 
//Then for each vertex, normalize (make unit length) its accumulated normal vector.
function normal_getter(vertices, face, numT, numV, normals){
    //buffer that store the normal vector for each triangle
    var faceNormals = [];
    var v1,v2,v3;
    var temp1, temp2, normal

    for (var i = 0; i < numT; i++){ //#of trian
        v1 = face[i*3];
        v2 = face[i*3 + 1];
        v3 = face[i*3 + 2];
        
        temp1= vec3.fromValues(vertices[3*v2]-vertices[3*v1], vertices[3*v2+1]-vertices[3*v1+1], vertices[3*v2+2]-vertices[3*v1+2]);
        temp2= vec3.fromValues(vertices[3*v3]-vertices[3*v1], vertices[3*v3+1]-vertices[3*v1+1], vertices[3*v3+2]-vertices[3*v1+2]);
        normal  = vec3.create();
        vec3.cross(normal, temp1, temp2);
    
        faceNormals.push(normal[0]);
        faceNormals.push(normal[1]);
        faceNormals.push(normal[2]);
    }
      
    var count = [];
    //initialize
    for (var i = 0; i < numV; i++)
        count.push(0);
    
    //Sums up of the surface normal vectors
    normalgetterhelper( face, numT, normals, count, faceNormals);
    
    // average and normalize each normal vector in Normal array
    for (var i = 0; i < numV; i++){
        // for each point, average adjacent surface normal vectors
      for(var j = 0; j < 3; j++){
        normals[3*i+j] = normals[3*i+j] / count[i];
    }
      // normalize normal vector
      var normal = vec3.fromValues(normals[i*3+0], normals[i*3+1], normals[i*3+2]);
      var normalized = vec3.create();
      vec3.normalize(normalized, normal);
        
      // store final result
      for(var k = 0; k < 3; k++){
        normals[i*3+k] = normalized[k];
                                }
    }
}

//sums up all normal vectors on the surface
function normalgetterhelper( face, numT, normals, count, faceNormals){
  for (var i = 0; i < numT; i++){

        var v1 = face[i*3 + 0];
        var v2 = face[i*3 + 1];
        var v3 = face[i*3 + 2];

        // iterate over each vertex in triangle
        count[v1] += 1;
        count[v2] += 1;
        count[v3] += 1;

        for(var j = 0 ; j < 3; j++){
          normals[3*v1 + j] += faceNormals[i*3 + j];
          normals[3*v2 + j] += faceNormals[i*3 + j];
          normals[3*v3 + j] += faceNormals[i*3 + j];
                                    }
    }  
}
