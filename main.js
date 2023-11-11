let canvas = document.getElementById( 'the-canvas' );

/** @type {WebGL2RenderingContext} */
let gl = canvas.getContext( 'webgl2' );
console.log(gl);

//inital resize
let depthFrameBufferInfo = null;
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

    vec3 calcLight(vec3 light_direcion, vec3 light_color, vec3 surf_normal)
    {
        float L = max(dot(surf_normal, light_direcion), 0.0);
        vec3 diffuse = mat_diffuse * light_color * L;
        
        vec3 reflection = reflect(-light_direcion, surf_normal);
        vec3 view_dir = normalize(view_pos - aPosition);
        float spec = pow(max(dot(view_dir, reflection), 0.0), mat_shininess) * L;
        vec3 specular = light_color * spec * mat_specular;
    
        return diffuse + specular;
    }

    void main( void )
    {
        vec3 ambient = ambient * sun_color;

        vec3 final = ambient + calcLight(-sun_direction, sun_color, aNormal);
        
        for(int i = 0; i < num_lights; i++)
        {
            float dist = length(light_positions[i] - aPosition);
            float atten = 1.0 / (light_colors[i].w * dist);
            vec3 light_dir = normalize(light_positions[i] - aPosition);
            final += calcLight(light_dir, vec3(light_colors[i]), aNormal) * atten;
        }
        f_color = vec4(final, 1.0) * texture(tex_0, aUV);
    }
`;

let depth_vertex_source = 
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
        aPosition - position;
        aNormal = normal;
        aUV = uv;
        gl_Position = (view_projection * model) * vec4( position, 1.0 );
    }
`;

let depth_fragment_source = 
`   #version 300 es
    precision mediump float;
    
    uniform vec3 view_pos;
    
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;
    
    void main( void )
    {
        gl_FragDepth = gl_FragCoord.z;
    }
`;

let light_culling_comp_vertex_source = 
`   #version 300 es
    precision mediump float;
    
    in vec2 position;
    out vec2 aPosition;

    void main() {
        aPosition = position;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;
let light_culling_comp_fragment_source = 
`   #version 300 es
    precision mediump float;

    in vec2 aPosition;

    uniform image2D depthimage;
    uniform vec2 size;

    void main() {
        vec2 invoc = (aPositon + 1.0) * size / 2.0;
    }
`;

let mainshader = Shader.createShader(gl, vertex_source, fragment_source);
mainshader.use();
let shader_program = mainshader.getProgram();

let depthshader = Shader.createShader(gl, depth_vertex_source, depth_fragment_source);


//let lightcullshader = Shader.createComputeShader(gl, light_culling_comp_source);

gl.clearColor( 0.0, 0.0, 0.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();

//let objmesh = null;
//Mesh.from_obj_file( gl, "untitled.obj", shader_program, mesh_loaded );
let sphere = Mesh.plane(gl);//sphere( gl, 16 );

let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
camera = new Camera(new Vec4(0, 0, 2, 0), 0, 0, 0, perspective);


let sundir = new Vec4(-1.0, -1.0, -1.0, 0.0);
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
    0.0, 2.0, 0.0,
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

let doneload = false;
let tex = loadTexture(gl, "metal_scale.png", function() { doneload = true; });
requestAnimationFrame(render);

function handleMouse(deltaX, deltaY) {
    camera.rotateBy(0, 0.0005 * deltaY, -0.0005 * deltaX);
}

function mesh_loaded(mesh) {
    objmesh = mesh;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    //reuild the perspective matrix as well
    
    if(typeof camera !== 'undefined' && camera !== null) {
        camera.setPerspectiveMat(Mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 100));
    }
    
    //and depth frame buffer
    if (depthFrameBufferInfo) {
        gl.deleteFramebuffer(depthFrameBufferInfo.framebuffer);
        gl.deleteTexture(depthFrameBufferInfo.texture);
    }
    
    depthFrameBufferInfo = createDepthFramebuffer(gl, canvas.width, canvas.height);

    gl.viewport(0, 0, canvas.width, canvas.height);
}


function renderObjects(now, current_shader) {
    
    let mxz = Mat4.rotation_xz( 0.0 );
    let tran = Mat4.translation(0.0, -1.0, 0.0);
    
    let model = tran.mul(mxz);
    gl.uniformMatrix4fv( gl.getUniformLocation( current_shader, "model" ), true, model.data );
    
    let cameramat = camera.getMatrix();
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( current_shader, "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    gl.uniformMatrix4fv( gl.getUniformLocation( current_shader, "view_projection" ), true,  cameramat.data);
    
    if (sphere) {
        sphere.render(gl, current_shader);
    }
    
}

function render(now) {
    if(!doneload) { requestAnimationFrame(render); return; }
    
    let time_delta = ( now - last_update ) / 1000;
    last_update = now;

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
    
    //depth pass
    gl.bindTexture( gl.TEXTURE_2D, null );

    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBufferInfo.framebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    depthshader.use();
    renderObjects(now, depthshader.getProgram());


    //main pass
    gl.bindTexture( gl.TEXTURE_2D, tex );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mainshader.use();
    renderObjects(now, mainshader.getProgram());

    requestAnimationFrame(render);
}