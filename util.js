
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

//format for uint32 gl.RGBA32UI
function createTexture(gl, size_x, size_y, format) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2d, tex);
    gl.texImage2D(gl.TEXTURE_2d, 0, format, 1, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, new Uint32Array(size_x*size_y));
    gl.bindTexture(gl.TEXTURE_2d, null);
    return tex;
}

function deletTexture(gl, tex) {
    gl.deleteTexture(texture);
}

function destroyDepthFramebuffer(gl, depthFrameBufferInfo) {
    gl.deleteFramebuffer(depthFrameBufferInfo.framebuffer);
    gl.deleteTexture(depthFrameBufferInfo.texture);
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        callback();
    };
    
    return tex;
}