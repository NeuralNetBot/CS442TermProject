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

let cube_map_vertex_source =
    `#version 300 es
    precision mediump float;

    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    out vec3 v_normal;
    out vec2 v_uv;
    out vec3 v_pos;

    void main(void ) {
        v_normal = normal;
        gl_Position = mvp.view_projection * vec4(500.0 * position, 1.0);
        v_pos = position;
        v_uv = uv;
    } `;


let cube_map_fragment_source =
    `#version 300 es
    precision mediump float;

    uniform vec3 camera_position;
    uniform samplerCube skybox;

    in vec3 v_normal;
    in vec2 v_uv;
    in vec3 v_pos;

    out vec4 c_m_color;

    void main( void ) {
        c_m_color = texture(skybox, v_pos);
    } `;


let water_vertex_source =
    `#version 300 es
    precision mediump float;
    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;
    uniform float time;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    out vec3 v_normal;
    out vec2 v_uv;
    out vec3 v_pos;

    float frequency = 10.0;
    float amplitude = 0.00;
    float speed = 3.0;

    void main( void ) {

        float displacement = (position.x + position.z) * frequency + time * speed;
        vec3 wave_pos = vec3(position.x, amplitude * cos(displacement) + position.y, position.z);

        // based off of partial derivative of wave
        v_normal = normalize(normalize(vec3(1.0, amplitude * -sin(displacement), 0.0 * normal.y)) * mat3(mvp.model));

        gl_Position = mvp.view_projection * mvp.model * vec4( wave_pos, 1.0 );
        v_pos = vec3(mvp.model * vec4(wave_pos, 1.0));

        v_uv = uv;
       
    } `;

let water_fragment_source =
    `#version 300 es
    precision mediump float;
    out vec4 t_f_color;
    float alpha = 0.9;

    in vec3 v_normal;
    in vec2 v_uv;
    in vec3 v_pos;

    float fresnelPower = 10.0; 
    float mat_ambient = 0.25;
    float mat_diffuse = 1.0;
    float mat_specular = 2.0;
    float mat_shininess = 4.0;
    uniform vec3 camera_position;

    uniform samplerCube skybox;

    vec3 sun_color = vec3(1.0, 1.0, 1.0);
    vec3 light_direction = normalize(vec3(-1.0, -1.0, -1.0));


    vec3 calcLight(vec3 light_direcion, vec3 light_color)
    {
        float L = max(dot(v_normal, light_direcion), 0.0);
        vec3 diffuse = mat_diffuse * light_color * L;

        vec3 halfway = normalize(light_direction + camera_position);

        float fresnelFactor = dot(halfway, camera_position);
        fresnelFactor = max(fresnelFactor, 0.0);
        fresnelFactor = 1.0 - fresnelFactor;
        fresnelFactor = pow(fresnelFactor, fresnelPower);
        alpha = mix(alpha, 1.0, fresnelFactor);
        
        vec3 reflection = reflect(-light_direcion, v_normal);
        vec3 view_dir = normalize(camera_position - v_pos);
        float spec = pow(max(dot(view_dir, halfway), 0.0), mat_shininess) * L;
        vec3 specular = light_color * spec * mat_specular;

        return diffuse + specular;
    }


    void main( void ) {
        vec3 I = normalize(v_pos - camera_position);
        vec3 R = reflect(I, normalize(v_normal));

        t_f_color = vec4(texture(skybox, R).rgb, 1.0) * vec4(0.3, 0.56, 0.95, alpha) * vec4(calcLight(-light_direction, sun_color), 1.0);
    } `;

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
    const int MAX_LIGHTS_PER_TILE = 16;

    in vec2 aPosition;
    
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

    uniform sampler2D depthimage;
    uniform vec2 tile_size;
    uniform vec2 view_size;
    
    layout(location = 0) out vec4 lightOut0;
    layout(location = 1) out vec4 lightOut1;
    layout(location = 2) out vec4 lightOut2;
    layout(location = 3) out vec4 lightOut3;
    layout(location = 4) out vec4 lightOut4;
    layout(location = 5) out vec4 lightOut5;
    layout(location = 6) out vec4 lightOut6;
    layout(location = 7) out vec4 lightOut7;
    
    struct Frustum {
        vec4 planes[6];
        vec3 points[8];
    };


    Frustum createFrustum(ivec2 tile) {
        mat4 inverse_view_projection = inverse(mvp.view_projection);
        Frustum frustum;
        
        //ndc = normalized device coords
        vec2 ndc_size = 2.0 * vec2(TILE_SIZE, TILE_SIZE) / view_size;
        vec2 ndc_points[4];
        ndc_points[0] = vec2(-1.0, -1.0) + vec2(tile) * ndc_size;
        ndc_points[1] = vec2(ndc_points[0].x + ndc_size.x, ndc_points[0].y);
        ndc_points[2] = ndc_points[0] + ndc_size;
        ndc_points[3] = vec2(ndc_points[0].x, ndc_size.y + ndc_points[0].y);
        
        return frustum;
    }

    bool inTile(int lightindex, Frustum frustum) {
        for(int i = 0; i < 6; i++) {
            if(dot(lights.light_positions[lightindex], frustum.planes[i].xyz) + frustum.planes[i].w < -(1.0 / lights.light_colors[lightindex].w)) {
                return false;
            }
        }
        return true;
    }
    
    vec4 packInts(int a, int b) {
        return vec4(float(a & 0xFF) / 255.0, float((a >> 8) & 0xFF) / 255.0, float(b & 0xFF) / 255.0, float((b >> 8) & 0xFF) / 255.0);
    }

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
        
        Frustum frustum = createFrustum(ivec2(tile));
        
        int tilelightdata[MAX_LIGHTS_PER_TILE];
        int lindex = 0;
        for(int i = 0; i < lights.num_lights; i++) {
            if(lindex > MAX_LIGHTS_PER_TILE) { break; }
            if(inTile(i, frustum)) {
                tilelightdata[lindex] = i;
                lindex++;
            }
        }
        
        lightOut0 = packInts(tilelightdata[0], tilelightdata[1]);
        lightOut1 = packInts(tilelightdata[2], tilelightdata[3]);
        lightOut2 = packInts(tilelightdata[4], tilelightdata[5]);
        lightOut3 = packInts(tilelightdata[6], tilelightdata[7]);
        lightOut4 = packInts(tilelightdata[8], tilelightdata[9]);
        lightOut5 = packInts(tilelightdata[10], tilelightdata[11]);
        lightOut6 = packInts(tilelightdata[12], tilelightdata[13]);
        lightOut7 = packInts(tilelightdata[14], tilelightdata[15]);
    }
`;

let mainshader = Shader.createShader(gl, vertex_source, fragment_source);
let lightshader = Shader.createShader(gl, light_draw_vertex_source, light_draw_fragment_source);
let depthshader = Shader.createShader(gl, depth_vertex_source, depth_fragment_source);
let cubemapshader = Shader.createShader(gl, cube_map_vertex_source, cube_map_fragment_source);
let watershader = Shader.createShader(gl, water_vertex_source, water_fragment_source);

let tilecount_x = Math.ceil(canvas.width / 16);
let tilecount_y = Math.ceil(canvas.height / 16);
light_cull_shader = new ComputeShader(gl, Shader.createShader(gl, light_culling_comp_vertex_source, light_culling_comp_fragment_source), tilecount_x, tilecount_y, 8);

gl.clearColor( 0.0, 0.0, 0.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();

let planemesh = null;
Mesh.from_obj_file( gl, "plane.obj", mesh_loaded );//Mesh.plane(gl);
let sphere = Mesh.sphere( gl, 8 );
let skyboxmesh = Mesh.box(gl);
let box = Mesh.box(gl);

let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
camera = new Camera(new Vec4(0, 0, 2, 0), 0, 0, 0, perspective);
let cube_map_perspective = Mat4.perspective(Math.PI / 2, 1, 0.1, 1000);
cube_map_camera = new Camera(new Vec4(0, 0, 0, 0), 0, 0, 0, cube_map_perspective);


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
MVPBuffer.bindToShader(light_cull_shader, "MVP");    
    
const numLightsBytes = 4 * 4;           //glsl pads to vec4s
const lightPositionsBytes = 64 * 4 * 4; //glsl pads to vec4s
const lightColorsBytes = 64 * 4 * 4;    //glsl pads to vec4s
let lightsBuffer = new GPUBuffer(gl, gl.UNIFORM_BUFFER, numLightsBytes + lightPositionsBytes + lightColorsBytes, 1);
lightsBuffer.setData(numLights, 0);
lightsBuffer.setData(lightPositions, numLightsBytes);
lightsBuffer.setData(lightColors, numLightsBytes + lightPositionsBytes);
lightsBuffer.bindToShader(mainshader, "Lights");
lightsBuffer.bindToShader(lightshader, "Lights");
lightsBuffer.bindToShader(light_cull_shader, "Lights");

Input.setMouseHandler(handleMouse);
Input.init();

let doneload = false;
let cubemaploaded = [false, false, false, false, false, false];
let tex = loadTexture(gl, "metal_scale.png", function() { doneload = true; });
let cube_map_texture = loadCubeMap(gl, 'right.jpg', 'left.jpg', 'top.jpg', 'bottom.jpg', 'front.jpg', 'back.jpg', function() { });
let new_cube_map_texture = loadCubeMap(gl, 'right.jpg', 'left.jpg', 'top.jpg', 'bottom.jpg', 'front.jpg', 'back.jpg', function(index) { cubemaploaded[index] = true; console.log(index); });
gl.enable( gl.BLEND );
gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);

let renderCubeMap = false;
let sceneGraph = new SceneGraph();
let node3 = new Node(null, Mat4.translation(0.0, 0.0, -5.0));
let node2 = new Node(null, Mat4.translation(0.0, 0.0, -5.0), [node3]);
let node1 = new Node(sceneGraph.getRoot(), Mat4.translation(0, 0, 0), [node2]);
sceneGraph.update();

requestAnimationFrame(render);

function handleMouse(deltaX, deltaY) {
    camera.rotateBy(0, 0.0005 * deltaY, -0.0005 * deltaX);
}

function mesh_loaded(mesh) {
    planemesh = mesh;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if(typeof camera !== 'undefined' && camera !== null) {
        camera.setPerspectiveMat(Mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 100));
    }
    
    if (depthFrameBufferInfo) { destroyDepthFramebuffer(gl, depthFrameBufferInfo); }
    depthFrameBufferInfo = createDepthFramebuffer(gl, canvas.width, canvas.height);

    if(light_cull_shader) {
        tilecount_x = Math.ceil(canvas.width / 16);
        tilecount_y = Math.ceil(canvas.height / 16);
        light_cull_shader.rebuild(gl, tilecount_x, tilecount_y, 8);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function renderTerrain() {
    mainshader.use();
    //let model = Mat4.translation(0.0, -1.0, 0.0).mul(Mat4.scale(10, 10, 10).mul(Mat4.rotation_xy( 0.0 )));
    let model = Mat4.translation(0.0, 4.0, -30.0).mul(Mat4.scale(10, 10, 10).mul(Mat4.rotation_yz( -0.25 )));


    //let cameramat = camera.getMatrix();
    //let viewpos = camera.getPosition();
    let cameramat = cube_map_camera.getMatrix();
    let viewpos = cube_map_camera.getPosition();

    gl.uniform3f( gl.getUniformLocation( mainshader.getProgram(), "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    
    MVPBuffer.bind();
    MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
    MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    planemesh.render(gl, mainshader.getProgram());
}

function renderObjects(now, depthonly) {
    let currentshader = mainshader.getProgram();
    if(depthonly) {
        currentshader = depthshader.getProgram();
    }



    //let model = Mat4.translation(0.0, 4.0, -30.0).mul(Mat4.scale(10, 10, 10).mul(Mat4.rotation_yz( -0.25 )));
    let model = Mat4.translation(0.0, 0.0, -10.0).mul(Mat4.scale(1, 1, 1));

    let cameramat = camera.getMatrix();
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( currentshader, "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    
    MVPBuffer.bind();
    MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
    MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);

    if (planemesh) {
        planemesh.render(gl, currentshader);
    }
    //render objects that we dont want to be included in our depth information
    if(!depthonly) {
        cubemapshader.use();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube_map_texture);
        skyboxmesh.render(gl, cubemapshader.getProgram());

        mainshader.use();
        MVPBuffer.setData(node1.matrix.asColumnMajorFloat32Array(), 0);
        sphere.render(gl, mainshader.getProgram());

        MVPBuffer.setData(node2.matrix.asColumnMajorFloat32Array(), 0);
        sphere.render(gl, mainshader.getProgram());

        MVPBuffer.setData(node3.matrix.asColumnMajorFloat32Array(), 0);
        sphere.render(gl, mainshader.getProgram());


        lightshader.use();
        sphere.render(gl, lightshader.getProgram(), numLights);

        watershader.use();
        model = Mat4.translation(0.0, 0.0, 0.0).mul(Mat4.scale(10, 10, 10));
        MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
        gl.uniform1f(gl.getUniformLocation(watershader.getProgram(), "time"), now / 1000);
        gl.uniform3f( gl.getUniformLocation( watershader.getProgram(), "camera_position" ), viewpos.x, viewpos.y, viewpos.z );
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, new_cube_map_texture);
        planemesh.render(gl, watershader.getProgram());

    }
}

function render(now) {
    if(!doneload || !cubemaploaded.every(e => e === true)) { requestAnimationFrame(render); return; }
    
    if(!renderCubeMap) {
        renderCubeMap = true;
        createCubemapFrameBuffer(new_cube_map_texture);
    }

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

    //update scene graph
    //sceneGraph.update();

    //depth pass
    gl.bindTexture( gl.TEXTURE_2D, null );

    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBufferInfo.framebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    depthshader.use();
    renderObjects(now, true);

    gl.bindTexture( gl.TEXTURE_2D, depthFrameBufferInfo.texture);
    light_cull_shader.dispatch();


    //main pass
    gl.bindTexture( gl.TEXTURE_2D, tex );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mainshader.use();
    renderObjects(now, false);

    requestAnimationFrame(render);
}