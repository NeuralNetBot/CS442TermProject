class ChunkManager {
    /**
     * 
     * @param {number} chunksize
     * @param {number} height
     * @param {number} viewDist 
     * @param {Camera} camera 
     */
    constructor(chunksize, height, viewDist, camera) {
        this.chunksize = chunksize;
        this.height = height;
        this.viewDist = viewDist;
        this.camera = camera;
    }

    getAllChunksInRange() {
        let cameraX = this.camera.getPosition().x;
        let cameraZ = this.camera.getPosition().z;
        let chunksInRange = [];
        let chunkMinX = Math.floor(cameraX / this.chunksize)  - this.viewDist;
        let chunkMinZ = Math.floor(cameraZ / this.chunksize) - this.viewDist;
        let chunkMaxX = Math.floor(cameraX / this.chunksize) + this.viewDist;
        let chunkMaxZ = Math.floor(cameraZ / this.chunksize) + this.viewDist;

        for (let x = chunkMinX; x <= chunkMaxX; x += 1) {
            for (let z = chunkMinZ; z <= chunkMaxZ; z += 1) {
                chunksInRange.push([x, z]);
            }
        }
        return chunksInRange;
    }

    getPointsForChunk(chunk) {
        let points = [];
        for (let x = -1; x <= 1; x += 2) {
            for (let z = -1; z <= 1; z += 2) {
                for (let y = -1; y <= 1; y += 2) {
                    points.push(new Vec4((chunk[0] + x) * this.chunksize, y * this.height, (chunk[1] + z) * this.chunksize, 1.0));
                }
            }
        }
        return points;
    }

    getVisibleChunks() {
        let vischunks = [];
        this.getAllChunksInRange().forEach(chunk => {
            if(this.camera.isPointsInFrustum(this.getPointsForChunk(chunk))) {
                vischunks.push(chunk);
            }
        });
        return vischunks;
    }
}