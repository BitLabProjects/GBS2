export interface Node {
  onCreated(): void;
  onUpdate(time: number, deltaTime: number): void;
}