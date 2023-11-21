class Node {
    constructor(parent, offsetMatrix, children = []) {
        this.parent = parent;
        this.matrix = Mat4.translation(0, 0, 0);
        this.offsetMatrix = offsetMatrix;
        this.children = children;
    }

    addChild(node) {
        this.children.push(node);
    }

    removeChild(node) {
        let index = this.children.indexOf(node);
        if (index !== -1) {
            this.children.splice(index, 1);
            node.parent = null;
        }

    }

    setParent(node) {
        this.parent = node;
    }
}

class SceneGraph {
    constructor() {
        this.root = new Node(null, Mat4.translation(0, 0, 0));
    }

    getRoot() {
        return this.root;
    }

    update() {
        updateNode(this.root);
    }

    updateNode(node) {
        let mat = null;

        // ROOT
        if (node.parent === null) {
            mat = node.offsetMatrix;
        }

        else {
            mat = node.parent.matrix.mul(node.offsetMatrix);
        }

        this.children.forEach(function(child) {
            child.updateMatrix(child, mat);
        });
    }
}