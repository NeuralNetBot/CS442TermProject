
function createDepthFramebuffer(gl, width, height) {
    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer creation error: ' + status.toString(16));
        return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { framebuffer: depthFramebuffer, texture: depthTexture };
}

function destroyDepthFramebuffer(gl, frameBufferInfo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(frameBufferInfo.texture);
    gl.deleteFramebuffer(frameBufferInfo.framebuffer);
}

function destroyFramebuffer(gl, frameBufferInfo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    frameBufferInfo.textures.forEach((attachment) => {
        gl.deleteTexture(attachment);
    });
    gl.deleteFramebuffer(frameBufferInfo.framebuffer);
}


function createFramebuffer(gl, width, height, numAttachments, floatformat=true) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const colorAttachments = [];
    const colorAttachmentIDS = 
        [
            gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3,
            gl.COLOR_ATTACHMENT4, gl.COLOR_ATTACHMENT5, gl.COLOR_ATTACHMENT6, gl.COLOR_ATTACHMENT7,
            gl.COLOR_ATTACHMENT8, gl.COLOR_ATTACHMENT9, gl.COLOR_ATTACHMENT10, gl.COLOR_ATTACHMENT11,
            gl.COLOR_ATTACHMENT12, gl.COLOR_ATTACHMENT13, gl.COLOR_ATTACHMENT14, gl.COLOR_ATTACHMENT15
        ];
    for (let i = 0; i < numAttachments; i++) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, floatformat ? gl.RG32F : gl.RGBA8, width, height, 0, floatformat ? gl.RG : gl.RGBA, floatformat ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, colorAttachmentIDS[i], gl.TEXTURE_2D, texture, 0);
        colorAttachments.push(texture);
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer creation error: ' + status.toString(16));
        return null;
    }

    const drawBuffers = [];
    for (let i = 0; i < numAttachments; i++) {
        drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
    }
    gl.drawBuffers(drawBuffers);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer: framebuffer, textures: colorAttachments };
}

function createFramebufferTextureless(gl, target, textureID) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, textureID, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer creation error: ' + status.toString(16));
        return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer: framebuffer, texture: textureID };
}


function loadTexture(gl, path, callback) {
    let tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, tex );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    const image = new Image();
    image.src = path;

    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, tex);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        callback(image);
    };
    
    return tex;
}

function loadImage(path, callback) {
    const image = new Image();
    image.src = path;

    image.onload = function () {
        callback(image);
    };
}

function loadCubeMap(gl, right, left, top, bottom, front, back, callback) {
    let cube_map_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube_map_texture);

    const faces = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            jpg: right,
            index: 0
        },

        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            jpg: left,
            index: 1
        },

        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            jpg: top,
            index: 2
        },

        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            jpg: bottom,
            index: 3
        },

        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            jpg: front,
            index: 4
        },

        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            jpg: back,
            index: 5
        },
    ];

    faces.forEach((face) => {
        const { target, jpg, index } = face;

        const level = 0;
        const internal_format = gl.RGBA;
        const w = gl.canvas.width;
        const h = gl.canvas.height;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        const image1 = new Image();
        image1.src = jpg;
        image1.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube_map_texture);
            gl.texImage2D(target, level, internal_format, format, type, image1);
            callback(index);
        }
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    return cube_map_texture;
}

function createCubemapFrameBuffer(cubeMapID) {

    cube_map_camera.setRPY(0.5, 0.0, 0.0);
    let back = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, back.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    cube_map_camera.setRPY(0.5, 0.0, 0.75);
    let right = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, right.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    cube_map_camera.setRPY(0.5, 0.0, 0.5);
    let front = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, front.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    cube_map_camera.setRPY(0.5, 0.0, 0.25);
    let left = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, left.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    cube_map_camera.setRPY(0.5, 0.75, 0.0);
    let top = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, top.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    cube_map_camera.setRPY(0.5, 0.25, 0.0);
    let bottom = createFramebufferTextureless(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeMapID);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bottom.framebuffer);
    gl.viewport(0, 0, 2048, 2048);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderTerrain();
    gl.finish();

    gl.deleteFramebuffer(back.framebuffer);
    gl.deleteFramebuffer(front.framebuffer);
    gl.deleteFramebuffer(left.framebuffer);
    gl.deleteFramebuffer(right.framebuffer);
    gl.deleteFramebuffer(top.framebuffer);
    gl.deleteFramebuffer(bottom.framebuffer);

    //return loadCubeMap(gl, right, left, top, bottom, front, back);
}

