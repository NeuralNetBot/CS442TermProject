
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
    //a fake compute shader
    static createComputeShader(gl, vertex_source, fragment_source, size_x, size_y) {

    }
    
    dispatchCompute() {
        this.gl.useProgram(this.program);
    }
    
    use() {
        this.gl.useProgram(this.program);
    }
    
    getProgram() {
        return this.program;
    }
}