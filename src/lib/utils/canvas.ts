export const computeXYAngle = (
    angleInDeg: number,
    width: number,
    height: number
) => {
    // Compute angle in radians - CSS starts from 180 degrees and goes clockwise
    // Math functions start from 0 and go anti-clockwise so we use 180 - angleInDeg to convert between the two
    const angle = ((180 - angleInDeg) * Math.PI) / 180;
    // const angle = ((180 - angleInDeg) / 180) * Math.PI;

    // // This computes the length such that the start/stop points will be at the corners
    const length =
        Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle));

    // Compute the actual x,y points based on the angle, length of the gradient line and the center of the div
    const halfx = (Math.sin(angle) * length) / 2.0;
    const halfy = (Math.cos(angle) * length) / 2.0;
    const cx = width / 2.0;
    const cy = height / 2.0;
    const x1 = Math.round(cx - halfx);
    const y1 = Math.round(cy - halfy);
    const x2 = Math.round(cx + halfx);
    const y2 = Math.round(cy + halfy);

    return { x1, x2, y1, y2 };
};
