let canvas = document.getElementById( 'the-canvas' );

/** @type {WebGL2RenderingContext} */
let gl = canvas.getContext( 'webgl2' );

const ext = gl.getExtension('ANGLE_instanced_arrays') || gl.getExtension('EXT_instanced_arrays');

if (ext) {
    gl.vertexAttribDivisorANGLE = ext.vertexAttribDivisorANGLE || ext.vertexAttribDivisorEXT;
    gl.drawArraysInstanced = gl.drawArraysInstancedANGLE || gl.drawArraysInstancedEXT;
    gl.drawElementsInstanced = gl.drawElementsInstancedANGLE || gl.drawElementsInstancedEXT;
}


//inital resize
let depthFrameBufferInfo = null;
let light_cull_shader = null;
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let vertex_source = 
`   #version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    
    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;
    
    out vec3 aPosition;
    out vec3 aNormal;
    out vec2 aUV;
    
    void main( void )
    {
        aPosition = vec3(mvp.model * vec4(position, 1.0));
        aNormal = normalize(mat3(mvp.model) * normal);
        aUV = uv;
        gl_Position = (mvp.view_projection * mvp.model) * vec4( position, 1.0 );
    }
`;

let fragment_source = 
`   #version 300 es
    precision mediump float;

    out vec4 f_color;
    
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;
    
    //point lights
    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64];//w component is the linear component of light        
    } lights;
    
    uniform sampler2D tex_0;
    
    uniform vec3 sun_direction;
    uniform vec3 sun_color;

    uniform vec3 view_pos;
    
    uniform float ambient;
    uniform float mat_diffuse;
    uniform float mat_specular;
    uniform float mat_shininess;

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
        
        for(int i = 0; i < lights.num_lights; i++)
        {
            float dist = length(lights.light_positions[i] - aPosition);
            float atten = 1.0 / (lights.light_colors[i].w * dist);
            vec3 light_dir = normalize(lights.light_positions[i] - aPosition);
            final += calcLight(light_dir, vec3(lights.light_colors[i]), aNormal) * atten;
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
    
    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;
    
    out vec3 aPosition;
    out vec3 aNormal;
    out vec2 aUV;
    
    void main( void )
    {
        aPosition - position;
        aNormal = normal;
        aUV = uv;
        gl_Position = (mvp.view_projection * mvp.model) * vec4( position, 1.0 );
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

let light_draw_vertex_source =
`   #version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;

    //point lights
    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64]; 
    } lights;
    
    out vec3 aNormal;
    out vec2 aUV;
    flat out int instanceID;
    
    void main( void )
    {
        aNormal = normal;
        aUV = uv;
        instanceID = int(gl_InstanceID);
        gl_Position = (mvp.view_projection) * vec4( (position / 5.0) + lights.light_positions[int(gl_InstanceID)], 1.0 );
    }
`;

let light_draw_fragment_source = 
`   #version 300 es
    precision mediump float;

    //point lights
    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64]; 
    } lights;

    out vec4 f_color;
    
    in vec3 aNormal;
    in vec2 aUV;
    flat in int instanceID;

    void main( void )
    {
        f_color = vec4(lights.light_colors[instanceID].xyz, 1.0);
    }
`;



let light_culling_comp_vertex_source = 
`   #version 300 es
    precision mediump float;
    
    in vec3 position;
    out vec2 aPosition;

    void main() {
        aPosition = position.xy;
        gl_Position = vec4(position, 1.0);
    }
`;

let light_culling_comp_fragment_source = 
`   #version 300 es
    precision mediump float;

    const int TILE_SIZE = 16;

    in vec2 aPosition;

    uniform sampler2D depthimage;
    uniform vec2 tile_size;
    
    //first index light count
    uniform sampler3D lightTiles;

    void main() {
        vec2 tile = (aPosition + 1.0) / 2.0 * tile_size;
        int tileindex = int(tile.x) * int(tile_size.x) + int(tile.y);
        
        float maxDepth = 0.0;
        float minDepth = 1.0;
        
        for(int x = 0; x < TILE_SIZE; x++) {
            for(int y = 0; y < TILE_SIZE; y++) {
                float depth = texture(depthimage, (tile * float(TILE_SIZE)) + vec2(x, y) ).r;
                maxDepth = max(maxDepth, depth);
                minDepth = min(minDepth, depth);
            }    
        }
        
        gl_FragDepth = maxDepth;
    }
`;

let mainshader = Shader.createShader(gl, vertex_source, fragment_source);
let lightshader = Shader.createShader(gl, light_draw_vertex_source, light_draw_fragment_source);
let depthshader = Shader.createShader(gl, depth_vertex_source, depth_fragment_source);

let tilecount_x = Math.ceil(canvas.width / 16);
let tilecount_y = Math.ceil(canvas.height / 16);
light_cull_shader = new ComputeShader(gl, Shader.createShader(gl, light_culling_comp_vertex_source, light_culling_comp_fragment_source), tilecount_x, tilecount_y);

gl.clearColor( 0.0, 0.0, 0.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();

//let objmesh = null;
//Mesh.from_obj_file( gl, "untitled.obj", shader_program, mesh_loaded );
let planemesh = Mesh.plane(gl);
let sphere = Mesh.sphere( gl, 8 );


let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
camera = new Camera(new Vec4(0, 0, 2, 0), 0, 0, 0, perspective);


let sundir = new Vec4(-1.0, -1.0, -1.0, 0.0);
sundir = sundir.norm();
mainshader.use();
gl.uniform3f( gl.getUniformLocation( mainshader.getProgram(), "sun_direction" ), sundir.x, sundir.y, sundir.z);
gl.uniform3f( gl.getUniformLocation( mainshader.getProgram(), "sun_color" ), 1.0, 1.0, 1.0 );

gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "ambient" ), 0.01 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_diffuse" ), 1.0 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_specular" ), 2.0 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_shininess" ), 32.0 );

const numLights = new Int32Array([4]);
const lightPositions = new Float32Array(
    [
        -2.0, 0.0, 0.0, 0.0,
        5.0, 1.0, 0.0, 0.0,
        0.0, 0.0, -2.0, 0.0,
        0.0, 1.0, 5.0, 0.0
    ]);
const lightColors = new Float32Array(
    [
        1.0, 0.0, 0.0, 0.5,
        0.0, 1.0, 0.0, 0.5,
        0.0, 0.0, 1.0, 0.5,
        1.0, 1.0, 0.0, 0.5
    ]);
    
let MVPBuffer = new GPUBuffer(gl, gl.UNIFORM_BUFFER, 4 * 16 * 2, 0);
MVPBuffer.bindToShader(mainshader, "MVP");
MVPBuffer.bindToShader(lightshader, "MVP");
MVPBuffer.bindToShader(depthshader, "MVP");    
    
const numLightsBytes = 4 * 4;           //glsl pads to vec4s
const lightPositionsBytes = 64 * 4 * 4; //glsl pads to vec4s
const lightColorsBytes = 64 * 4 * 4;    //glsl pads to vec4s
let lightsBuffer = new GPUBuffer(gl, gl.UNIFORM_BUFFER, numLightsBytes + lightPositionsBytes + lightColorsBytes, 1);
lightsBuffer.setData(numLights, 0);
lightsBuffer.setData(lightPositions, numLightsBytes);
lightsBuffer.setData(lightColors, numLightsBytes + lightPositionsBytes);
lightsBuffer.bindToShader(mainshader, "Lights");
lightsBuffer.bindToShader(lightshader, "Lights");

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
    if(light_cull_shader) {
        tilecount_x = Math.ceil(canvas.width / 16);
        tilecount_y = Math.ceil(canvas.height / 16);
        light_cull_shader.rebuild(gl, tilecount_x, tilecount_y);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function renderObjects(now, current_shader, depthonly) {
    
    let mxz = Mat4.rotation_xz( 0.0 );
    let tran = Mat4.translation(0.0, -1.0, 0.0);
    
    let model = tran.mul(mxz);
    
    let cameramat = camera.getMatrix();
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( current_shader, "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    
    MVPBuffer.bind();
    MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
    MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);
    
    if (planemesh) {
        planemesh.render(gl, current_shader);
    }
    //render objects that we dont want to be included in our depth information
    if(!depthonly) {
        lightshader.use();
        sphere.render(gl, lightshader.getProgram(), numLights);
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
    renderObjects(now, depthshader.getProgram(), true);

    gl.bindTexture( gl.TEXTURE_2D, depthFrameBufferInfo.texture);
    light_cull_shader.dispatch();


    //main pass
    gl.bindTexture( gl.TEXTURE_2D, tex );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mainshader.use();
    renderObjects(now, mainshader.getProgram(), false);

    requestAnimationFrame(render);
}