/*================= Globals ======================*/

var A_ROTATE = 1;
var A_PAN = 2;
var A_ZOOM = 4;
var A_RELOAD = 5;

var context = {
    action:-1,
    pan:false,
    zoom:false,
    rotate:false,
    old_x:0,
    old_y:0,
    old_z:0,
    CAM:[0, 0, -1],
    ORIGIN:[0, 0, 0]
}

var time_old = 0;
var objects = [];

var canvas = document.getElementById('canvas');
canvas.width = window.innerWidth * .98;
canvas.height = window.innerHeight * .85;

var proj_matrix = get_projection(40, canvas.width/canvas.height, 1, 100);
var view_matrix = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];
view_matrix[14] = view_matrix[14]-6;

var canvas = document.getElementById('canvas');
gl = canvas.getContext('experimental-webgl');
if(!gl){ gl = canvas.getContext('webgl'); }

/*============= Math ======================*/

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}
function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
       a[2] * b[0] - a[0] * b[2],
       a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function addVectors(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function normalize(v) {
    var length = magnitude(v);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
    } else {
    return [0, 0, 0];
    }
}
function identity() {

/*
+----+----+----+----+
| 0  |  1 |  2 | 3  | <- x axis
+----+----+----+----+
| 4  |  5 |  6 |  8 |  <- y axis
+----+----+----+----+
| 8  | 9  | 10 | 11 |  <- z axis
+----+----+----+----+
| 12 | 13 | 14 | 15 |  <- camera position
+----+----+----+----+

+----+----+----+----+
| Xx | Xy | Xz |  0 |  <- x axis
+----+----+----+----+
| Yx | Yy | Yz |  0 |  <- y axis
+----+----+----+----+
| Zx | Zy | Zz |  0 |  <- z axis
+----+----+----+----+
| Tx | Ty | Tz |  1 |  <- camera position
+----+----+----+----+
*/
var m = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];
    return m;
}
/*========== Defining and storing the geometry ==========*/
function loadObject(obj3d) {

    var obj = {
        file:obj3d.file,
        indices:obj3d.indices,
        image_src:obj3d.image_src,
        vertex_buffer:null,
        color_buffer:null,
        index_buffer:null,
        normal_buffer:null,
        texture_buffer:null,
        model_matrix:null,
        theta:0,
        phi:0,
        camera:[0,0,-1],
        program:null,
        move: function() {
          this.model_matrix[12] += this.camera[0];
          this.model_matrix[13] += this.camera[1];
          this.model_matrix[14] += this.camera[2];
        },
        loadProgram: function() {
        var vertCode =
          'attribute vec3 a_position;'+
          'attribute vec3 a_normal;'+
          'attribute vec2 a_texcoord;'+
          'varying vec2 v_texcoord;'+
          'varying vec3 v_normal;'+
           'uniform mat4 Pmatrix;'+
           'uniform mat4 Vmatrix;'+
           'uniform mat4 Mmatrix;'+
           'attribute vec3 color;'+//the color of the point
           'varying vec3 vColor;'+
           'void main(void) { '+//pre-built function
              'gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(a_position, 1.);'+
              'vColor = color;'+
              'v_texcoord = a_texcoord;'+
              'v_normal = mat3(Pmatrix*Vmatrix*Mmatrix) * a_normal;'+
           '}';

        var fragCode = 'precision mediump float;'+
           'varying vec3 vColor;'+
           'varying vec2 v_texcoord;'+
           'varying vec3 v_normal;'+
           'uniform sampler2D u_texture;'+
           'uniform vec3 u_reverseLightDirection;'+
           'uniform vec4 u_color;'+
           'void main(void) {'+
        //            'gl_FragColor = vec4(vColor, 1.);'+
        //            'gl_FragColor = texture2D(u_texture, v_texcoord);'+
                  'vec3 normal = normalize(v_normal);'+
                  'float light = dot(normal, u_reverseLightDirection);'+
                  'gl_FragColor = texture2D(u_texture, v_texcoord);'+//+u_color //https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-directional.html
                  'gl_FragColor.rgb *= light;'+
           '}';

        var vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertCode);
        gl.compileShader(vertShader);

        var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, fragCode);
        gl.compileShader(fragShader);

        var shaderprogram = gl.createProgram();
        gl.attachShader(shaderprogram, vertShader);
        gl.attachShader(shaderprogram, fragShader);
        gl.linkProgram(shaderprogram);


        return shaderprogram;
        },
        scale:function(sx, sy, sz) {
         this.model_matrix[0] *= sx;
         this.model_matrix[5] *= sy;
         this.model_matrix[10] *= sz;
        },
        rotateX:function(angle) {
             var m = this.model_matrix;
         var c = Math.cos(angle);
         var s = Math.sin(angle);
         var mv1 = m[1], mv5 = m[5], mv9 = m[9];

         m[1] = m[1]*c-m[2]*s;
         m[5] = m[5]*c-m[6]*s;
         m[9] = m[9]*c-m[10]*s;

         m[2] = m[2]*c+mv1*s;
         m[6] = m[6]*c+mv5*s;
         m[10] = m[10]*c+mv9*s;

             this.model_matrix = m;
        },
        rotateY:function(angle) {
             var m = this.model_matrix;
         var c = Math.cos(angle);
         var s = Math.sin(angle);
         var mv0 = m[0], mv4 = m[4], mv8 = m[8];

         m[0] = c*m[0]+s*m[2];
         m[4] = c*m[4]+s*m[6];
         m[8] = c*m[8]+s*m[10];

         m[2] = c*m[2]-s*mv0;
         m[6] = c*m[6]-s*mv4;
         m[10] = c*m[10]-s*mv8;

             this.model_matrix = m;
        },
        lookAt:function(target, from) {
         var up = [0, 1, 0];
         var z = normalize(
             subtractVectors(from, target));
         var x = normalize(cross(up, z));
         var y = normalize(cross(z, x));
         this.model_matrix = [
            x[0], x[1], x[2], 0,
            y[0], y[1], y[2], 0,
            z[0], z[1], z[2], 0,
            from[0], from[1], from[2], 1
         ];
          },
          createTexture:function () {
              var texture = gl.createTexture();
              gl.bindTexture(gl.TEXTURE_2D, texture);

              // Fill the texture with a 1x1 blue pixel.
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                            new Uint8Array([0, 128, 255, 255]));

              // Asynchronously load an image
              var image = new Image();
              image.src = this.image_src;
              //image.addEventListener('load', function() {
                // Now that the image has loaded make copy it to the texture.
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                  gl.generateMipmap(gl.TEXTURE_2D);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }

              //});
          }
    }//obj

    // Create and store data into vertex buffer
    obj.vertex_buffer = gl.createBuffer ();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj3d.vertices), gl.STATIC_DRAW);

    // Create and store data into color buffer
    obj.color_buffer = gl.createBuffer ();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj3d.colors), gl.STATIC_DRAW);

    // Create and store data into index buffer
    obj.index_buffer = gl.createBuffer ();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj3d.indices), gl.STATIC_DRAW);

    obj.normal_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj3d.normals), gl.STATIC_DRAW);

    obj.texture_buffer = gl.createBuffer ();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texture_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj3d.texture), gl.STATIC_DRAW);

    obj.program = obj.loadProgram();
    return obj;
}

function drawObject(obj, proj_matrix, view_matrix){
    gl.useProgram(obj.program);

    var _Pmatrix = gl.getUniformLocation(obj.program, "Pmatrix");
    var _Vmatrix = gl.getUniformLocation(obj.program, "Vmatrix");
    var _Mmatrix = gl.getUniformLocation(obj.program, "Mmatrix");

    var colorLocation = gl.getUniformLocation(obj.program, "u_color");
    var reverseLightDirectionLocation = gl.getUniformLocation(obj.program, "u_reverseLightDirection");
    gl.uniform4fv(colorLocation, [0.4, 0.4, 0.4, 1]); //set light color
    gl.uniform3fv(reverseLightDirectionLocation, normalize([0, 0, -1]));// set the light direction.

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertex_buffer);
    var _position = gl.getAttribLocation(obj.program, "a_position");
    gl.vertexAttribPointer(_position, 3, gl.FLOAT, false,0,0);
    gl.enableVertexAttribArray(_position);

    //    gl.bindBuffer(gl.ARRAY_BUFFER, obj.color_buffer);
    //    var _color = gl.getAttribLocation(obj.program, "color");
    //    gl.vertexAttribPointer(_color, 3, gl.FLOAT, false,0,0) ;
    //    gl.enableVertexAttribArray(_color);

    var normalLocation = gl.getAttribLocation(obj.program, "a_normal");
    gl.enableVertexAttribArray(normalLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normal_buffer);
    // Tell the attribute how to get data out of normalBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floating point values
    var normalize_ = false; // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(normalLocation, size, type, normalize_, stride, offset)

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texture_buffer);
    var _texcoord = gl.getAttribLocation(obj.program, "a_texcoord");
    gl.vertexAttribPointer(_texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_texcoord);
    obj.createTexture();

    gl.uniformMatrix4fv(_Pmatrix, false, proj_matrix);
    gl.uniformMatrix4fv(_Vmatrix, false, view_matrix);
    gl.uniformMatrix4fv(_Mmatrix, false, obj.model_matrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.index_buffer);
    gl.drawElements(gl.TRIANGLES, obj.indices.length, gl.UNSIGNED_SHORT, 0);
}

/*==================== MATRIX ====================== */

function get_projection(angle, a, zMin, zMax) {
    var ang = Math.tan((angle*.5)*Math.PI/180);//angle*.5
    return [
    0.5/ang, 0 , 0, 0,
    0, 0.5*a/ang, 0, 0,
    0, 0, -(zMax+zMin)/(zMax-zMin), -1,
    0, 0, (-2*zMax*zMin)/(zMax-zMin), 0
                ];
}

/*================= Mouse events ======================*/
var mouseDown = function(e) {
    console.log("action " + context.action);
    context.rotate = context.pan = context.zoom = false;
    switch(context.action) {
    case A_PAN: context.pan = true; break;
    case A_ZOOM: context.zoom = true; break;
    case A_ROTATE: context.rotate = true; break;
    }
    context.old_x = e.pageX;
    context.old_y = e.pageY;
    e.preventDefault();
    return true;
/*
    switch(e.button) {
    case 0:
     spin = true;
     old_x = e.pageX, old_y = e.pageY;
     e.preventDefault();
     return true;
    case 1:
      spin = false;
      pan = false;
      rotate = false;
     if(e.shiftKey) {
         pan = true;
         old_x = e.pageX, old_y = e.pageY;
         e.preventDefault();
     }
     else {
         rotate = true;
         old_x = e.pageX, old_y = e.pageY;
         e.preventDefault();
     }
     return true;
    case 2:
     return true;
    }
*/
};

var mouseUp = function(e){
    context.rotate = context.pan = context.zoom = false;
};

var mouseMove = function(e) {
    if( typeof mouseMove.THETA == 'undefined' ) {
        mouseMove.THETA = 0;//Math.PI/4.;
    }
    if( typeof mouseMove.PHI == 'undefined' ) {
        mouseMove.PHI = -Math.PI/2.;
    }

    var selected_obj_idx = $("#selected_obj").prop("selectedIndex")-1;
    if(context.pan) {
        var deltaX = (e.pageX - context.old_x)*2*Math.PI/canvas.width;
        var deltaY = (e.pageY - context.old_y)*2*Math.PI/canvas.height;
        if(selected_obj_idx == -1) {
            context.CAM[0] += deltaX;
            context.ORIGIN[0] += deltaX;
            context.CAM[1] -= deltaY;
            context.ORIGIN[1] -= deltaY;
        }
        else {
            objects[selected_obj_idx].camera[0] += deltaX;
            objects[selected_obj_idx].camera[1] -= deltaY;
        }
    }
    else if(context.zoom) {
        var deltaY = (e.pageY - context.old_y)*2*Math.PI/canvas.height;
        if(selected_obj_idx == -1) {
            context.CAM[2] -= deltaY;
            context.ORIGIN[2] -= deltaY;
        }
        else {
            objects[selected_obj_idx].camera[2] += deltaY;
        }
    }
    else if (context.rotate) {
        if(selected_obj_idx > -1) {
            var dX = (e.pageX - context.old_x)*2*Math.PI/canvas.width;
            var dY = (e.pageY - context.old_y)*2*Math.PI/canvas.height;
            objects[selected_obj_idx].theta += dX;
            objects[selected_obj_idx].phi += dY;
        }
        else {//http://dynref.engr.illinois.edu/rvs.html
            var deltaX = (e.pageX - context.old_x)/canvas.width;
            var deltaY = (e.pageY - context.old_y)/canvas.height;

            mouseMove.THETA += deltaX *  Math.PI;
            mouseMove.PHI += deltaY * Math.PI;

            var camdistance = magnitude(subtractVectors(context.CAM, context.ORIGIN));
            context.CAM[0] = camdistance*Math.sin(mouseMove.THETA)*Math.sin(mouseMove.PHI);
            context.CAM[1] = camdistance*Math.cos(mouseMove.PHI);
            context.CAM[2] = camdistance*Math.cos(mouseMove.THETA)*Math.sin(mouseMove.PHI);
            context.CAM = addVectors(context.CAM, context.ORIGIN);
        }
    }

    e.preventDefault();
    context.old_x = e.pageX;
    context.old_y = e.pageY;

    var msg = "CAM: [" + context.CAM[0].toFixed(2) +"," + context.CAM[1].toFixed(2) + "," + context.CAM[2].toFixed(2) + "], " +
    "ORIGIN: [" + context.ORIGIN[0].toFixed(2) +"," + context.ORIGIN[1].toFixed(2) + "," + context.ORIGIN[2].toFixed(2) + "]";
    console.log(msg);
};

var onWheel = function(e) {
    context.CAM[2] -= event.deltaY * 0.01;
    e.preventDefault();
}

canvas.addEventListener("mousedown", mouseDown, false);
canvas.addEventListener("mouseup", mouseUp, false);
canvas.addEventListener("mouseout", mouseUp, false);
canvas.addEventListener("mousemove", mouseMove, false);
canvas.onwheel = onWheel;

var animate = function (time) {
    var dt = time-time_old;

    for (i = 0; i < objects.length; i++) {
        objects[i].lookAt(context.ORIGIN, context.CAM);
        //objects[i].scale(.25, .25, 1);
        objects[i].move();
        objects[i].rotateY(objects[i].theta);
        objects[i].rotateX(objects[i].phi);
    };

    time_old = time;
    gl.enable(gl.DEPTH_TEST);

    // gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.clearDepth(1.0);
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (i = 0; i < objects.length; i++) {
      drawObject(objects[i], proj_matrix, view_matrix);
    };

    window.requestAnimationFrame(animate);
}
animate(0);

