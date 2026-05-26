export const FOUNDATION_SIZE_PX = 64;

export interface SandboxCamera {
  x: number;
  y: number;
  zoom: number;
}

export function screenToWorld(clientX: number, clientY: number, rect: DOMRect, camera: SandboxCamera) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const worldPxX = (localX - camera.x) / camera.zoom;
  const worldPxY = (localY - camera.y) / camera.zoom;
  return {
    worldPxX,
    worldPxY,
    gridX: Math.floor(worldPxX / FOUNDATION_SIZE_PX),
    gridY: Math.floor(worldPxY / FOUNDATION_SIZE_PX),
  };
}

export function gridToScreenPx(gridX: number, gridY: number, camera: SandboxCamera) {
  return {
    x: camera.x + gridX * FOUNDATION_SIZE_PX * camera.zoom,
    y: camera.y + gridY * FOUNDATION_SIZE_PX * camera.zoom,
  };
}
