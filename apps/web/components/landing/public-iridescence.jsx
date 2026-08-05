import Iridescence from "./iridescence";

export function PublicIridescence() {
  return (
    <Iridescence
      className="public-iridescence-background"
      color={[0.58, 1, 0.82]}
      mouseReact={false}
      amplitude={0.08}
      speed={0.32}
      data-public-background
    />
  );
}
