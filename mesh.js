
const VERTEX_STRIDE = 28;

class Mesh {
    /** 
     * Creates a new mesh and loads it into video memory.
     * 
     * @param {WebGLRenderingContext} gl  
     * @param {number} program
     * @param {number[]} vertices
     * @param {number[]} indices
    */
    constructor( gl, program, vertices, indices ) {
        this.verts = Mesh.create_and_load_vertex_buffer( gl, vertices, gl.STATIC_DRAW );
        this.indis = Mesh.create_and_load_elements_buffer( gl, indices, gl.STATIC_DRAW );

        this.n_verts = vertices.length;
        this.n_indis = indices.length;
        this.program = program;
    }


    static create_and_load_vertex_buffer(gl, data, usage) {
        let current_array_buf = gl.getParameter( gl.ARRAY_BUFFER_BINDING );

        let buf_id = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, buf_id );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data), usage );
        
        gl.bindBuffer( gl.ARRAY_BUFFER, current_array_buf );

        return buf_id;
    }

    static create_and_load_elements_buffer(gl, data, usage) {
        let current_array_buf = gl.getParameter( gl.ELEMENT_ARRAY_BUFFER_BINDING );

        let buf_id = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buf_id );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), usage );
        
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

    static box( gl, program, width, height, depth ) {
        let hwidth = width / 2.0;
        let hheight = height / 2.0;
        let hdepth = depth / 2.0;

        let verts = [
            hwidth, -hheight, -hdepth,      1.0, 0.0, 0.0, 1.0,
            -hwidth, -hheight, -hdepth,     0.0, 1.0, 0.0, 1.0,
            -hwidth, hheight, -hdepth,      0.0, 0.0, 1.0, 1.0,
            hwidth, hheight, -hdepth,       1.0, 1.0, 0.0, 1.0,

            hwidth, -hheight, hdepth,       1.0, 0.0, 1.0, 1.0,
            -hwidth, -hheight, hdepth,      0.0, 1.0, 1.0, 1.0,
            -hwidth, hheight, hdepth,       0.5, 0.5, 1.0, 1.0,
            hwidth, hheight, hdepth,        1.0, 1.0, 0.5, 1.0,
        ];

        let indis = [
            // clockwise winding
            /*
            0, 1, 2, 2, 3, 0, 
            4, 0, 3, 3, 7, 4, 
            5, 4, 7, 7, 6, 5, 
            1, 5, 6, 6, 2, 1,
            3, 2, 6, 6, 7, 3,
            4, 5, 1, 1, 0, 4,
            */

            // counter-clockwise winding
            0, 3, 2, 2, 1, 0,
            4, 7, 3, 3, 0, 4,
            5, 6, 7, 7, 4, 5,
            1, 2, 6, 6, 5, 1,
            3, 7, 6, 6, 2, 3,
            4, 0, 1, 1, 5, 4,
        ];

        return new Mesh( gl, program, verts, indis );
    }


    /**
     * Render the mesh. Does NOT preserve array/index buffer or program bindings! 
     * 
     * @param {WebGLRenderingContext} gl 
     */
    render( gl ) {
        gl.cullFace( gl.BACK );
        gl.frontFace( gl.CW );
        gl.enable( gl.CULL_FACE );
        
        gl.useProgram( this.program );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.verts );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indis );

        Mesh.set_vertex_attrib_to_buffer( 
            gl, this.program, 
            "coordinates", 
            this.verts, 3, 
            gl.FLOAT, false, VERTEX_STRIDE, 0 
        );


        Mesh.set_vertex_attrib_to_buffer( 
            gl, this.program, 
            "color", 
            this.verts, 4, 
            gl.FLOAT, false, VERTEX_STRIDE, 12
        );

        gl.drawElements( gl.TRIANGLES, this.n_indis, gl.UNSIGNED_SHORT, 0 );
    }

    /**
     * Parse the given text as the body of an obj file.
     * @param {WebGLRenderingContext} gl
     * @param {WebGLProgram} program
     * @param {string} text
     */
    static from_obj_text( gl, program, text ) {
        let lverts = [];
        let lindices = [];
        const lines = text.split('\n');
        lines.forEach( function (line, i) {
            let linesplit = line.split(' ');
            if(line[0] === 'f') {
                const topush = linesplit.slice(1, 4).map(Number).map(num => num - 1).reverse();
                lindices.push(...topush);
            }
            if(line[0] === 'v') {
                const topush = linesplit.slice(1, 4).map(Number);
                lverts.push(...topush);
                lverts.push(...topush);//[Math.random(),Math.random(),Math.random(),1]);//append colors
                lverts.push(1);
            }
        });
        return new Mesh( gl, program, lverts, lindices);
    }

    /**
     * Asynchronously load the obj file as a mesh.
     * @param {WebGLRenderingContext} gl
     * @param {string} file_name 
     * @param {WebGLProgram} program
     * @param {function} f the function to call and give mesh to when finished.
     */
    static from_obj_file( gl, file_name, program, f ) {
        let request = new XMLHttpRequest();
        
        // the function that will be called when the file is being loaded
        request.onreadystatechange = function() {
            // console.log( request.readyState );

            if( request.readyState != 4 ) { return; }
            if( request.status != 200 ) { 
                throw new Error( 'HTTP error when opening .obj file: ', request.statusText ); 
            }

            // now we know the file exists and is ready
            let loaded_mesh = Mesh.from_obj_text( gl, program, request.responseText );

            console.log( 'loaded ', file_name );
            f( loaded_mesh );
        };

        
        request.open( 'GET', file_name ); // initialize request. 
        request.send();                   // execute request
    }
}
