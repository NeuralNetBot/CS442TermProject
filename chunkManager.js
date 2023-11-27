class ChunkManager {
    /**
     * 
     * @param {number} chunksize
     * @param {number} minheight
     * @param {number} maxheight
     * @param {number} viewDist 
     * @param {number} lodDist 
     * @param {Camera} camera 
     */
    constructor(chunksize, minheight, maxheight, viewDist, lodDist, camera) {
        this.chunksize = chunksize;
        this.minheight = minheight;
        this.maxheight = maxheight;
        this.viewDist = viewDist;
        this.lodDist = lodDist;
        this.camera = camera;
    }

    getAllChunksInRange() {
        let cameraX = this.camera.getPosition().x;
        let cameraZ = this.camera.getPosition().z;
        let cameraChunkX = Math.floor(cameraX / this.chunksize);
        let cameraChunkZ = Math.floor(cameraZ / this.chunksize);
        console.log(cameraChunkX, cameraChunkZ);
        let chunksInRange = [];
        let chunkMinX = cameraChunkX - this.viewDist;
        let chunkMinZ = cameraChunkZ - this.viewDist;
        let chunkMaxX = cameraChunkX + this.viewDist;
        let chunkMaxZ = cameraChunkZ + this.viewDist;

        for (let x = chunkMinX; x <= chunkMaxX; x += 1) {
            for (let z = chunkMinZ; z <= chunkMaxZ; z += 1) {
                let lod = 0;
                if (((x * x) - (cameraChunkX * cameraChunkX)) + ((z * z) - (cameraChunkZ * cameraChunkZ)) >= (this.lodDist * this.lodDist)) {
                    lod = 1;
                }
                chunksInRange.push([x, z, lod]);
            }
        }
        
        return chunksInRange;
    }

    getPointsForChunk(chunk) {
        let points = [];
        for (let x = 0; x <= 1; x += 1) {
            for (let z = 0; z <= 1; z += 1) {
                points.push(new Vec4((chunk[0] + x) * this.chunksize, this.minheight, (chunk[1] + z) * this.chunksize, 1.0));
                points.push(new Vec4((chunk[0] + x) * this.chunksize, this.maxheight, (chunk[1] + z) * this.chunksize, 1.0));
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