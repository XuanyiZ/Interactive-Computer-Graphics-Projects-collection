/**
 * Iteratively generate terrain from numeric inputs
 * @param {number} n
 * @param {number} minX Minimum X value
 * @param {number} maxX Maximum X value
 * @param {number} minY Minimum Y value
 * @param {number} maxY Maximum Y value
 * @param {Array} vertexArray Array that will contain vertices generated
 * @param {Array} faceArray Array that will contain faces generated
 * @param {Array} normalArray Array that will contain normals generated
 * @return {number}
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray,heightArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(heightArray[j][i]);
           
           //var nor = i*(n+1) + j;
           //normalArray.push(nor);
           //normalArray.push(nor+n+1);
           //normalArray.push(nor+1);
           //Place holder,later will be replaced by true normal
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(0);

       }
    generateNormals(n, deltaX, deltaY,heightArray, normalArray);

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
/**
 * Generates line values from faces in faceArray
 * @param {Array} faceArray array of faces for triangles
 * @param {Array} lineArray array of normals for triangles, storage location after generation
 */
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

/**
 * https://en.wikipedia.org/wiki/Diamond-square_algorithm
 * generate height using DimondSquare methods
 */
function generateheightwithDimondSquare(heightArray, minX, minY,  maxX, maxY, iteration,scale){
    //base case
    
    if(iteration<=0){
       return;
    }
    //get the height of 4 corners
    var heightemp1 = heightArray[minX][minY];
    var heightemp2 = heightArray[minX][maxY];
    var height3 = heightArray[maxX][minY];
    var height4 = heightArray[maxX][maxY];
    
    //divide the recursion depth by 2 and find the mid point
    iteration = Math.floor(iteration/2);
    var middleX = minX+iteration;
    var middleY = minY+iteration;

    //coef=math.sqrt(iteration);
    //inner points
    heightArray[middleX][middleY] = (heightemp1+heightemp2+height3+height4)/4 + Math.random()*scale-0.01;
    //generate and update the middle point value
    var height5 = heightArray[middleX][middleY];

    //generate and update the height for points on bianshang
    heightArray[minX][middleY] = (heightemp1+heightemp2+height5)/3 + Math.random()*scale+0.01;
    heightArray[maxX][middleY] = (height3+height5+height4)/3 + Math.random()*scale-0.02;
    heightArray[middleX][minY] = (heightemp1+height3+height5)/3 + Math.random()*scale-0.03;
    heightArray[middleX][maxY] = (height4+heightemp2+height5)/3 + Math.random()*scale+0.03;

    //recursion to four subplane
    scale*=0.84
    generateheightwithDimondSquare(heightArray, minX, minY, middleX, middleY, iteration,scale);
    generateheightwithDimondSquare(heightArray, middleX, minY, maxX, middleY, iteration,scale);
    generateheightwithDimondSquare(heightArray, minX, middleY, middleX, maxY, iteration,scale);
    generateheightwithDimondSquare(heightArray, middleX, middleY, maxX, maxY, iteration,scale);
}

//-------------------------------------------------------------------------
/**
 * function takes a empty normal arry and filled in with heightArray to  determine the normals for the light values 
 * Online modification Citation: original author @mgarg
 */ 
function generateNormals(n, deltaX, deltaY, heightArray, normalArray)
{
  var vector1=vec3.create();
  var vector2=vec3.create();
  var temp1=vec3.create();
  var temp2=vec3.create();
  var crosspro=vec3.create();

  for(var i=0;i<n;i++)
   for(var j=0;j<n;j++){
      //current index in the 1D normal array 
      var vid = i*(n+1) + j;
      //vectors of the points in the square are used to compute two normal from two faces 
      vec3.set(vector1, deltaX, 0, heightArray[i][j+1] - heightArray[i][j]);
      vec3.set(vector2, 0, deltaY, heightArray[i+1][j] - heightArray[i][j]);
      vec3.cross(crosspro, vector1, vector2);

      vec3.set(temp1, -deltaX, 0, heightArray[i+1][j] - heightArray[i+1][j+1]);
      vec3.set(temp2, 0, -deltaY, heightArray[i][j+1] - heightArray[i+1][j+1]);
      vec3.cross(temp1, temp1, temp2);

      //normals are summed to all points used 
      normalArray[3*vid] += crosspro[0];
      normalArray[(3*vid)+1] += crosspro[1];
      normalArray[(3*vid)+2] += crosspro[2];

      normalArray[3*(vid+n+1)] += crosspro[0] + temp1[0];
      normalArray[(3*(vid+n+1))+1] += crosspro[1] + temp1[1];
      normalArray[(3*(vid+n+1))+2] += crosspro[2] + temp1[2];

      normalArray[3*(vid+1)] += crosspro[0] + temp1[0];
      normalArray[(3*(vid+1))+1] += crosspro[1] + temp1[1];
      normalArray[(3*(vid+1))+2] += crosspro[2] + temp1[2];

      normalArray[3*(vid+n+2)] += crosspro[0];
      normalArray[(3*(vid+n+2))+1] += crosspro[1];
      normalArray[(3*(vid+n+2))+2] += crosspro[2];
   }
  
  //length is computed to normalize the vectors stored in the normalarray
  var legth=0;
  for(var i=0;i<n;i++)
   for(var j=0;j<n;j++){

    var vid = i*(n+1) + j;
    length = Math.sqrt(Math.pow(normalArray[3*vid],2) + Math.pow(normalArray[3*vid+1],2) + Math.pow(normalArray[3*vid+2],2));
    normalArray[3*vid]   = normalArray[3*vid]   / length;
    normalArray[3*vid+1] = normalArray[3*vid+1] / length;
    normalArray[3*vid+2] = normalArray[3*vid+2] / length;
  }
  

}