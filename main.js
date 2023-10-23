let canvas = document.getElementById( 'the-canvas' );

/** @type {WebGLRenderingContext} */
let gl = canvas.getContext( 'webgl2' );

//inital resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let vertex_source = 
`   #version 300 es
    precision mediump float;

    in vec3 coordinates;
    in vec4 color;
    
    uniform mat4 model;
    uniform mat4 view_projection;
    
    out vec4 aColor;
    
    void main( void ) {
        aColor = color;
        gl_Position = (view_projection * model) * vec4( coordinates, 1.0 );
    }
`;

let vert_shader = gl.createShader( gl.VERTEX_SHADER );
gl.shaderSource( vert_shader, vertex_source );
gl.compileShader( vert_shader );


let fragment_source = 
`   #version 300 es
    precision mediump float;

    out vec4 f_color;
    
    in vec4 aColor;

    void main( void ) {
        f_color = aColor;
    }
`;

let frag_shader = gl.createShader( gl.FRAGMENT_SHADER );
gl.shaderSource( frag_shader, fragment_source );
gl.compileShader( frag_shader );

let shader_program = gl.createProgram();
gl.attachShader( shader_program, vert_shader );
gl.attachShader( shader_program, frag_shader );
gl.linkProgram( shader_program );

gl.useProgram( shader_program );

gl.clearColor( 0.9, 0.9, 1.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();
let rotationxz = 0.0;


const modelloc = gl.getUniformLocation( shader_program, "model" );
const vploc = gl.getUniformLocation( shader_program, "view_projection" );
//Mesh.from_obj_file( gl, "teapot.obj", shader_program, mesh_loaded );

let objmesh = Mesh.box( gl, shader_program, 1, 1, 1 );//null;

let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
camera = new Camera(new Vec4(0, 0, 2, 0), 0, 0, 0, perspective);

Input.setMouseHandler(handleMouse);
Input.init();

requestAnimationFrame(render);

function handleMouse(deltaX, deltaY) {
    camera.rotateBy(0, 0.0005 * deltaY, -0.0005 * deltaX);
}

function mesh_loaded(mesh) {
    console.log("mesh loaded");
    objmesh = mesh;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
    
    //reuild the perspective matrix as well
    
    if(typeof camera !== 'undefined' && camera !== null) {
        camera.setPerspectiveMat(Mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 100));
    }
}


function render(now) {
 
    let time_delta = ( now - last_update ) / 1000;
    last_update = now;

    rotationxz +=  -0.125 * time_delta;
    rotationxz %= 1.0;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let mxz = Mat4.rotation_xz( 0 );
    let tran = Mat4.translation(0.0, 0.0, 0.0);
    
    let model = tran.mul(mxz);
    
    gl.uniformMatrix4fv( modelloc, true, model.data );
    
    const rotspeed = 0.125;
    const movespeed = 3;
    
    if (Input.getKeyState('ArrowLeft')) { camera.rotateBy(0, 0, rotspeed * time_delta); }
    if (Input.getKeyState('ArrowRight')) { camera.rotateBy(0, 0, -rotspeed * time_delta); }
    if (Input.getKeyState('ArrowUp')) { camera.rotateBy(0, rotspeed * time_delta, 0); }
    if (Input.getKeyState('ArrowDown')) { camera.rotateBy(0, -rotspeed * time_delta, 0); }
    if (Input.getKeyState('q')) { camera.rotateBy(-rotspeed * time_delta, 0, 0); }
    if (Input.getKeyState('e')) { camera.rotateBy(rotspeed * time_delta, 0, 0); }
    
    if (Input.getKeyState('w')) { camera.move(new Vec4(0, 0, -movespeed * time_delta, 0)); }
    if (Input.getKeyState('s')) { camera.move(new Vec4(0, 0, movespeed * time_delta, 0)); }
    if (Input.getKeyState('a')) { camera.move(new Vec4(-movespeed * time_delta, 0, 0, 0)); }
    if (Input.getKeyState('d')) { camera.move(new Vec4(movespeed * time_delta, 0, 0, 0)); }
    if (Input.getKeyState(' ')) { camera.move(new Vec4(0, movespeed * time_delta, 0, 0)); }
    if (Input.getKeyState('c')) { camera.move(new Vec4(0, -movespeed * time_delta, 0, 0)); }
    
    
    if (Input.getKeyState('t')) { Input.lockMouse(); }
    if (Input.getKeyState('y')) { Input.unlockMouse(); }
    
    let cameramat = camera.getMatrix();
    
    gl.uniformMatrix4fv( vploc, true,  cameramat.data);

    if (objmesh) {
        objmesh.render(gl);
    }
    requestAnimationFrame(render);
}