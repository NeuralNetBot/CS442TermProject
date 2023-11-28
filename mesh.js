
const VERTEX_STRIDE = 32;

class Mesh {
    /** 
     * Creates a new mesh and loads it into video memory.
     * 
     * @param {WebGLRenderingContext} gl  
     * @param {number} program
     * @param {number[]} vertices
     * @param {number[]} indices
    */
    constructor( gl, vertices, indices, use32bitindex=false ) {
        this.verts = Mesh.create_and_load_vertex_buffer( gl, vertices, gl.STATIC_DRAW );
        this.indis = Mesh.create_and_load_elements_buffer( gl, indices, gl.STATIC_DRAW, use32bitindex );

        this.n_verts = vertices.length;
        this.n_indis = indices.length;
        this.use32bitindex = use32bitindex;
    }


    static create_and_load_vertex_buffer(gl, data, usage) {
        let current_array_buf = gl.getParameter( gl.ARRAY_BUFFER_BINDING );

        let buf_id = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, buf_id );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), usage );
        
        gl.bindBuffer( gl.ARRAY_BUFFER, current_array_buf );

        return buf_id;
    }

    static create_and_load_elements_buffer(gl, data, usage, use32bitindex) {
        let current_array_buf = gl.getParameter( gl.ELEMENT_ARRAY_BUFFER_BINDING );

        let buf_id = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buf_id );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, use32bitindex ? new Uint32Array(data) : new Uint16Array(data), usage );
        
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, current_array_buf );

        return buf_id;
    }

    static set_vertex_attrib_to_buffer( 
        gl, program, attrib_name, buffer, n_components, gl_type, normalize, stride, offset ) 
    {
        let attr_loc = gl.getAttribLocation( program, attrib_name );
        
        if ( attr_loc == - 1 ) { 
            throw new Error( 'either no attribute named "' + attrib_name + 
                '" in program or attribute name is reserved/built-in.' ) 
        } 

        let err = gl.getError()
        if ( err != 0 ) {
            throw new Error( 'invalid program. Error: ' + err );
        }

        let current_array_buf = gl.getParameter( gl.ARRAY_BUFFER_BINDING );

        gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
        gl.enableVertexAttribArray( attr_loc );
        gl.vertexAttribPointer( attr_loc, n_components, gl_type, normalize, stride, offset );
        //gl.enableVertexAttribArray( attr_loc );

        gl.bindBuffer( gl.ARRAY_BUFFER, current_array_buf );
    }

    /**
     * Create a box mesh with the given dimensions and colors.
     * @param {WebGLRenderingContext} gl 
     * @param {number} width 
     * @param {number} height 
     * @param {number} depth 
     */

    static box( gl) {

        let verts = [
            -1,1,-1,0,1,0,0.5,0.75,
            1,1,1,0,1,0,0.75,0.5,
            1,1,-1,0,1,0,0.5,0.5,
            1,1,1,0,0,1,0.75,0.5,
            -1,-1,1,0,0,1,1,0.25,
            1,-1,1,0,0,1,0.75,0.25,
            -1,1,1,-1,0,0,0,0.5,
            -1,-1,-1,-1,0,0,0.25,0.25,
            -1,-1,1,-1,0,0,0,0.25,
            1,-1,-1,0,-1,0,0.5,0.25,
            -1,-1,1,0,-1,0,0.75,0,
            -1,-1,-1,0,-1,0,0.5,0,
            1,1,-1,1,0,0,0.5,0.5,
            1,-1,1,1,0,0,0.75,0.25,
            1,-1,-1,1,0,0,0.5,0.25,
            -1,1,-1,0,0,-1,0.25,0.5,
            1,-1,-1,0,0,-1,0.5,0.25,
            -1,-1,-1,0,0,-1,0.25,0.25,
            -1,1,-1,0,1,0,0.5,0.75,
            -1,1,1,0,1,0,0.75,0.75,
            1,1,1,0,1,0,0.75,0.5,
            1,1,1,0,0,1,0.75,0.5,
            -1,1,1,0,0,1,1,0.5,
            -1,-1,1,0,0,1,1,0.25,
            -1,1,1,-1,0,0,0,0.5,
            -1,1,-1,-1,0,0,0.25,0.5,
            -1,-1,-1,-1,0,0,0.25,0.25,
            1,-1,-1,0,-1,0,0.5,0.25,
            1,-1,1,0,-1,0,0.75,0.25,
            -1,-1,1,0,-1,0,0.75,0,
            1,1,-1,1,0,0,0.5,0.5,
            1,1,1,1,0,0,0.75,0.5,
            1,-1,1,1,0,0,0.75,0.25,
            -1,1,-1,0,0,-1,0.25,0.5,
            1,1,-1,0,0,-1,0.5,0.5,
            1,-1,-1,0,0,-1,0.5,0.25
        ];

        let indis = [
            // clockwise winding
            2,1,0,
            5,4,3,
            8,7,6,
            11,10,9,
            14,13,12,
            17,16,15,
            20,19,18,
            23,22,21,
            26,25,24,
            29,28,27,
            32,31,30,
            35,34,33
        ];

        return new Mesh( gl, verts, indis );
    }
    
    static plane(gl)
    {
        let verts = [
            8.942398,0,-5.961599,-0,1,-0,1,0.166667,
            5.961598,0,-8.942398,-0,1,-0,0.833333,0,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            8.942398,0,8.942398,-0,1,-0,1,1,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            5.961599,0,8.942398,-0,1,-0,0.833333,1,
            8.942398,0,5.961598,-0,1,-0,1,0.833333,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            8.942398,0,2.980799,-0,1,-0,1,0.666667,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            8.942398,0,-0,-0,1,-0,1,0.5,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            8.942398,0,-2.9808,-0,1,-0,1,0.333333,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -8.942398,0,-5.961598,-0,1,-0,0,0.166667,
            -8.942398,0,-2.980799,-0,1,-0,0,0.333333,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -8.942398,0,-2.980799,-0,1,-0,0,0.333333,
            -8.942398,0,0,-0,1,-0,0,0.5,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -0,0,0,-0,1,-0,0.5,0.5,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            -0,0,0,-0,1,-0,0.5,0.5,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -8.942398,0,0,-0,1,-0,0,0.5,
            -8.942398,0,2.9808,-0,1,-0,0,0.666667,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            -0,0,0,-0,1,-0,0.5,0.5,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            -8.942398,0,5.961599,-0,1,-0,0,0.833333,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -8.942398,0,2.9808,-0,1,-0,0,0.666667,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -5.961599,0,5.961598,-0,1,-0,0.166667,0.833333,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            2.980799,0,5.961598,-0,1,-0,0.666667,0.833333,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            2.980799,0,5.961598,-0,1,-0,0.666667,0.833333,
            -5.961598,0,8.942398,-0,1,-0,0.166667,1,
            -8.942398,0,5.961599,-0,1,-0,0,0.833333,
            -8.942398,0,8.942398,-0,1,-0,0,1,
            -5.961598,0,8.942398,-0,1,-0,0.166667,1,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            -5.961599,0,5.961598,-0,1,-0,0.166667,0.833333,
            -2.980799,0,8.942398,-0,1,-0,0.333333,1,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            2.9808,0,8.942398,-0,1,-0,0.666667,1,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            0,0,8.942398,-0,1,-0,0.5,1,
            2.9808,0,8.942398,-0,1,-0,0.666667,1,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            2.980799,0,5.961598,-0,1,-0,0.666667,0.833333,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -8.942398,0,-8.942398,-0,1,-0,0,0,
            -8.942398,0,-5.961598,-0,1,-0,0,0.166667,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            -5.961599,0,-8.942398,-0,1,-0,0.166667,0,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            -2.9808,0,-8.942398,-0,1,-0,0.333333,0,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            -0,0,-8.942398,-0,1,-0,0.5,0,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            2.980799,0,-8.942398,-0,1,-0,0.666667,0,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            8.942398,0,-5.961599,-0,1,-0,1,0.166667,
            8.942398,0,-8.942398,-0,1,-0,1,0,
            5.961598,0,-8.942398,-0,1,-0,0.833333,0,
            8.942398,0,8.942398,-0,1,-0,1,1,
            8.942398,0,5.961598,-0,1,-0,1,0.833333,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            8.942398,0,5.961598,-0,1,-0,1,0.833333,
            8.942398,0,2.980799,-0,1,-0,1,0.666667,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            8.942398,0,2.980799,-0,1,-0,1,0.666667,
            8.942398,0,-0,-0,1,-0,1,0.5,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            8.942398,0,-0,-0,1,-0,1,0.5,
            8.942398,0,-2.9808,-0,1,-0,1,0.333333,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            8.942398,0,-2.9808,-0,1,-0,1,0.333333,
            8.942398,0,-5.961599,-0,1,-0,1,0.166667,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -8.942398,0,-5.961598,-0,1,-0,0,0.166667,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -8.942398,0,-2.980799,-0,1,-0,0,0.333333,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            -5.961599,0,-2.980799,-0,1,-0,0.166667,0.333333,
            -0,0,0,-0,1,-0,0.5,0.5,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            -2.9808,0,-2.980799,-0,1,-0,0.333333,0.333333,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            -0,0,-2.980799,-0,1,-0,0.5,0.333333,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            5.961598,0,-2.9808,-0,1,-0,0.833333,0.333333,
            2.980799,0,-2.980799,-0,1,-0,0.666667,0.333333,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -8.942398,0,0,-0,1,-0,0,0.5,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            -5.961599,0,0,-0,1,-0,0.166667,0.5,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            -0,0,0,-0,1,-0,0.5,0.5,
            -2.9808,0,0,-0,1,-0,0.333333,0.5,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            -0,0,0,-0,1,-0,0.5,0.5,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            5.961598,0,-0,-0,1,-0,0.833333,0.5,
            2.980799,0,-0,-0,1,-0,0.666667,0.5,
            -8.942398,0,5.961599,-0,1,-0,0,0.833333,
            -5.961599,0,5.961598,-0,1,-0,0.166667,0.833333,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            -5.961599,0,2.9808,-0,1,-0,0.166667,0.666667,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            -2.9808,0,2.980799,-0,1,-0,0.333333,0.666667,
            2.980799,0,5.961598,-0,1,-0,0.666667,0.833333,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            -0,0,2.980799,-0,1,-0,0.5,0.666667,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            5.961598,0,2.980799,-0,1,-0,0.833333,0.666667,
            2.980799,0,2.980799,-0,1,-0,0.666667,0.666667,
            -5.961598,0,8.942398,-0,1,-0,0.166667,1,
            -5.961599,0,5.961598,-0,1,-0,0.166667,0.833333,
            -8.942398,0,5.961599,-0,1,-0,0,0.833333,
            -5.961598,0,8.942398,-0,1,-0,0.166667,1,
            -2.980799,0,8.942398,-0,1,-0,0.333333,1,
            -2.9808,0,5.961598,-0,1,-0,0.333333,0.833333,
            -2.980799,0,8.942398,-0,1,-0,0.333333,1,
            0,0,8.942398,-0,1,-0,0.5,1,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            2.9808,0,8.942398,-0,1,-0,0.666667,1,
            2.980799,0,5.961598,-0,1,-0,0.666667,0.833333,
            -0,0,5.961598,-0,1,-0,0.5,0.833333,
            2.9808,0,8.942398,-0,1,-0,0.666667,1,
            5.961599,0,8.942398,-0,1,-0,0.833333,1,
            5.961598,0,5.961598,-0,1,-0,0.833333,0.833333,
            -5.961599,0,-5.961598,-0,1,-0,0.166667,0.166667,
            -5.961599,0,-8.942398,-0,1,-0,0.166667,0,
            -8.942398,0,-8.942398,-0,1,-0,0,0,
            -2.9808,0,-5.961599,-0,1,-0,0.333333,0.166667,
            -2.9808,0,-8.942398,-0,1,-0,0.333333,0,
            -5.961599,0,-8.942398,-0,1,-0,0.166667,0,
            -0,0,-5.961599,-0,1,-0,0.5,0.166667,
            -0,0,-8.942398,-0,1,-0,0.5,0,
            -2.9808,0,-8.942398,-0,1,-0,0.333333,0,
            2.980799,0,-5.961599,-0,1,-0,0.666667,0.166667,
            2.980799,0,-8.942398,-0,1,-0,0.666667,0,
            -0,0,-8.942398,-0,1,-0,0.5,0,
            5.961598,0,-5.961599,-0,1,-0,0.833333,0.166667,
            5.961598,0,-8.942398,-0,1,-0,0.833333,0,
            2.980799,0,-8.942398,-0,1,-0,0.666667,0
        ];

        let indis = [
            0,1,2,3,4,5,
            6,7,8,9,10,11,
            12,13,14,15,16,17,
            18,19,20,21,22,23,
            24,25,26,27,28,29,
            30,31,32,33,34,35,
            36,37,38,39,40,41,
            42,43,44,45,46,47,
            48,49,50,51,52,53,
            54,55,56,57,58,59,
            60,61,62,63,64,65,
            66,67,68,69,70,71,
            72,73,74,75,76,77,
            78,79,80,81,82,83,
            84,85,86,87,88,89,
            90,91,92,93,94,95,
            96,97,98,99,100,101,
            102,103,104,105,106,107,
            108,109,110,111,112,113,
            114,115,116,117,118,119,
            120,121,122,123,124,125,
            126,127,128,129,130,131,
            132,133,134,135,136,137,
            138,139,140,141,142,143,
            144,145,146,147,148,149,
            150,151,152,153,154,155,
            156,157,158,159,160,161,
            162,163,164,165,166,167,
            168,169,170,171,172,173,
            174,175,176,177,178,179,
            180,181,182,183,184,185,
            186,187,188,189,190,191,
            192,193,194,195,196,197,
            198,199,200,201,202,203,
            204,205,206,207,208,209,
            210,211,212,213,214,215
        ];

        return new Mesh( gl, verts, indis );
    }

    static sphere( gl, subdivs ) {
        
        let verts = []
        let indis = []
        
        for(let y = 0.0; y <= subdivs; y++)
        {
            let ypos = Math.cos((y * Math.PI) / subdivs);
            let ys = Math.sin((y * Math.PI) / subdivs);
            for(let x = 0.0; x <= subdivs; x++)
            {
                let xpos = Math.cos(x * 2 * Math.PI / subdivs) * ys;
                let zpos = Math.sin(x * 2 * Math.PI / subdivs) * ys;
                verts.push(xpos, ypos, zpos, xpos, ypos, zpos);//normals same as position in this case
                verts.push(1 - (x / subdivs), (y / subdivs));
            }
        }
        
        for(let y = 0.0; y < subdivs; y++)
        {
            for(let x = 0.0; x < subdivs; x++)
            {
                const first = y * (subdivs + 1) + x;
                const second = first + subdivs + 1;
                indis.push(first + 1, second, first, first + 1, second + 1, second);
            }
        }
        return new Mesh( gl, verts, indis );    
    }
    
    static fromHeightMap(gl, heightimage, offsetx, offsety, sizex, sizey, scalexz, scaley) {
        const canvas = document.getElementById('imagereadcanvas');
        canvas.width = heightimage.width;
        canvas.height = heightimage.height;
        const context = canvas.getContext('2d');
        context.drawImage(heightimage, 0, 0);

        let verts = [];
        let indices = [];

        const imageData = context.getImageData(offsetx, offsety, sizex, sizey);
        for (let y = 0; y < sizey; y++) {
            for (let x = 0; x < sizex; x++) {
                const index = (y * sizex + x) * 4;
                const red = imageData.data[index];
                const green = imageData.data[index + 1];
                const blue = imageData.data[index + 2];
                const alpha = imageData.data[index + 3];
                //position
                verts.push((x / sizex) * scalexz, ((red / 255) * scaley), (y / sizey) * scalexz);
                
                //normal
                const heightCenter = ((red / 255) * scaley);
                let heightLeft = heightCenter;
                let heightRight = heightCenter;
                let heightUp = heightCenter;
                let heightDown = heightCenter;
        
                if (x > 0) heightLeft = ((imageData.data[(y * sizex + (x - 1)) * 4] / 255) * scaley);
                if (x < sizex - 1) heightRight = ((imageData.data[(y * sizex + (x + 1)) * 4] / 255) * scaley);
                if (y > 0) heightUp = ((imageData.data[((y - 1) * sizex + x) * 4] / 255) * scaley);
                if (y < sizey - 1) heightDown = ((imageData.data[((y + 1) * sizex + x) * 4] / 255) * scaley);
        
                const dx = (heightRight - heightLeft);
                const dy = (heightDown - heightUp);
        
                const normal = [
                    -dx,
                    2 * scaley,
                    -dy,
                ];
        
                const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
                if (length !== 0) {
                    normal[0] /= length;
                    normal[1] /= length;
                    normal[2] /= length;
                }
                verts.push(...normal);
                //uv
                verts.push(x / sizex, y / sizey);

            }
        }
        for (let y = 0; y < sizey - 1; y++) {
            for (let x = 0; x < sizex - 1; x++) {
                const topLeft = y * sizex + x;
                const topRight = topLeft + 1;
                const bottomLeft = (y + 1) * sizex + x;
                const bottomRight = bottomLeft + 1;
                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }
        return new Mesh( gl, verts, indices, true );
    }

    static calculateTangent(surfaceNormal, uVec, vVec) {
        const tangent = uVec.slice();
        const cross = [
            uVec[1] * vVec[2] - uVec[2] * vVec[1],
            uVec[2] * vVec[0] - uVec[0] * vVec[2],
            uVec[0] * vVec[1] - uVec[1] * vVec[0]
        ];
    
        const dot = cross[0] * surfaceNormal[0] + cross[1] * surfaceNormal[1] + cross[2] * surfaceNormal[2];
        if (dot < 0.0) {
            cross.forEach((component, index) => {
                tangent[index] = -component;
            });
        }
    
        return tangent;
    }

    static calculateTangents(normals, uvs) {
        const tangents = [];
    
        for (let i = 0; i < normals.length; i += 9) {
            const normal1 = normals.slice(i, i + 3);
            const normal2 = normals.slice(i + 3, i + 6);
            const normal3 = normals.slice(i + 6, i + 9);
    
            const uv1 = uvs.slice(i, i + 2);
            const uv2 = uvs.slice(i + 2, i + 4);
            const uv3 = uvs.slice(i + 4, i + 6);
    
            const edge1 = [uv2[0] - uv1[0], uv2[1] - uv1[1], 0];
            const edge2 = [uv3[0] - uv1[0], uv3[1] - uv1[1], 0];
    
            const tangent = calculateTangent(normal1, edge1, edge2);
    
            tangents.push(...tangent, ...tangent, ...tangent);
        }
    
        return tangents;
    }

    /**
     * Render the mesh. Does NOT preserve array/index buffer or program bindings! 
     * 
     * @param {WebGLRenderingContext} gl 
     */
    render( gl, program, instancecount = 1 ) {        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.verts );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indis );

        Mesh.set_vertex_attrib_to_buffer( 
            gl, program, 
            "position", 
            this.verts, 3, 
            gl.FLOAT, false, VERTEX_STRIDE, 0 
        );

        Mesh.set_vertex_attrib_to_buffer( 
            gl, program, 
            "normal", 
            this.verts, 3, 
            gl.FLOAT, false, VERTEX_STRIDE, 12 
        );

        Mesh.set_vertex_attrib_to_buffer( 
            gl, program, 
            "uv", 
            this.verts, 2, 
            gl.FLOAT, false, VERTEX_STRIDE, 24
        );
        
        if(instancecount == 1) {
            gl.drawElements( gl.TRIANGLES, this.n_indis, this.use32bitindex ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0 );
        }
        else {
            gl.drawElementsInstanced( gl.TRIANGLES, this.n_indis, this.use32bitindex ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0, instancecount );
        }
    }

    /**
     * Parse the given text as the body of an obj file.
     * @param {WebGLRenderingContext} gl
     * @param {WebGLProgram} program
     * @param {string} text
     */
    static from_obj_text( gl, text ) {
        let positions = [];
        let normals = [];
        let uvs = [];
        let indices = [];
        const lines = text.split('\n');
        lines.forEach( function (line, i) {
            let linesplit = line.split(' ');
            if(line[0] === 'f') {
                const numbers = linesplit.slice(1, 4);

                for (let i = 0; i < numbers.length; i++) {
                  const numberParts = numbers[i].split('/');
                  for (let j = 0; j < numberParts.length; j++) {
                    indices.push(Number(numberParts[j])-1);
                  }
                }
            }
            else if(line[0] === 'v' && line[1] === 'n') {
                const topush = linesplit.slice(1, 4).map(Number);
                normals.push(...topush);
            }
            else if(line[0] === 'v' && line[1] === 't') {
                const topush = linesplit.slice(1, 3).map(Number);
                uvs.push(...topush);
            }
            else if(line[0] === 'v') {
                const topush = linesplit.slice(1, 4).map(Number);
                positions.push(...topush);
            }
        });
        
        // iterate 3 at a time as there will be 3 indices, position normal and uv indices, then just need to combine them
        
        let finalverts = [];
        let finalindices = [];
        
        for (let i = 0; i < indices.length; i+=3) {
            finalindices.push(i/3);

            
            const posindex = indices[i]*3;
            const normalindex = indices[i+2]*3;
            const uvindex = indices[i+1]*2;
            
            finalverts.push(positions[posindex]);
            finalverts.push(positions[posindex+1]);
            finalverts.push(positions[posindex+2]);
            
            finalverts.push(normals[normalindex]);
            finalverts.push(normals[normalindex+1]);
            finalverts.push(normals[normalindex+2]);
            
            finalverts.push(uvs[uvindex]);
            finalverts.push(1-uvs[uvindex+1]); //y uv flip
        }
       
        
        return new Mesh( gl, finalverts, finalindices);
    }

    /**
     * Asynchronously load the obj file as a mesh.
     * @param {WebGLRenderingContext} gl
     * @param {string} file_name 
     * @param {function} f the function to call and give mesh to when finished.
     */
    static from_obj_file( gl, file_name, f ) {
        let request = new XMLHttpRequest();
        
        // the function that will be called when the file is being loaded
        request.onreadystatechange = function() {
            // console.log( request.readyState );

            if( request.readyState != 4 ) { return; }
            if( request.status != 200 ) { 
                throw new Error( 'HTTP error when opening .obj file: ', request.statusText ); 
            }

            // now we know the file exists and is ready
            let loaded_mesh = Mesh.from_obj_text( gl, request.responseText );

            console.log( 'loaded ', file_name );
            f( loaded_mesh );
        };

        
        request.open( 'GET', file_name ); // initialize request. 
        request.send();                   // execute request
    }

}
