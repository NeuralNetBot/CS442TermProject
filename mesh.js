
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
    constructor( gl, vertices, indices ) {
        this.verts = Mesh.create_and_load_vertex_buffer( gl, vertices, gl.STATIC_DRAW );
        this.indis = Mesh.create_and_load_elements_buffer( gl, indices, gl.STATIC_DRAW );

        this.n_verts = vertices.length;
        this.n_indis = indices.length;
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

    static box( gl, width, height, depth ) {
        let hwidth = width / 2.0;
        let hheight = height / 2.0;
        let hdepth = depth / 2.0;

        let verts = [
            
            hwidth, -hheight, -hdepth,      0.0, 0.0, 0.0, 1.0, 0.0,
            -hwidth, -hheight, -hdepth,     0.0, 0.0, 0.0, 1.0, 0.0,
            -hwidth, hheight, -hdepth,      0.0, 0.0, 0.0, 1.0, 0.0,
            hwidth, hheight, -hdepth,       0.0, 0.0, 0.0, 1.0, 0.0,

            hwidth, -hheight, hdepth,       0.0, 0.0, 0.0, 1.0, 0.0,
            -hwidth, -hheight, hdepth,      0.0, 0.0, 0.0, 1.0, 0.0,
            -hwidth, hheight, hdepth,       0.0, 0.0, 0.0, 1.0, 0.0,
            hwidth, hheight, hdepth,        0.0, 0.0, 0.0, 1.0, 0.0
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

    /**
     * Render the mesh. Does NOT preserve array/index buffer or program bindings! 
     * 
     * @param {WebGLRenderingContext} gl 
     */
    render( gl, program ) {
        gl.cullFace( gl.BACK );
        gl.frontFace( gl.CCW );
        gl.enable( gl.CULL_FACE );
        
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

        gl.drawElements( gl.TRIANGLES, this.n_indis, gl.UNSIGNED_SHORT, 0 );
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
