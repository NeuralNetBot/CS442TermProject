let canvas = document.getElementById( 'the-canvas' );

/** @type {WebGLRenderingContext} */
let gl = canvas.getContext( 'webgl2' );

//inital resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let vertex_source = 
`   #version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    
    uniform mat4 model;
    uniform mat4 view_projection;
    
    
    out vec3 aPosition;
    out vec3 aNormal;
    out vec2 aUV;
    
    void main( void )
    {
        aPosition = vec3(model * vec4(position, 1.0));
        aNormal = normalize(mat3(model) * normal);
        aUV = uv;
        gl_Position = (view_projection * model) * vec4( position, 1.0 );
    }
`;

let vert_shader = gl.createShader( gl.VERTEX_SHADER );
gl.shaderSource( vert_shader, vertex_source );
gl.compileShader( vert_shader );


let fragment_source = 
`   #version 300 es
    precision mediump float;

    out vec4 f_color;
    
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;
    uniform sampler2D tex_0;
    
    uniform vec3 sun_direction;
    uniform vec3 sun_color;

    uniform vec3 view_pos;
    
    uniform float ambient;
    uniform float mat_diffuse;
    uniform float mat_specular;
    uniform float mat_shininess;

    //point lights
    uniform int num_lights;
    uniform vec3 light_positions[64];
    uniform vec4 light_colors[64];//w component is the linear component of light

    vec3 calcLight(vec3 light_direcion, vec3 light_color)
    {
        float L = max(dot(aNormal, light_direcion), 0.0);
        vec3 diffuse = mat_diffuse * light_color * L;
        
        vec3 reflection = reflect(-light_direcion, aNormal);
        vec3 view_dir = normalize(view_pos - aPosition);
        float spec = pow(max(dot(view_dir, reflection), 0.0), mat_shininess) * L;
        vec3 specular = light_color * spec * mat_specular;
    
        return diffuse + specular;
    }

    void main( void )
    {
        vec3 ambient = ambient * sun_color;

        vec3 final = ambient + calcLight(sun_direction, sun_color);
        
        for(int i = 0; i < num_lights; i++)
        {
            float dist = length(light_positions[i] - aPosition);
            float atten = 1.0 / (light_colors[i].w * dist);
            vec3 light_dir = normalize(light_positions[i] - aPosition);
            final += calcLight(light_dir, vec3(light_colors[i])) * atten;
        }
        f_color = vec4(final, 1.0) * texture(tex_0, aUV);
    }
`;

let frag_shader = gl.createShader( gl.FRAGMENT_SHADER );
gl.shaderSource( frag_shader, fragment_source );
gl.compileShader( frag_shader );

if (!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shader: " + gl.getShaderInfoLog(vert_shader));
}


if (!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shader: " + gl.getShaderInfoLog(frag_shader));
}

let shader_program = gl.createProgram();
gl.attachShader( shader_program, vert_shader );
gl.attachShader( shader_program, frag_shader );
gl.linkProgram( shader_program );

if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shader_program));
}

gl.useProgram( shader_program );

gl.clearColor( 0.0, 0.0, 0.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();
let rotationxz = 0.0;


const modelloc = gl.getUniformLocation( shader_program, "model" );
const vploc = gl.getUniformLocation( shader_program, "view_projection" );

//let objmesh = null;
//Mesh.from_obj_file( gl, "untitled.obj", shader_program, mesh_loaded );
let sphere = Mesh.sphere( gl, shader_program, 16 );

let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
camera = new Camera(new Vec4(0, 0, 2, 0), 0, 0, 0, perspective);


let sundir = new Vec4(1.0, 1.0, 1.0, 0.0);
sundir = sundir.norm();
gl.uniform3f( gl.getUniformLocation( shader_program, "sun_direction" ), sundir.x, sundir.y, sundir.z);
gl.uniform3f( gl.getUniformLocation( shader_program, "sun_color" ), 1.0, 1.0, 1.0 );

gl.uniform1f( gl.getUniformLocation( shader_program, "ambient" ), 0.25 );
gl.uniform1f( gl.getUniformLocation( shader_program, "mat_diffuse" ), 1.0 );
gl.uniform1f( gl.getUniformLocation( shader_program, "mat_specular" ), 2.0 );
gl.uniform1f( gl.getUniformLocation( shader_program, "mat_shininess" ), 4.0 );

let numLights = 1;
const lightPositions = [
    -2.0, 0.0, 0.0,
    0.0, -2.0, 0.0,
    0.0, 0.0, -2.0
];

const lightColors = [
    1.0, 0.0, 0.0, 0.5,
    0.0, 1.0, 0.0, 0.5,
    0.0, 0.0, 1.0, 0.5
];

gl.uniform1i( gl.getUniformLocation( shader_program, "num_lights" ), numLights);
gl.uniform3fv( gl.getUniformLocation( shader_program, "light_positions" ), new Float32Array(lightPositions));
gl.uniform4fv( gl.getUniformLocation( shader_program, "light_colors" ), new Float32Array(lightColors));

Input.setMouseHandler(handleMouse);
Input.init();

requestAnimationFrame(render);

let tex = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture( gl.TEXTURE_2D, tex );
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

const image = new Image();
image.src = "metal_scale.png";

image.onload = function () {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
};


function handleMouse(deltaX, deltaY) {
    camera.rotateBy(0, 0.0005 * deltaY, -0.0005 * deltaX);
}

function mesh_loaded(mesh) {
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

    rotationxz += -0.125 * time_delta;
    rotationxz %= 1.0;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let mxz = Mat4.rotation_xz( 0.0 );
    let tran = Mat4.translation(0.0, 0.0, 0.0);
    
    let model = tran.mul(mxz);
    
    gl.uniformMatrix4fv( modelloc, true, model.data );
    
    const rotspeed = 0.125;
    const movespeed = 3;
    
    if (Input.getKeyState('ArrowLeft'))  { camera.rotateBy(0, 0,  rotspeed * time_delta); }
    if (Input.getKeyState('ArrowRight')) { camera.rotateBy(0, 0, -rotspeed * time_delta); }
    if (Input.getKeyState('ArrowUp'))    { camera.rotateBy(0,  rotspeed * time_delta, 0); }
    if (Input.getKeyState('ArrowDown'))  { camera.rotateBy(0, -rotspeed * time_delta, 0); }
    if (Input.getKeyState('q'))          { camera.rotateBy(-rotspeed * time_delta, 0, 0); }
    if (Input.getKeyState('e'))          { camera.rotateBy( rotspeed * time_delta, 0, 0); }
    
    if (Input.getKeyState('w')) { camera.move(new Vec4(0, 0, -movespeed * time_delta, 0)); }
    if (Input.getKeyState('s')) { camera.move(new Vec4(0, 0,  movespeed * time_delta, 0)); }
    if (Input.getKeyState('a')) { camera.move(new Vec4(-movespeed * time_delta, 0, 0, 0)); }
    if (Input.getKeyState('d')) { camera.move(new Vec4( movespeed * time_delta, 0, 0, 0)); }
    if (Input.getKeyState(' ')) { camera.move(new Vec4(0,  movespeed * time_delta, 0, 0)); }
    if (Input.getKeyState('c')) { camera.move(new Vec4(0, -movespeed * time_delta, 0, 0)); }
    
    
    if (Input.getKeyState('t')) { Input.lockMouse(); }
    if (Input.getKeyState('y')) { Input.unlockMouse(); }
    
    let cameramat = camera.getMatrix();
    
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( shader_program, "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    gl.uniformMatrix4fv( vploc, true,  cameramat.data);

    if (sphere) {
        sphere.render(gl);
    }
    requestAnimationFrame(render);
}