export function disposeTree(root) {
  root.traverse(n => {
    if (!n.isMesh) return;
    n.geometry.dispose();
    n.material.dispose();
  });
}
