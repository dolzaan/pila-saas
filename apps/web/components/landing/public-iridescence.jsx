import Iridescence from "./iridescence";

export function PublicIridescence() {
  return (
    <Iridescence
      className="public-iridescence-background"
      color={[0.5, 0.94, 0.76]}
      mouseReact={false}
      amplitude={0.08}
      speed={0.26}
      data-public-background
    />
  );
}
