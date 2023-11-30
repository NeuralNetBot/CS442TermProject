
class Shader
{
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
    }
    
    static createShader( gl, vertex_source, fragment_source) {
        let vert_shader = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vert_shader, vertex_source );
        gl.compileShader( vert_shader );
        
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
        
        return new Shader(gl, shader_program);
    }
    
    use() {
        this.gl.useProgram(this.program);
    }
    
    getProgram() {
        return this.program;
    }
}

class ComputeShader
{
    constructor(gl, shader, size_x, size_y, framebuffer_z) {
        this.gl = gl;
        this.shader = shader;
        this.size_x = size_x;
        this.size_y = size_y;
        this.frameBufferInfo = createFramebuffer(gl, size_x, size_y, framebuffer_z);
        
        this.verts = Mesh.create_and_load_vertex_buffer( gl, [-1, 1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0], gl.STATIC_DRAW );
        
    }
    
    dispatch() {
        this.gl.useProgram(this.shader.getProgram());
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.verts );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indis );
        Mesh.set_vertex_attrib_to_buffer( gl, this.shader.getProgram(), "position", this.verts, 3, gl.FLOAT, false, 12, 0 );
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBufferInfo.framebuffer);
        gl.viewport(0, 0, this.size_x, this.size_y);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();//wait for our "compute shader" to finish
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    getRenderTextures() {
        return this.frameBufferInfo.textures;
    }
    
    rebuild(gl, size_x, size_y, framebuffer_z) {
        this.size_x = size_x;
        this.size_y = size_y;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        destroyFramebuffer(gl, this.frameBufferInfo);
        this.frameBufferInfo = createFramebuffer(gl, size_x, size_y, framebuffer_z);
    }
    
    getProgram() {
        return this.shader.getProgram();
    }

    use() {
        this.shader.use();
    }
}

class GPUBuffer {
    //valid types
    //gl.UNIFORM_BUFFER
    //bindingpoint is an integer in starting at 0 in the order the buffers appear in the shader
    constructor(gl, type, size_bytes, bindingpoint) {
        this.buffer = gl.createBuffer();
        this.bindingpoint = bindingpoint;
        this.type = type;
        gl.bindBuffer(this.type, this.buffer);
        gl.bufferData(this.type, size_bytes, gl.DYNAMIC_DRAW);
        
        gl.bindBufferBase(this.type, bindingpoint, this.buffer);
    }
    
    bindToShader(shader, bindstr) {
        gl.bindBuffer(this.type, this.buffer);
        const blockIndex = gl.getUniformBlockIndex(shader.getProgram(), bindstr);
        gl.uniformBlockBinding(shader.getProgram(), blockIndex, this.bindingpoint);
    }
    
    bind() {
        gl.bindBuffer(this.type, this.buffer);
    }
    
    setData(dataarray, byteoffset) {
        gl.bufferSubData(this.type, byteoffset, dataarray, 0);
    }
}