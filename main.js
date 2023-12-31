let canvas = document.getElementById( 'the-canvas' );

/** @type {WebGL2RenderingContext} */
let gl = canvas.getContext( 'webgl2' );

const ext = gl.getExtension('ANGLE_instanced_arrays') || gl.getExtension('EXT_instanced_arrays');
const rgbaf16ext = gl.getExtension('EXT_color_buffer_float');

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

    const int TILE_SIZE = 16;
    const int MAX_LIGHTS_PER_TILE = 16;

    out vec4 f_color;
    
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;
    
    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64];//w radius of light
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
    } lights;
    
    uniform sampler2D tex_0;
    uniform sampler2D lightData0;
    uniform sampler2D lightData1;
    uniform sampler2D lightData2;
    uniform sampler2D lightData3;
    uniform sampler2D lightData4;
    uniform sampler2D lightData5;
    uniform sampler2D lightData6;
    uniform sampler2D lightData7;

    uniform vec3 view_pos;
    uniform vec2 screen_size;
    
    uniform float ambient;
    uniform float mat_diffuse;
    uniform float mat_specular;
    uniform float mat_shininess;
    
    void unpackInts(vec4 packedValues, out int a, out int b) {
        a = int(packedValues.r);
        b = int(packedValues.g);
    }

    float calcSpotlightAttenuation(vec3 light_direction, vec3 spotlight_dir, float cutoff_angle) {
        float cosAngle = dot(normalize(-light_direction), normalize(spotlight_dir));
        float spotlightCutoff = cos(cutoff_angle);
        
        if (cosAngle > spotlightCutoff) {
            float spotEffect = smoothstep(spotlightCutoff, spotlightCutoff + 0.1, cosAngle);
            float dist = length(lights.spotlight_position - aPosition);
            return spotEffect * 3.0 * (1.0 / (0.07 * dist));
        } else {
            return 0.0;
        }
    }

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
        vec2 tile = gl_FragCoord.xy / screen_size;
        int tilelightdata[MAX_LIGHTS_PER_TILE];
        unpackInts(texture(lightData0, tile), tilelightdata[0], tilelightdata[1]);
        unpackInts(texture(lightData1, tile), tilelightdata[2], tilelightdata[3]);
        unpackInts(texture(lightData2, tile), tilelightdata[4], tilelightdata[5]);
        unpackInts(texture(lightData3, tile), tilelightdata[6], tilelightdata[7]);
        unpackInts(texture(lightData4, tile), tilelightdata[8], tilelightdata[9]);
        unpackInts(texture(lightData5, tile), tilelightdata[10], tilelightdata[11]);
        unpackInts(texture(lightData6, tile), tilelightdata[12], tilelightdata[13]);
        unpackInts(texture(lightData7, tile), tilelightdata[14], tilelightdata[15]);

        vec3 ambient = ambient * lights.sun_color;

        vec3 final = ambient + calcLight(-lights.sun_direction, lights.sun_color, aNormal);
        vec3 spotlightfragdir = normalize(lights.spotlight_position - aPosition);
        final += calcLight(spotlightfragdir, lights.spotlight_color.rgb, aNormal) * calcSpotlightAttenuation(spotlightfragdir, lights.spotlight_direction, lights.spotlight_color.w);

        for(int i = 0; i < MAX_LIGHTS_PER_TILE; i++)
        {
            if(tilelightdata[i] >= lights.num_lights) {
                break;
            }
            int lightindex = tilelightdata[i];

            float dist = length(lights.light_positions[lightindex] - aPosition);
            if(dist > lights.light_colors[lightindex].w) continue;
            //a nice fallof as our light reaches its radius
            float atten = 1.0 - dist * dist / (lights.light_colors[lightindex].w * lights.light_colors[lightindex].w);
            vec3 light_dir = normalize(lights.light_positions[lightindex] - aPosition);
            final += calcLight(light_dir, vec3(lights.light_colors[lightindex]), aNormal) * atten;
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
    
    float frequency = 3000.0;
    float amplitude = 0.1;
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
    float alpha = 0.93;

    in vec3 v_normal;
    in vec2 v_uv;
    in vec3 v_pos;

    float fresnelPower = 0.825; 
    float mat_ambient = 0.25;
    float mat_diffuse = 0.85;
    float mat_specular = 2.0;
    float mat_shininess = 32.0;
    uniform vec3 camera_position;

    uniform samplerCube skybox;

    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64];//w radius of light
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
    } lights;

    float calcSpotlightAttenuation(vec3 light_direction, vec3 spotlight_dir, float cutoff_angle) {
        float cosAngle = dot(normalize(-light_direction), normalize(spotlight_dir));
        float spotlightCutoff = cos(cutoff_angle);
        
        if (cosAngle > spotlightCutoff) {
            float spotEffect = smoothstep(spotlightCutoff, spotlightCutoff + 0.1, cosAngle);
            float dist = length(lights.spotlight_position - v_pos);
            return spotEffect * 3.0 * (1.0 / (0.07 * dist));
        } else {
            return 0.0;
        }
    }
    
    float fresnel(vec3 view, vec3 norm, float power) {
        float fresnelFactor = dot(-view, norm);
        float inversefresnelFactor = 1.0 - fresnelFactor;

        return pow(inversefresnelFactor, power);
    }

    vec3 calcLight(vec3 light_direction, vec3 light_color)
    {
        float L = max(dot(v_normal, light_direction), 0.0);
        vec3 diffuse = mat_diffuse * light_color * L;

        vec3 halfway = normalize(light_direction + camera_position);
        
        vec3 reflection = reflect(-light_direction, v_normal);
        vec3 view_dir = normalize(camera_position - v_pos);
        float spec = pow(max(dot(view_dir, halfway), 0.0), mat_shininess) * L;
        vec3 specular = light_color * spec * mat_specular;

        return diffuse + specular;
    }


    void main( void ) {
        vec3 I = normalize(v_pos - camera_position);
        vec3 R = reflect(I, normalize(v_normal));
        R.xy = -R.xy;
        
        float f = fresnel(normalize(lights.spotlight_direction), vec3(0.0, 0.85, 0.0), fresnelPower);

        vec3 final = calcLight(-lights.sun_direction, lights.sun_color);
        vec3 spotlightfragdir = normalize(lights.spotlight_position - v_pos);
        final += calcLight(spotlightfragdir, lights.spotlight_color.rgb) * calcSpotlightAttenuation(spotlightfragdir, lights.spotlight_direction, lights.spotlight_color.w);

        t_f_color = vec4(texture(skybox, R).rgb * f, 1.0) * vec4(0.3, 0.56, 0.95, alpha) * vec4(final, 1.0);
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
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
    } lights;
    
    out vec3 aNormal;
    out vec2 aUV;
    flat out int instanceID;
    
    void main( void )
    {
        aNormal = normal;
        aUV = uv;
        instanceID = int(gl_InstanceID);
        gl_Position = (mvp.view_projection) * vec4( (position / 2.0) + lights.light_positions[int(gl_InstanceID)], 1.0 );
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
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
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
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
    } lights;

    uniform vec3 view_pos;
    uniform vec2 screen_size;
    uniform vec2 tile_count;

    uniform sampler2D depthimage;
    
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
    };

    Frustum createFrustum(vec2 tile, float minDepth, float maxDepth) {
        Frustum frustum;

		vec2 negativeNDC = (2.0 * tile) / tile_count;
		vec2 positiveNDC = (2.0 * (tile + vec2(1.0, 1.0))) / tile_count;

		frustum.planes[0] = vec4(1.0, 0.0, 0.0, 1.0 - negativeNDC.x);   //left
		frustum.planes[1] = vec4(-1.0, 0.0, 0.0, -1.0 + positiveNDC.x); //right
		frustum.planes[2] = vec4(0.0, 1.0, 0.0, 1.0 - negativeNDC.y);   //bottom
		frustum.planes[3] = vec4(0.0, -1.0, 0.0, -1.0 + positiveNDC.y); //top
		frustum.planes[4] = vec4(0.0, 0.0, -1.0, -minDepth);            //near
		frustum.planes[5] = vec4(0.0, 0.0, 1.0, maxDepth);              //far

		for (int i = 0; i < 4; i++) {
			frustum.planes[i] *= mvp.view_projection;
			frustum.planes[i] /= length(frustum.planes[i].xyz);
		}

		frustum.planes[4] *= mvp.view_projection;//TODO: make just view
		frustum.planes[4] /= length(frustum.planes[4].xyz);
		frustum.planes[5] *= mvp.view_projection;//TODO: make just view
		frustum.planes[5] /= length(frustum.planes[5].xyz);

        return frustum;
    }

    bool inTile(int lightindex, Frustum frustum) {
        float light_radius = lights.light_colors[lightindex].w;
        for(int i = 0; i < 4; i++) {//TODO: 6
            if(dot(vec4(lights.light_positions[lightindex], 1.0), frustum.planes[i]) < -light_radius) {
                return false;
            }
        }
        return true;
    }
    
    vec4 packInts(int a, int b) {
        return vec4(float(a), float(b), 0.0, 1.0);
    }

    void main() {
        vec2 screenuv = (aPosition + 1.0) / 2.0;
        vec2 tile = screenuv * tile_count;
        
        float maxDepth = 0.0;
        float minDepth = 1.0;
        //TODO: linearize depth
        for(int x = 0; x < TILE_SIZE; x++) {
            for(int y = 0; y < TILE_SIZE; y++) {
                float depth = texture(depthimage, (tile * float(TILE_SIZE) + vec2(x, y)) / screen_size ).r;
                maxDepth = max(maxDepth, depth);
                minDepth = min(minDepth, depth);
            }
        }
        if(minDepth > maxDepth) minDepth = maxDepth;
        
        Frustum frustum = createFrustum(tile, minDepth, maxDepth);
        
        int tilelightdata[MAX_LIGHTS_PER_TILE];
        int lindex = 0;
        for(int i = 0; i < lights.num_lights; i++) {
            if(lindex > MAX_LIGHTS_PER_TILE) { break; }
            if(inTile(i, frustum)) {
                tilelightdata[lindex] = i;
                lindex++;
            }
        }
        if(lindex < MAX_LIGHTS_PER_TILE) {tilelightdata[lindex] = lights.num_lights; }
        
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

let grass_comp_vertex_source = 
`   #version 300 es
    precision mediump float;
    
    in vec3 position;
    out vec2 aPosition;

    void main() {
        aPosition = position.xy;
        gl_Position = vec4(position, 1.0);
    }
`;

let grass_comp_fragment_source = 
`   #version 300 es
    precision mediump float;

    in vec2 aPosition;

    layout(location = 0) out vec4 grassPosXY;
    layout(location = 1) out vec4 grassPosZROT;

    uniform sampler2D heightmap;
    uniform vec2 grassSize;
    uniform float seed;
    uniform vec2 chunk;
    
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    vec2 randomVec2(vec2 inputVec2, float seed) {
        float randX = random(inputVec2 + seed);
        float randY = random(inputVec2 - seed);
        return vec2(randX, randY);
    }

    void main() {
        vec2 tile = gl_FragCoord.xy;

        vec2 grassPos = randomVec2(tile, seed * 10.0);
        vec4 heightmapsample = texture(heightmap, ((chunk * 100.0) + (tile)) / 1000.0);
        float grassPosY = heightmapsample.g == 1.0 ? 1000.0 : heightmapsample.r * 50.0;

        float grassRotation = random(tile + seed);
        
        grassPosXY = vec4(grassPos.x, grassPosY, 0.0, 1.0);
        grassPosZROT = vec4(grassPos.y, grassRotation, 0.0, 1.0);
    }
`;

let grass_draw_vertex_source =
`   #version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    uniform MVP {
        mat4 model;
        mat4 view_projection;
    } mvp;

    uniform sampler2D noise;
    uniform sampler2D grassPosXY;
    uniform sampler2D grassPosZROT;
    
    uniform vec2 grassSize;
    uniform vec2 windDir;
    uniform vec3 positionoffset;
    uniform float grasslength;

    out vec3 aPosition;
    out vec3 aNormal;
    out vec2 aUV;
    flat out int instanceID;
    
    void main( void )
    {
        instanceID = int(gl_InstanceID);
        vec2 grassIndex = vec2(instanceID % int(grassSize.x), instanceID / int(grassSize.x));
        vec2 ZROT = texture(grassPosZROT, grassIndex / grassSize).xy;
        vec4 grassPos = vec4(texture(grassPosXY, grassIndex / grassSize).xy, ZROT.x, 1.0);
        float angle = ZROT.y * 6.28;
        float s = sin(-angle);
        float c = cos(-angle);
        vec3 newpos = vec3(grasslength * position.x * c - grasslength * position.z * s, grasslength * position.y, grasslength * position.x * s + grasslength * position.z * c);
        vec3 newnormal = vec3(grasslength * normal.x * c - grasslength * normal.z * s, grasslength * normal.y, grasslength * normal.x * s + grasslength * normal.z * c);

        vec3 noise3d = texture(noise, (grassIndex / grassSize) + windDir).xyz;
        vec2 grasswindoffsetxz = (noise3d.xy - 0.5) * position.y * position.y / 10.0;
        vec3 grasswindoffset = vec3(grasswindoffsetxz.x, -length(grasswindoffsetxz), grasswindoffsetxz.y);
        grassPos.xyz += grasswindoffset;

        vec3 finalpos = positionoffset + newpos + grassPos.xyz + vec3(grassIndex.x, 0.0, grassIndex.y);
        aPosition = finalpos;
        aNormal = normalize(newnormal);
        aUV = uv;
        gl_Position = (mvp.view_projection) * vec4(finalpos, 1.0 );
    }
`;

let grass_draw_fragment_source = 
`   #version 300 es
    precision mediump float;

    const int TILE_SIZE = 16;
    const int MAX_LIGHTS_PER_TILE = 16;

    //point lights
    uniform Lights {
        highp int num_lights;
        vec3 light_positions[64];
        vec4 light_colors[64];
        vec3 sun_direction;
        vec3 sun_color;
        vec3 spotlight_position;
        vec4 spotlight_color;//w component is angle limit
        vec3 spotlight_direction;
    } lights;

    uniform sampler2D lightData0;
    uniform sampler2D lightData1;
    uniform sampler2D lightData2;
    uniform sampler2D lightData3;
    uniform sampler2D lightData4;
    uniform sampler2D lightData5;
    uniform sampler2D lightData6;
    uniform sampler2D lightData7;

    out vec4 f_color;
    
    in vec3 aPosition;
    in vec3 aNormal;
    in vec2 aUV;
    flat in int instanceID;

    uniform vec3 camera_position;
    uniform vec2 screen_size;

    void unpackInts(vec4 packedValues, out int a, out int b) {
        a = int(packedValues.r);
        b = int(packedValues.g);
    }

    float calcSpotlightAttenuation(vec3 light_direction, vec3 spotlight_dir, float cutoff_angle) {
        float cosAngle = dot(normalize(-light_direction), normalize(spotlight_dir));
        float spotlightCutoff = cos(cutoff_angle);
        
        if (cosAngle > spotlightCutoff) {
            float spotEffect = smoothstep(spotlightCutoff, spotlightCutoff + 0.1, cosAngle);
            float dist = length(lights.spotlight_position - aPosition);
            return spotEffect * 3.0 * (1.0 / (0.03 * dist));
        } else {
            return 0.0;
        }
    }

    vec3 calcLight(vec3 light_direcion, vec3 light_color, vec3 surf_normal)
    {
        float L = max(abs(dot(surf_normal, light_direcion)), 1.0);
        vec3 diffuse = 0.3 * light_color * L;
        
        vec3 reflection = reflect(-light_direcion, surf_normal);
        vec3 view_dir = normalize(camera_position - aPosition);
        float spec = pow(abs(dot(view_dir, reflection)), 1.0) * L;
        vec3 specular = light_color * spec * 0.1;
    
        return diffuse + specular;
    }

    void main( void )
    {
        vec2 tile = gl_FragCoord.xy / screen_size;
        int tilelightdata[MAX_LIGHTS_PER_TILE];
        unpackInts(texture(lightData0, tile), tilelightdata[0], tilelightdata[1]);
        unpackInts(texture(lightData1, tile), tilelightdata[2], tilelightdata[3]);
        unpackInts(texture(lightData2, tile), tilelightdata[4], tilelightdata[5]);
        unpackInts(texture(lightData3, tile), tilelightdata[6], tilelightdata[7]);
        unpackInts(texture(lightData4, tile), tilelightdata[8], tilelightdata[9]);
        unpackInts(texture(lightData5, tile), tilelightdata[10], tilelightdata[11]);
        unpackInts(texture(lightData6, tile), tilelightdata[12], tilelightdata[13]);
        unpackInts(texture(lightData7, tile), tilelightdata[14], tilelightdata[15]);

        vec3 ambient = 0.01 * lights.sun_color;

        vec3 final = ambient;// + calcLight(-lights.sun_direction, lights.sun_color, aNormal);
        vec3 spotlightfragdir = normalize(lights.spotlight_position - aPosition);
        final += calcLight(spotlightfragdir, lights.spotlight_color.rgb, aNormal) * calcSpotlightAttenuation(spotlightfragdir, lights.spotlight_direction, lights.spotlight_color.w);
        for(int i = 0; i < MAX_LIGHTS_PER_TILE; i++)
        {
            if(tilelightdata[i] >= lights.num_lights) {
                break;
            }
            int lightindex = tilelightdata[i];

            float dist = length(lights.light_positions[lightindex] - aPosition);
            if(dist > lights.light_colors[lightindex].w) continue;
            //a nice fallof as our light reaches its radius
            float atten = 1.0 - dist * dist / (lights.light_colors[lightindex].w * lights.light_colors[lightindex].w);
            vec3 light_dir = normalize(lights.light_positions[lightindex] - aPosition);
            final += calcLight(light_dir, vec3(lights.light_colors[lightindex]), aNormal) * atten;
        }

        f_color = vec4(mix(vec3(0.0, 0.1, 0.0), vec3(21.0/255.0, 48.0/255.0, 3.0/255.0), aPosition.y / 10.0) * final, 1.0);
    }
`;

let mainshader = Shader.createShader(gl, vertex_source, fragment_source);
let lightshader = Shader.createShader(gl, light_draw_vertex_source, light_draw_fragment_source);
let depthshader = Shader.createShader(gl, depth_vertex_source, depth_fragment_source);
let cubemapshader = Shader.createShader(gl, cube_map_vertex_source, cube_map_fragment_source);
let watershader = Shader.createShader(gl, water_vertex_source, water_fragment_source);
let grassshader = Shader.createShader(gl, grass_draw_vertex_source, grass_draw_fragment_source);

let tilecount_x = Math.ceil(canvas.width / 16);
let tilecount_y = Math.ceil(canvas.height / 16);
light_cull_shader = new ComputeShader(gl, Shader.createShader(gl, light_culling_comp_vertex_source, light_culling_comp_fragment_source), tilecount_x, tilecount_y, 8);
setupMainTextureUnits();

let grassSizeX = 100;
let grassSizeY = 100;

grass_comp_shader = new ComputeShader(gl, Shader.createShader(gl, grass_comp_vertex_source, grass_comp_fragment_source), grassSizeX, grassSizeY, 2);
grass_comp_shader.use();
gl.uniform1f( gl.getUniformLocation( grass_comp_shader.getProgram(), "seed" ), 1.0 );
gl.uniform2f( gl.getUniformLocation( grass_comp_shader.getProgram(), "grassSize" ), grassSizeX, grassSizeY );
grassshader.use();
gl.uniform2f( gl.getUniformLocation( grassshader.getProgram(), "grassSize" ), grassSizeX, grassSizeY );

gl.clearColor( 0.0, 0.0, 0.0, 1 );
gl.enable( gl.DEPTH_TEST );

let last_update = performance.now();

let flashlightmesh = null;
Mesh.from_obj_file( gl, "flashlight.obj", function(mesh) { flashlightmesh = mesh; } );
let planemesh = null;
Mesh.from_obj_file( gl, "plane.obj", function(mesh) { planemesh = mesh; } );
let grassmesh = null;
Mesh.from_obj_file( gl, "grass/grass.obj", function(mesh) { grassmesh = mesh; } );
let grassmeshlod1 = null;
Mesh.from_obj_file( gl, "grass/grasslod1.obj", function(mesh) { grassmeshlod1 = mesh; } );
let sphere = Mesh.sphere( gl, 8 );
let skyboxmesh = Mesh.box(gl);
let box = Mesh.box(gl);

let cube_map_perspective = Mat4.perspective(Math.PI / 2, 1, 0.1, 1000);
cube_map_camera = new Camera(new Vec4(-480.0, 12.0, 400.0, 0), 0, 0, 0, cube_map_perspective);

let heighttextureloaded = false;
let heightimage = null;
let heighttex = loadTexture(gl, "ground/heightmap3.png", function(heightim) {
    heighttextureloaded = true;
    heightimage = heightim;
});
const heightmapmeshes = new HashMap2D();


let perspective = Mat4.perspective(Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
camera = new Camera(new Vec4(-373, 55, 303, 1), 0, 0, 0.5, perspective);
camera.getMatrix();
camera.calcFrustum();

let sundir = new Vec4(-1.0, -1.0, -1.0, 0.0);
sundir = sundir.norm();
mainshader.use();

gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "ambient" ), 0.01 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_diffuse" ), 0.1 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_specular" ), 0.1 );
gl.uniform1f( gl.getUniformLocation( mainshader.getProgram(), "mat_shininess" ), 1.0 );

const numLights = new Int32Array([5]);
const lightPositions = new Float32Array(
    [
        0.0, 11.0, 0.0, 0.0,
        5.0, 11.0, 0.0, 0.0,
        0.0, 10.0, -2.0, 0.0,
        0.0, 11.0, 5.0, 0.0
    ]);
const lightColors = new Float32Array(
    [
        1.0, 0.0, 0.0, 50,
        0.0, 2.0, 0.0, 50,
        0.0, 0.0, 5.0, 50,
        1.0, 1.0, 0.0, 50,
        252/255, 115/255, 3/255, 50
    ]);
    
let MVPBuffer = new GPUBuffer(gl, gl.UNIFORM_BUFFER, 4 * 16 * 2, 0);
MVPBuffer.bindToShader(mainshader, "MVP");
MVPBuffer.bindToShader(lightshader, "MVP");
MVPBuffer.bindToShader(depthshader, "MVP");  
MVPBuffer.bindToShader(light_cull_shader, "MVP");
MVPBuffer.bindToShader(grassshader, "MVP");
    
const numLightsBytes = 4 * 4;           //glsl pads to vec4s
const lightPositionsBytes = 64 * 4 * 4; //glsl pads to vec4s
const lightColorsBytes = 64 * 4 * 4;    //glsl pads to vec4s
const sunPosBytes = 4 * 4;
const sunColorBytes = 4 * 4;
const dirLightPosBytes = 4 * 4;
const dirLightColorBytes = 4 * 4;
const dirLightDirBytes = 4 * 4;
let lightsBuffer = new GPUBuffer(gl, gl.UNIFORM_BUFFER, numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes + dirLightColorBytes + dirLightDirBytes, 1);
lightsBuffer.setData(numLights, 0);
lightsBuffer.setData(lightPositions, numLightsBytes);
lightsBuffer.setData(lightColors, numLightsBytes + lightPositionsBytes);
lightsBuffer.setData(new Float32Array([sundir.x, sundir.y, sundir.z]), numLightsBytes + lightPositionsBytes + lightColorsBytes);
lightsBuffer.setData(new Float32Array([1,1,1]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes);

lightsBuffer.setData(new Float32Array([0,2,0]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes);//dirlightpos
lightsBuffer.setData(new Float32Array([1,1,1,0.75]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes);//dirlightcolor
lightsBuffer.setData(new Float32Array([0,0,-1]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes + dirLightColorBytes);//dirlightdir

lightsBuffer.bindToShader(mainshader, "Lights");
lightsBuffer.bindToShader(lightshader, "Lights");
lightsBuffer.bindToShader(light_cull_shader, "Lights");
lightsBuffer.bindToShader(grassshader, "Lights");
lightsBuffer.bindToShader(watershader, "Lights");

Input.setMouseHandler(handleMouse);
Input.init();

let chunkManager = new ChunkManager(100, 0, 50, 3, 2.5, camera);

let doneload = false;
let cubemaploaded = [false, false, false, false, false, false];
let tex = loadTexture(gl, "metal_scale.png", function() { doneload = true; });

let groundtex = loadTexture(gl, "ground/brown_mud_leaves_diffuse.jpg", function() { });
let wind_noise_texture = loadTexture(gl, "grass/noise.png", function() {});
let flashlight_texture = loadTexture(gl, "flashlight.png", function() {});
let windDir = 5*Math.PI/4;
let windspeed = 0.1;
let windPosx = 0.0;
let windPosy = 0.0;
let grasslength = 1.0;

let cube_map_texture = loadCubeMap(gl, 'right.jpg', 'left.jpg', 'top.jpg', 'bottom.jpg', 'front.jpg', 'back.jpg', function() { });
let new_cube_map_texture = loadCubeMap(gl, 'right.jpg', 'left.jpg', 'top.jpg', 'bottom.jpg', 'front.jpg', 'back.jpg', function(index) { cubemaploaded[index] = true; console.log(index); });

let renderCubeMap = false;
let sceneGraph = new SceneGraph();


let lightCenterNode = new Node(sceneGraph.getRoot(), Mat4.translation(-480.0, 30.0, 400.0), []);
let lightLCNode = new Node(lightCenterNode, Mat4.translation(90, 0, 0), []);
let lightRCNode = new Node(lightCenterNode, Mat4.translation(-90, 0, 0), []);
let lightTCNode = new Node(lightCenterNode, Mat4.translation(0, 0, 120), []);
let lightBCNode = new Node(lightCenterNode, Mat4.translation(0, 0, -120), []);

let lightNodes = [
    new Node(lightLCNode, Mat4.translation(-15, 0, 0), []),
    new Node(lightLCNode, Mat4.translation(15, 0, 0), []),
    new Node(lightRCNode, Mat4.translation(-15, 0, 0), []),
    new Node(lightRCNode, Mat4.translation(15, 0, 0), []),
    new Node(lightTCNode, Mat4.translation(15, 0, 15), []),
]

let flashlightNode = new Node(null, Mat4.scale(0.1, 0.1, 0.1).mul(Mat4.translation(4, -4, -5).mul(Mat4.rotation_yz(0.25).mul(Mat4.rotation_xz(0.25)))), []);
let cameraNode = new Node(sceneGraph.getRoot(), camera.getView(), [flashlightNode]);


sceneGraph.update();
gl.enable( gl.BLEND );
gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);
gl.cullFace( gl.BACK );
gl.frontFace( gl.CCW );
gl.enable( gl.CULL_FACE );

requestAnimationFrame(render);

function handleMouse(deltaX, deltaY) {
    camera.rotateBy(0, 0.0005 * deltaY, -0.0005 * deltaX);
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
    let model = Mat4.translation(-480.0, 12.0, 390.0).mul(Mat4.scale(10, 10, 10).mul(Mat4.rotation_yz( -0.25 )));


    //let cameramat = camera.getMatrix();
    //let viewpos = camera.getPosition();
    let cameramat = cube_map_camera.getMatrix();
    let viewpos = cube_map_camera.getPosition();

    gl.uniform3f( gl.getUniformLocation( mainshader.getProgram(), "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    
    MVPBuffer.bind();
    MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
    MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);

    //gl.bindTexture(gl.TEXTURE_2D, tex);
    //planemesh.render(gl, mainshader.getProgram());
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, groundtex );
    
    bindUnbindLightDataTextures(true);
    //render terrain for the chunks
    chunkManager.setCamera(cube_map_camera);
    cube_map_camera.calcFrustum();
    chunkManager.updateVisibleChunks(true);
    let vischunks = chunkManager.getVisibleChunks();
    vischunks.forEach(chunk => {
        if (!heightmapmeshes.get(chunk[0], chunk[1]) && heighttextureloaded) {
            const xpos = (chunk[0] % 10) * 100;
            const ypos = (chunk[1] % 10) * 100;
            const xsamplepos = xpos < 0 ? 1000 - Math.abs(xpos) : xpos;
            const ysamplepos = ypos < 0 ? 1000 - Math.abs(ypos) : ypos;
            
            heightmapmeshes.set(chunk[0], chunk[1], [Mesh.fromHeightMap(gl, heightimage, xsamplepos, ysamplepos, 101, 101, 101, 50), xpos, ypos]);
            console.log("pre loading chunk", xpos, ypos);
        }
        heightmapmesh = heightmapmeshes.get(chunk[0], chunk[1]);
        model = Mat4.translation(heightmapmesh[1], 0.0, heightmapmesh[2]);
        MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);        
        heightmapmesh[0].render(gl, mainshader.getProgram());
    });
    
    grassshader.use();
    gl.uniform3f( gl.getUniformLocation( grassshader.getProgram(), "camera_position" ), viewpos.x, viewpos.y, viewpos.z );
    gl.uniform2f(gl.getUniformLocation(grassshader.getProgram(), 'windDir'), 0, 0);
    gl.uniform1f(gl.getUniformLocation(grassshader.getProgram(), 'grasslength'), grasslength);
    gl.uniform2f(gl.getUniformLocation(grassshader.getProgram(), "screen_size" ), 2048, 2048 );

    gl.disable( gl.CULL_FACE );
    vischunks.forEach(chunk => {
        grass_comp_shader.use();
        gl.uniform1f( gl.getUniformLocation( grass_comp_shader.getProgram(), "seed" ), chunk[0] * 10 + chunk[1] );
        gl.uniform2f( gl.getUniformLocation( grass_comp_shader.getProgram(), "chunk" ), chunk[0], chunk[1] );
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, heighttex);
        grass_comp_shader.dispatch();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        grassshader.use();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, null);
        let grasstextures = grass_comp_shader.getRenderTextures();
        bindUnbindLightDataTextures(true);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, wind_noise_texture);
        gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, grasstextures[0]);
        gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, grasstextures[1]);
        
        gl.uniform3f( gl.getUniformLocation( grassshader.getProgram(), "positionoffset" ), chunk[0] * 100, 0, chunk[1] * 100 );
        if(chunk[2] == 1) {
            grassmeshlod1.renderInstanced(gl, grassshader.getProgram(), grassSizeX * grassSizeY);
        } else {
            grassmesh.renderInstanced(gl, grassshader.getProgram(), grassSizeX * grassSizeY);
        }
        
    });
    
    gl.enable( gl.CULL_FACE );
    gl.activeTexture(gl.TEXTURE0);
    
    
    chunkManager.setCamera(camera);
}

function renderObjects(time_delta, now, depthonly) {
    let currentshader = mainshader.getProgram();
    if(depthonly) {
        currentshader = depthshader.getProgram();
    }

    let model = Mat4.translation(0.0, 9.0, 0.0).mul(Mat4.scale(10, 1, 10).mul(Mat4.rotation_xz( 0.0 )));
    
    let cameramat = camera.getMatrix();
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( currentshader, "view_pos" ), viewpos.x, viewpos.y, viewpos.z );
    MVPBuffer.bind();
    MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
    MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);
    /*
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, tex );

    if (planemesh) {
        planemesh.render(gl, currentshader);
    }
    */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, groundtex );
    
    bindUnbindLightDataTextures(true);
    //render terrain for the chunks
    let vischunks = chunkManager.getVisibleChunks();
    vischunks.forEach(chunk => {
        if (!heightmapmeshes.get(chunk[0], chunk[1]) && heighttextureloaded) {
            const xpos = (chunk[0] % 10) * 100;
            const ypos = (chunk[1] % 10) * 100;
            const xsamplepos = xpos < 0 ? 1000 - Math.abs(xpos) : xpos;
            const ysamplepos = ypos < 0 ? 1000 - Math.abs(ypos) : ypos;
            
            heightmapmeshes.set(chunk[0], chunk[1], [Mesh.fromHeightMap(gl, heightimage, xsamplepos, ysamplepos, 101, 101, 101, 50), xpos, ypos]);
            console.log("loading chunk", xpos, ypos);
        }
        else {
            heightmapmesh = heightmapmeshes.get(chunk[0], chunk[1]);
            model = Mat4.translation(heightmapmesh[1], 0.0, heightmapmesh[2]);
            MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);        
            heightmapmesh[0].render(gl, currentshader);
        }
    });

    //render objects that we dont want to be included in our depth information
    if(!depthonly) {

        mainshader.use();
        gl.bindTexture( gl.TEXTURE_2D, flashlight_texture );
        MVPBuffer.setData(flashlightNode.matrix.asColumnMajorFloat32Array(), 0);
        flashlightmesh.render(gl, mainshader.getProgram());


        lightshader.use();
        sphere.renderInstanced(gl, lightshader.getProgram(), numLights);

        watershader.use();
        model = Mat4.translation(-480.0, 12.0, 400.0).mul(Mat4.scale(130, 10, 130));
        MVPBuffer.setData(model.asColumnMajorFloat32Array(), 0);
        gl.uniform1f(gl.getUniformLocation(watershader.getProgram(), "time"), now / 1000);
        gl.uniform3f( gl.getUniformLocation( watershader.getProgram(), "camera_position" ), viewpos.x, viewpos.y, viewpos.z );
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, new_cube_map_texture);
        planemesh.render(gl, watershader.getProgram());

        //grass
        grassshader.use();
        gl.uniform3f( gl.getUniformLocation( grassshader.getProgram(), "camera_position" ), viewpos.x, viewpos.y, viewpos.z );
        windPosx += windspeed * Math.cos(windDir) * time_delta;
        windPosy += windspeed * Math.sin(windDir) * time_delta;
        gl.uniform2f(gl.getUniformLocation(grassshader.getProgram(), 'windDir'), windPosx, windPosy);
        gl.uniform1f(gl.getUniformLocation(grassshader.getProgram(), 'grasslength'), grasslength);
        gl.uniform2f(gl.getUniformLocation(grassshader.getProgram(), "screen_size" ), canvas.width, canvas.height );

        gl.disable( gl.CULL_FACE );
        camera.calcFrustum();
        chunkManager.updateVisibleChunks();
        let vischunks = chunkManager.getVisibleChunks();
        vischunks.forEach(chunk => {
            grass_comp_shader.use();
            gl.uniform1f( gl.getUniformLocation( grass_comp_shader.getProgram(), "seed" ), chunk[0] * 10 + chunk[1] );
            gl.uniform2f( gl.getUniformLocation( grass_comp_shader.getProgram(), "chunk" ), chunk[0], chunk[1] );
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, heighttex);
            grass_comp_shader.dispatch();
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            grassshader.use();
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, null);
            let grasstextures = grass_comp_shader.getRenderTextures();
            bindUnbindLightDataTextures(true);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, wind_noise_texture);
            gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, grasstextures[0]);
            gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, grasstextures[1]);
            
            gl.uniform3f( gl.getUniformLocation( grassshader.getProgram(), "positionoffset" ), chunk[0] * 100, 0, chunk[1] * 100 );
            if(chunk[2] == 1) {
                grassmeshlod1.renderInstanced(gl, grassshader.getProgram(), grassSizeX * grassSizeY);
            } else {
                grassmesh.renderInstanced(gl, grassshader.getProgram(), grassSizeX * grassSizeY);
            }
            
        });
        
        gl.enable( gl.CULL_FACE );
        gl.activeTexture(gl.TEXTURE0);

        //skybox
        cameramat = camera.getMatrix(false);
        MVPBuffer.setData(cameramat.asColumnMajorFloat32Array(), 4 * 16);

        cubemapshader.use();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube_map_texture);
        skyboxmesh.render(gl, cubemapshader.getProgram());
    }
}

function setupMainTextureUnits() {
    mainshader.use();
    gl.uniform1i(gl.getUniformLocation(mainshader.getProgram(), 'tex_0'), 0);
    for(let i = 0; i < light_cull_shader.getRenderTextures().length; i++) {
        gl.uniform1i(gl.getUniformLocation(mainshader.getProgram(), 'lightData' + i), i+1);
    }

    grassshader.use();
    gl.uniform1i(gl.getUniformLocation(grassshader.getProgram(), 'noise'), 0);
    for(let i = 0; i < light_cull_shader.getRenderTextures().length; i++) {
        gl.uniform1i(gl.getUniformLocation(grassshader.getProgram(), 'lightData' + i), i+1);
        console.log(i+1);
    }
    
    gl.uniform1i(gl.getUniformLocation(grassshader.getProgram(), 'grassPosXY'), 9);
    gl.uniform1i(gl.getUniformLocation(grassshader.getProgram(), 'grassPosZROT'), 10);
}

function bindUnbindLightDataTextures(bind) {
    let textures = light_cull_shader.getRenderTextures();
    for(let i = 0; i < textures.length; i++) {
        gl.activeTexture(gl.TEXTURE1 + i);
        if(bind) {
            gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    }
    gl.activeTexture(gl.TEXTURE0);
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
    const movespeed = 50;
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

    if (Input.getKeyState('1')) { grasslength += 0.01; }
    if (Input.getKeyState('2')) { grasslength -= 0.01; }
    if (Input.getKeyState('3')) { grasslength = 0.0; }
    if (Input.getKeyState('4')) { grasslength = 1.0; }

    cameraNode.offsetMatrix = camera.getView();
    sceneGraph.update();
    lightsBuffer.bind();
    let campos = camera.getPosition();
    lightsBuffer.setData(new Float32Array([campos.x, campos.y, campos.z]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes);//dirlightpos
    let flashdir = camera.getRot().transform(0, 0, -1, 1).norm();
    lightsBuffer.setData(new Float32Array([flashdir.x,flashdir.y,flashdir.z]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes + dirLightColorBytes);//dirlightdir

    if (Input.getKeyState("leftclick")) {
        lightsBuffer.setData(new Float32Array([0,0,0,0]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes);//dirlightcolor
    } else {
        lightsBuffer.setData(new Float32Array([1,1,1,0.95]), numLightsBytes + lightPositionsBytes + lightColorsBytes + sunPosBytes + sunColorBytes + dirLightPosBytes);//dirlightcolor
    }

    lightCenterNode.offsetMatrix = lightCenterNode.offsetMatrix.mul(Mat4.rotation_xz(time_delta * 0.1));
    lightLCNode.offsetMatrix = lightLCNode.offsetMatrix.mul(Mat4.rotation_xz(time_delta * 0.1));
    lightRCNode.offsetMatrix = lightRCNode.offsetMatrix.mul(Mat4.rotation_xz(time_delta * 0.1));

    const lightsPosTemp = [];
    for(let i = 0; i < lightNodes.length; i++) {
        let tempvec = lightNodes[i].matrix.transform(0,0,0,1);
        lightsPosTemp.push(tempvec.x, tempvec.y, tempvec.z, 0.0);
    }
        
    lightsBuffer.setData(new Float32Array(lightsPosTemp), numLightsBytes);

    //depth pass
    gl.bindTexture( gl.TEXTURE_2D, null );

    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBufferInfo.framebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    depthshader.use();
    renderObjects(time_delta, now, true);

    gl.bindTexture( gl.TEXTURE_2D, depthFrameBufferInfo.texture);
    gl.useProgram(light_cull_shader.getProgram());
    gl.uniform2f( gl.getUniformLocation( light_cull_shader.getProgram(), "tile_count" ), tilecount_x, tilecount_y );
    gl.uniform2f( gl.getUniformLocation( light_cull_shader.getProgram(), "screen_size" ), canvas.width, canvas.height );
    let viewpos = camera.getPosition();
    gl.uniform3f( gl.getUniformLocation( light_cull_shader.getProgram(), "view_pos" ), viewpos.x, viewpos.y, viewpos.z );

    bindUnbindLightDataTextures(false);
    light_cull_shader.dispatch();
    bindUnbindLightDataTextures(true);


    //main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mainshader.use();
    gl.uniform2f( gl.getUniformLocation( mainshader.getProgram(), "screen_size" ), canvas.width, canvas.height );
    renderObjects(time_delta, now, false);

    requestAnimationFrame(render);
}